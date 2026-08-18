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

const FALLBACK_BODY = `Hi there,

Welcome to the Dhyom inner circle. I'm so glad you're here.

As promised, your Ritual Guide is attached to this email — a quiet introduction to building a sacred space at home.

— Sujay
Founder, Dhyom`;

export async function POST(req: NextRequest) {
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
  let settings: { subject: string; body_text: string | null; pdf_base64: string | null; pdf_filename: string | null };
  try {
    const { data, error } = await adminClient()
      .from("newsletter_settings")
      .select("subject, body_text, pdf_base64, pdf_filename")
      .eq("id", 1)
      .single();
    if (error) {
      log.push(`✗ newsletter_settings fetch error: ${error.message}`);
      settings = { subject: "Welcome to Dhyom", body_text: null, pdf_base64: null, pdf_filename: null };
    } else {
      settings = {
        subject:      data?.subject      ?? "Welcome to Dhyom",
        body_text:    data?.body_text    ?? null,
        pdf_base64:   data?.pdf_base64   ?? null,
        pdf_filename: data?.pdf_filename ?? null,
      };
      log.push(`✓ Settings loaded — subject: "${settings.subject}"`);
      log.push(settings.body_text  ? "✓ Body text found" : "⚠ No body_text — using fallback copy");
      log.push(settings.pdf_base64 ? `✓ PDF ready in DB (${Math.round(settings.pdf_base64.length * 0.75 / 1024)} KB) — "${settings.pdf_filename}"` : "⚠ No PDF saved — upload one and Save Settings first");
    }
  } catch (ex) {
    const msg = ex instanceof Error ? ex.message : String(ex);
    log.push(`✗ newsletter_settings exception: ${msg} — table may not exist, run the SQL`);
    settings = { subject: "Welcome to Dhyom", body_text: null, pdf_base64: null, pdf_filename: null };
  }

  // 3. Build attachment from stored base64
  const fromAddr = process.env.RESEND_FROM_EMAIL ?? "hello@dhyom.in";
  const unsubUrl = `mailto:${fromAddr}?subject=unsubscribe`;

  type Attachment = { filename: string; content: string };
  const attachments: Attachment[] = [];

  if (settings.pdf_base64) {
    attachments.push({
      filename: settings.pdf_filename ?? "dhyom-guide.pdf",
      content:  settings.pdf_base64,
    });
  }

  // 4. Build + send
  const rawBody = settings.body_text?.trim() || FALLBACK_BODY;
  const html = emailWrapper("Test email from Dhyom admin", bodyToHtml(rawBody, "there"), unsubUrl);
  const text = rawBody.replace(/\{\{name\}\}/g, "there");

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
    return NextResponse.json({ ok: false, error: sendErr.message ?? "Send failed", log });
  }

  log.push(`✓ Email sent — Resend ID: ${(sendData as { id?: string })?.id ?? "unknown"}`);
  return NextResponse.json({ ok: true, log });
}
