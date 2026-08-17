import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function buildWelcomeHtml(): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#1A0A14;font-family:Georgia,serif;">
  <div style="max-width:480px;margin:40px auto;background:#3D1428;border-radius:4px;overflow:hidden;">

    <div style="padding:36px 36px 0;">
      <p style="margin:0 0 6px;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#C4A373;">
        Dhyom
      </p>
      <div style="width:28px;height:1px;background:rgba(196,163,115,0.35);margin-bottom:28px;"></div>
    </div>

    <div style="padding:0 36px 36px;">
      <p style="margin:0 0 18px;font-style:italic;font-size:17px;line-height:1.85;color:rgba(245,237,224,0.78);font-weight:300;">
        Welcome to the inner circle.
      </p>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.85;color:rgba(245,237,224,0.65);font-weight:300;">
        You've joined a community that believes a home holds space for both the everyday and the sacred.
        Over the coming days, we'll share rituals, stories, and drops — curated with care.
      </p>
      <p style="margin:0 0 32px;font-size:14px;line-height:1.85;color:rgba(245,237,224,0.65);font-weight:300;">
        In the meantime, explore our collection and find the piece that speaks to your space.
      </p>

      <a href="https://dhyom.in/shop"
        style="display:inline-block;background:#C4A373;color:#1A0A14;font-size:10px;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:3px;font-weight:600;">
        Explore the Collection
      </a>

      <p style="margin:32px 0 0;font-size:13px;letter-spacing:2px;color:#C4A373;">— Dhyom</p>

      <div style="border-top:1px solid rgba(196,163,115,0.18);padding-top:24px;margin-top:28px;">
        <a href="https://dhyom.in"
          style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(196,163,115,0.50);text-decoration:none;">
          dhyom.in
        </a>
      </div>
    </div>

  </div>
</body>
</html>`;
}

function buildWelcomeText(): string {
  return `Welcome to the Dhyom inner circle.

You've joined a community that believes a home holds space for both the everyday and the sacred. Over the coming days, we'll share rituals, stories, and drops — curated with care.

In the meantime, explore our collection: https://dhyom.in/shop

— Dhyom

To unsubscribe, reply with 'unsubscribe' in the subject.`;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const trimmed = (email ?? "").trim();

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // Save to contacts
    try {
      const { error: dbErr } = await adminClient()
        .from("contacts")
        .insert({ email: trimmed, tag: "newsletter" });
      if (dbErr) console.error("[newsletter] contacts INSERT error:", dbErr);
    } catch (ex) {
      console.error("[newsletter] contacts exception:", ex);
    }

    // Send welcome email
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[newsletter] RESEND_API_KEY not set — skipping email");
      return NextResponse.json({ ok: true });
    }

    const fromAddr = process.env.RESEND_FROM_EMAIL ?? "hello@dhyom.in";
    const { error: resendErr } = await new Resend(apiKey).emails.send({
      from:    `Dhyom <${fromAddr}>`,
      to:      trimmed,
      replyTo: "dhyomecom@gmail.com",
      subject: "Welcome to Dhyom",
      html:    buildWelcomeHtml(),
      text:    buildWelcomeText(),
      headers: {
        "List-Unsubscribe": `<mailto:${fromAddr}?subject=unsubscribe>`,
      },
    });

    if (resendErr) {
      console.error("[newsletter] Resend error:", JSON.stringify(resendErr));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[newsletter]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
