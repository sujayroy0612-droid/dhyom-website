import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
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

function bodyToHtml(text: string, name: string): string {
  return text
    .replace(/\{\{name\}\}/g, name || "there")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const inner = p.replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 18px;font-size:15px;line-height:1.85;color:rgba(245,237,224,0.72);font-weight:300;">${inner}</p>`;
    })
    .join("");
}

const FALLBACK_BODY = `Hi {{name}},

Welcome to the Dhyom inner circle. I'm so glad you're here.

As promised, your Ritual Guide is attached to this email — a quiet introduction to building a sacred space at home.

— Sujay
Founder, Dhyom`;

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { to } = await req.json();
  if (!to?.trim()) {
    return NextResponse.json({ error: "Test email address is required." }, { status: 400 });
  }

  const log: string[] = [];

  // 1. Check Resend key
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: "RESEND_API_KEY is not set in Vercel environment variables.",
      log,
    });
  }
  log.push("✓ RESEND_API_KEY found");

  // 2. Fetch settings
  let settings: { subject: string; body_text: string | null; pdf_url: string | null };
  try {
    const { data, error } = await adminClient()
      .from("newsletter_settings")
      .select("subject, body_text, pdf_url")
      .eq("id", 1)
      .single();
    if (error) {
      log.push(`✗ newsletter_settings fetch error: ${error.message}`);
      settings = { subject: "Welcome to Dhyom", body_text: null, pdf_url: null };
    } else {
      settings = {
        subject:   data?.subject   ?? "Welcome to Dhyom",
        body_text: data?.body_text ?? null,
        pdf_url:   data?.pdf_url   ?? null,
      };
      log.push(`✓ Settings loaded — subject: "${settings.subject}"`);
      log.push(settings.body_text ? "✓ Body text found in settings" : "⚠ No body_text saved — using fallback copy");
      log.push(settings.pdf_url   ? `✓ PDF URL: ${settings.pdf_url}` : "⚠ No PDF URL in settings — sending without attachment");
    }
  } catch (ex) {
    const msg = ex instanceof Error ? ex.message : String(ex);
    log.push(`✗ newsletter_settings exception: ${msg} — table may not exist`);
    settings = { subject: "Welcome to Dhyom", body_text: null, pdf_url: null };
  }

  // 3. Fetch PDF
  const fromAddr = process.env.RESEND_FROM_EMAIL ?? "hello@dhyom.in";
  const unsubUrl = `mailto:${fromAddr}?subject=unsubscribe`;

  type Attachment = { filename: string; content: string };
  const attachments: Attachment[] = [];

  if (settings.pdf_url) {
    try {
      const res = await fetch(settings.pdf_url);
      if (!res.ok) {
        log.push(`✗ PDF fetch failed: HTTP ${res.status} — URL may be invalid or private`);
      } else {
        const buf = await res.arrayBuffer();
        const b64 = Buffer.from(buf).toString("base64");
        const filename = settings.pdf_url.split("/").pop()?.replace(/[?#].*$/, "") ?? "dhyom-guide.pdf";
        attachments.push({ filename, content: b64 });
        log.push(`✓ PDF fetched (${Math.round(buf.byteLength / 1024)} KB) — will attach as "${filename}"`);
      }
    } catch (ex) {
      log.push(`✗ PDF fetch exception: ${ex instanceof Error ? ex.message : String(ex)}`);
    }
  }

  // 4. Build email
  const rawBody = settings.body_text?.trim() || FALLBACK_BODY;
  const html = emailWrapper("Test email from Dhyom admin", bodyToHtml(rawBody, "there"), unsubUrl);
  const text = rawBody.replace(/\{\{name\}\}/g, "there");

  // 5. Send
  const { data: sendData, error: sendErr } = await new Resend(apiKey).emails.send({
    from:    `Dhyom <${fromAddr}>`,
    to:      to.trim(),
    replyTo: "dhyomecom@gmail.com",
    subject: `[TEST] ${settings.subject}`,
    html,
    text,
    ...(attachments.length > 0 && { attachments }),
  });

  if (sendErr) {
    log.push(`✗ Resend error: ${JSON.stringify(sendErr)}`);
    return NextResponse.json({ ok: false, error: sendErr.message ?? "Resend send failed", log });
  }

  log.push(`✓ Email sent — Resend ID: ${(sendData as { id?: string })?.id ?? "unknown"}`);
  return NextResponse.json({ ok: true, log });
}
