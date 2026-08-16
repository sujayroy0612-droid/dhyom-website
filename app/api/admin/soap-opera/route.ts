import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderEmail } from "@/lib/email/soap-opera";

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

// GET — return all 6 rows ordered by day + variant
export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await adminClient()
    .from("soap_opera_emails")
    .select("*")
    .order("day_number")
    .order("variant");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ emails: data });
}

// PATCH — update row by id
export async function PATCH(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, subject, preview_text, body_html, body_text } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await adminClient()
    .from("soap_opera_emails")
    .update({ subject, preview_text, body_html, body_text, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// POST — send test email
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, test_email } = await req.json();
  if (!id || !test_email) {
    return NextResponse.json({ error: "Missing id or test_email" }, { status: 400 });
  }

  const { data: row, error: fetchErr } = await adminClient()
    .from("soap_opera_emails")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Email row not found" }, { status: 404 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });

  const fromAddr = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const testUnsubUrl = `https://dhyom.in/api/unsubscribe?test=1`;
  const { subject, html, text } = renderEmail(row, "there", testUnsubUrl);

  const { error: sendErr } = await new Resend(apiKey).emails.send({
    from: `Dhyom <${fromAddr}>`,
    to: test_email,
    subject: `[TEST] ${subject}`,
    html,
    text,
  });

  if (sendErr) {
    return NextResponse.json({ error: JSON.stringify(sendErr) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
