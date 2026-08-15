import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function expectedToken(email: string): string {
  return createHmac("sha256", process.env.CRON_SECRET!).update(email).digest("hex");
}

function page(heading: string, body: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${heading} — Dhyom</title>
</head>
<body style="margin:0;padding:0;background:#1A0A14;font-family:Georgia,serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <div style="text-align:center;padding:48px 24px;max-width:440px;margin:0 auto;">
    <p style="margin:0 0 8px;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#C4A373;">Dhyom</p>
    <div style="width:28px;height:1px;background:rgba(196,163,115,0.35);margin:0 auto 32px;"></div>
    <p style="margin:0 0 16px;font-size:18px;line-height:1.7;color:rgba(245,237,224,0.85);font-weight:300;font-style:italic;">${heading}</p>
    <p style="margin:0 0 36px;font-size:14px;line-height:1.7;color:rgba(245,237,224,0.45);font-weight:300;">${body}</p>
    <a href="https://dhyom.in" style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(196,163,115,0.55);text-decoration:none;">Visit dhyom.in</a>
  </div>
</body>
</html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const e = searchParams.get("e");
  const t = searchParams.get("t");

  if (!e || !t) {
    return page("Invalid link.", "This unsubscribe link appears to be broken.");
  }

  let email: string;
  try {
    email = Buffer.from(e, "base64url").toString("utf8");
  } catch {
    return page("Invalid link.", "This unsubscribe link appears to be broken.");
  }

  if (t !== expectedToken(email)) {
    return page("Invalid link.", "This unsubscribe link appears to be broken.");
  }

  const { error } = await adminClient()
    .from("contacts")
    .update({ unsubscribed: true })
    .eq("email", email);

  if (error) {
    console.error("[unsubscribe] DB error:", error);
  }

  return page(
    "You've been unsubscribed.",
    "You won't receive any more emails from Dhyom."
  );
}
