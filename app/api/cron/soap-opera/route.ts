import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createHmac } from "crypto";
import { renderEmail, SoapOperaEmailRow } from "@/lib/email/soap-opera";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function unsubscribeUrl(email: string): string {
  const e = Buffer.from(email).toString("base64url");
  const t = createHmac("sha256", process.env.CRON_SECRET!).update(email).digest("hex");
  return `https://dhyom.in/api/unsubscribe?e=${e}&t=${t}`;
}

type Contact = {
  id: string;
  email: string;
  name: string | null;
  tag: string;
  sequence_day_sent: number;
};

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = adminClient();

  // Load email templates from DB
  const { data: templates, error: tplErr } = await sb
    .from("soap_opera_emails")
    .select("*");

  if (tplErr || !templates) {
    console.error("[soap-opera] template fetch error:", tplErr);
    return NextResponse.json({ error: "Template fetch failed" }, { status: 500 });
  }

  // Lookup map: "day-variant" → row
  const lookup = new Map<string, SoapOperaEmailRow>(
    (templates as SoapOperaEmailRow[]).map(r => [`${r.day_number}-${r.variant}`, r])
  );

  const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

  const { data: contacts, error: fetchErr } = await sb
    .from("contacts")
    .select("id, email, name, tag, sequence_day_sent")
    .in("tag", ["reel_lead", "newsletter", "checkout_lead", "checkout_started", "buyer"])
    .eq("unsubscribed", false)
    .lt("sequence_day_sent", 5)
    .or(`last_email_sent_at.is.null,last_email_sent_at.lte.${twentyHoursAgo}`)
    .order("sequence_day_sent", { ascending: false }); // process most-advanced row first

  if (fetchErr) {
    console.error("[soap-opera] fetch error:", fetchErr);
    return NextResponse.json({ error: "DB fetch failed" }, { status: 500 });
  }

  if (!contacts || contacts.length === 0) {
    console.log("[soap-opera] no contacts due");
    return NextResponse.json({ sent: 0, errors: [] });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[soap-opera] RESEND_API_KEY not set");
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const fromAddr = `Dhyom <${process.env.RESEND_FROM_EMAIL ?? "hello@dhyom.in"}>`;
  let sent = 0;
  const errors: string[] = [];
  const emailsSentThisRun = new Set<string>(); // deduplicate — one email per address per run

  for (const contact of contacts as Contact[]) {
    if (emailsSentThisRun.has(contact.email.toLowerCase())) continue; // skip duplicate rows
    const nextDay = contact.sequence_day_sent + 1;
    const unsub = unsubscribeUrl(contact.email);

    try {
      // Day 5: buyer gets buyer variant, everyone else gets lead variant
      const variant = nextDay === 5
        ? (contact.tag === "buyer" ? "buyer" : "lead")
        : "default";

      const template = lookup.get(`${nextDay}-${variant}`);
      if (!template) {
        console.error(`[soap-opera] missing template day=${nextDay} variant=${variant}`);
        errors.push(`${contact.email}: missing template day ${nextDay}`);
        continue;
      }

      const { subject, html, text } = renderEmail(template, contact.name ?? "", unsub);

      const { error: sendErr } = await resend.emails.send({
        from:      fromAddr,
        to:        contact.email,
        replyTo:   "dhyomecom@gmail.com",
        subject,
        html,
        text,
        headers: {
          "List-Unsubscribe": `<${unsub}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      if (sendErr) {
        console.error(`[soap-opera] Resend error for ${contact.email}:`, JSON.stringify(sendErr));
        errors.push(`${contact.email}: ${JSON.stringify(sendErr)}`);
        continue;
      }

      const { error: updateErr } = await sb
        .from("contacts")
        .update({
          sequence_day_sent: nextDay,
          last_email_sent_at: new Date().toISOString(),
        })
        .eq("id", contact.id);

      if (updateErr) {
        console.error(`[soap-opera] DB update error for ${contact.email}:`, updateErr);
        errors.push(`${contact.email}: DB update failed after send`);
        continue;
      }

      emailsSentThisRun.add(contact.email.toLowerCase());
      console.log(`[soap-opera] day ${nextDay} → ${contact.email}`);
      sent++;
    } catch (err) {
      console.error(`[soap-opera] exception for ${contact.email}:`, err);
      errors.push(`${contact.email}: ${String(err)}`);
    }
  }

  return NextResponse.json({ sent, errors });
}
