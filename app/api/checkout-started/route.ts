import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const FOUNDER_EMAIL = "dhyomecom@gmail.com";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function notifyFounder(email: string, phone: string | null) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL ?? "hello@dhyom.in";
  await resend.emails.send({
    from:    `Dhyom <${from}>`,
    to:      FOUNDER_EMAIL,
    replyTo: "dhyomecom@gmail.com",
    subject: `Checkout Started — ${email}`,
    text: [
      "Someone started checkout but has not yet paid.",
      "",
      `Email : ${email}`,
      `Phone : ${phone ?? "—"}`,
      "",
      "This is an automated alert from Dhyom.",
    ].join("\n"),
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#111;background:#f5f5f5;margin:0;padding:0;">
<div style="max-width:480px;margin:32px auto;background:#fff;border:1px solid #ddd;border-radius:4px;overflow:hidden;">
  <div style="background:#1a0a12;padding:16px 24px;">
    <p style="margin:0;color:#c4a373;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Dhyom — Checkout Alert</p>
    <h1 style="margin:4px 0 0;color:#fff;font-size:18px;">Checkout Started</h1>
  </div>
  <div style="padding:20px 24px;">
    <p style="margin:0 0 4px;font-size:12px;color:#888;">Someone entered their email but has not yet completed payment.</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <tr><td style="padding:6px 0;font-size:12px;color:#888;width:80px;">Email</td><td style="padding:6px 0;font-size:14px;font-weight:bold;">${email}</td></tr>
      <tr><td style="padding:6px 0;font-size:12px;color:#888;">Phone</td><td style="padding:6px 0;font-size:14px;">${phone ?? "—"}</td></tr>
    </table>
    <p style="margin:20px 0 0;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:12px;">Dhyom internal alert · checkout-started</p>
  </div>
</div>
</body></html>`,
  }).catch((err) => console.error("[checkout-started] notify error:", err));
}

export async function POST(req: NextRequest) {
  try {
    const { email, phone } = await req.json() as { email?: string; phone?: string };

    const cleanEmail = email?.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }
    const cleanPhone = phone?.trim() || null;

    const sb = adminClient();

    // Check if a checkout_started row already exists for this email
    const { data: existing } = await sb
      .from("contacts")
      .select("id")
      .eq("email", cleanEmail)
      .eq("tag", "checkout_started")
      .maybeSingle();

    if (existing) {
      await sb.from("contacts").update({ phone: cleanPhone }).eq("id", existing.id);
    } else {
      const { error } = await sb.from("contacts").insert({
        email: cleanEmail,
        phone: cleanPhone,
        tag: "checkout_started",
      });
      if (error) {
        console.error("[checkout-started] insert error:", error);
        return NextResponse.json({ error: "Could not save contact." }, { status: 500 });
      }
      // Notify founder only on first capture, not on repeat visits
      void notifyFounder(cleanEmail, cleanPhone);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[checkout-started]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
