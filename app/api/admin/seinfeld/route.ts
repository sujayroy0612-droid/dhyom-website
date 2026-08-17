import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createHmac } from "crypto";
import { emailWrapper } from "@/lib/email/soap-opera";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  if (!token) return false;
  const { data } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ).auth.getUser(token);
  return !!data.user;
}

function unsubscribeUrl(email: string): string {
  const e = Buffer.from(email).toString("base64url");
  const t = createHmac("sha256", process.env.CRON_SECRET!).update(email).digest("hex");
  return `https://dhyom.in/api/unsubscribe?e=${e}&t=${t}`;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

type Recipient = { email: string; name: string | null };

async function resolveRecipients(audience: string): Promise<Recipient[]> {
  const sb = adminClient();
  let query = sb.from("contacts").select("email, name").eq("unsubscribed", false);
  if (audience === "buyers")     query = query.eq("tag", "buyer");
  if (audience === "non_buyers") query = query.neq("tag", "buyer");
  // all_warm: no extra filter

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // De-dupe by email — contacts table allows duplicate rows
  const seen = new Map<string, string | null>();
  for (const row of (data ?? []) as Recipient[]) {
    if (!seen.has(row.email)) seen.set(row.email, row.name ?? null);
  }
  return Array.from(seen.entries()).map(([email, name]) => ({ email, name }));
}

function renderHtml(bodyHtml: string, previewText: string, name: string | null, unsubUrl: string): string {
  const display = name || "there";
  return emailWrapper(previewText, bodyHtml.replace(/\{\{name\}\}/g, display), unsubUrl);
}

function renderText(bodyHtml: string, name: string | null, unsubUrl: string): string {
  const display = name || "there";
  const inner = bodyHtml
    .replace(/\{\{name\}\}/g, display)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .trim();
  return `${inner}\n\nUnsubscribe: ${unsubUrl}`;
}

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // ?count=1&audience=X → return unique recipient count
  if (searchParams.get("count") === "1") {
    const audience = searchParams.get("audience") ?? "all_warm";
    try {
      const recipients = await resolveRecipients(audience);
      return NextResponse.json({ count: recipients.length });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  // Default → return past broadcasts list
  const { data, error } = await adminClient()
    .from("broadcasts")
    .select("id, subject, audience, recipient_count, status, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ broadcasts: data ?? [] });
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body   = await req.json();
  const { action, subject, preview_text, body_html, audience, test_email } = body as {
    action: string;
    subject: string;
    preview_text: string;
    body_html: string;
    audience: string;
    test_email: string;
  };

  if (!action || !subject?.trim() || !body_html?.trim()) {
    return NextResponse.json({ error: "action, subject, and body_html are required" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });

  const fromAddr = process.env.RESEND_FROM_EMAIL ?? "noreply@dhyom.in";
  const resend   = new Resend(apiKey);

  // ── Test send ──
  if (action === "test") {
    if (!test_email?.trim()) {
      return NextResponse.json({ error: "test_email required" }, { status: 400 });
    }
    const testUnsub = `https://dhyom.in/api/unsubscribe?test=1`;
    const { error } = await resend.emails.send({
      from:    `Dhyom <${fromAddr}>`,
      to:      test_email.trim(),
      subject: `[TEST] ${subject}`,
      html:    renderHtml(body_html, preview_text ?? "", null, testUnsub),
      text:    renderText(body_html, null, testUnsub),
    });
    if (error) return NextResponse.json({ error: JSON.stringify(error) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── Broadcast send ──
  if (action === "broadcast") {
    if (!audience) return NextResponse.json({ error: "audience required" }, { status: 400 });

    let recipients: Recipient[];
    try {
      recipients = await resolveRecipients(audience);
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }

    if (recipients.length === 0) {
      return NextResponse.json({ sent: 0, errors: [], recipient_count: 0 });
    }

    const sb = adminClient();

    // Insert broadcast as draft first — need the ID for broadcast_recipients FK
    const { data: broadcastRow, error: insertErr } = await sb
      .from("broadcasts")
      .insert({
        subject,
        preview_text: preview_text ?? "",
        body_html,
        audience,
        recipient_count: 0,
        status: "draft",
      })
      .select("id")
      .single();

    if (insertErr || !broadcastRow) {
      console.error("[seinfeld] broadcasts INSERT error:", insertErr);
      return NextResponse.json({ error: "Failed to create broadcast record" }, { status: 500 });
    }

    const broadcastId = broadcastRow.id as string;

    const BATCH_SIZE  = 50;
    const sentEmails: string[] = [];
    const errors: string[]     = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch  = recipients.slice(i, i + BATCH_SIZE);
      const emails = batch.map(r => {
        const unsub = unsubscribeUrl(r.email);
        return {
          from:    `Dhyom <${fromAddr}>`,
          to:      r.email,
          subject,
          html:    renderHtml(body_html, preview_text ?? "", r.name, unsub),
          text:    renderText(body_html, r.name, unsub),
          headers: {
            "List-Unsubscribe":      `<${unsub}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        };
      });

      try {
        const { error: batchErr } = await resend.batch.send(emails);
        if (batchErr) {
          console.error(`[seinfeld] batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, batchErr);
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${JSON.stringify(batchErr)}`);
        } else {
          sentEmails.push(...batch.map(r => r.email));
        }
      } catch (err) {
        console.error(`[seinfeld] batch ${Math.floor(i / BATCH_SIZE) + 1} exception:`, err);
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${String(err)}`);
      }

      if (i + BATCH_SIZE < recipients.length) await sleep(500);
    }

    const now = new Date().toISOString();

    // Write per-contact send log — one row per unique email actually sent
    if (sentEmails.length > 0) {
      const { error: recipErr } = await sb.from("broadcast_recipients").insert(
        sentEmails.map(email => ({
          broadcast_id:  broadcastId,
          contact_email: email,
          sent_at:       now,
        }))
      );
      if (recipErr) console.error("[seinfeld] broadcast_recipients INSERT error:", recipErr);
    }

    // Finalize broadcast record
    const { error: updateErr } = await sb.from("broadcasts").update({
      status:          "sent",
      recipient_count: sentEmails.length,
      sent_at:         now,
    }).eq("id", broadcastId);
    if (updateErr) console.error("[seinfeld] broadcasts UPDATE error:", updateErr);

    return NextResponse.json({ sent: sentEmails.length, errors, recipient_count: recipients.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
