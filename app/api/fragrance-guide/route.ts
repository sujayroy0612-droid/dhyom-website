import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { readFile } from "fs/promises";
import { join } from "path";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function buildGuideHtml(): string {
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
        The scent you are drawn to says something about who you are.
      </p>
      <p style="margin:0 0 18px;font-style:italic;font-size:17px;line-height:1.85;color:rgba(245,237,224,0.78);font-weight:300;">
        Your guide is attached. Take a quiet moment with it.
      </p>
      <p style="margin:0 0 32px;font-size:13px;letter-spacing:2px;color:#C4A373;">
        — Dhyom
      </p>
      <div style="border-top:1px solid rgba(196,163,115,0.18);padding-top:24px;">
        <a href="https://dhyom.in"
          style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(196,163,115,0.50);text-decoration:none;">
          Visit dhyom.in
        </a>
      </div>
    </div>

  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // 1. Validate
    const trimmed = (email ?? "").trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // 2. Save to contacts — always INSERT (no unique constraint; existing buyer rows untouched)
    try {
      const { error: dbErr } = await adminClient()
        .from("contacts")
        .insert({ email: trimmed, tag: "reel_lead" });
      if (dbErr) console.error("[fragrance-guide] contacts INSERT error:", dbErr);
    } catch (ex) {
      console.error("[fragrance-guide] contacts exception:", ex);
    }

    // 3. Read PDF from /public — graceful if not yet placed
    let pdfBuffer: Buffer | undefined;
    try {
      pdfBuffer = await readFile(
        join(process.cwd(), "public", "Dhyom_Fragrance_Personalities.pdf")
      );
    } catch {
      console.warn("[fragrance-guide] PDF not found at public/Dhyom_Fragrance_Personalities.pdf — sending without attachment");
    }

    // 4. Send via Resend
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[fragrance-guide] RESEND_API_KEY not set — skipping email");
      return NextResponse.json({ ok: true });
    }

    const { error: resendErr } = await new Resend(apiKey).emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
      to: trimmed,
      subject: "Your Dhyom Fragrance Personalities",
      html: buildGuideHtml(),
      ...(pdfBuffer && {
        attachments: [{ filename: "Dhyom_Fragrance_Personalities.pdf", content: pdfBuffer }],
      }),
    });

    if (resendErr) {
      // Contact already saved — log but don't alarm the user
      console.error("[fragrance-guide] Resend error:", resendErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[fragrance-guide]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
