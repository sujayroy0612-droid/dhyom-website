import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  const { data, error } = await adminClient()
    .from("newsletter_settings")
    .select("subject, pdf_url, pdf_filename, body_text")
    .eq("id", 1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    subject:      data?.subject      ?? "Welcome to Dhyom",
    pdf_url:      data?.pdf_url      ?? null,
    pdf_filename: data?.pdf_filename ?? null,
    body_text:    data?.body_text    ?? null,
  });
}

export async function POST(req: NextRequest) {
  const { subject, pdf_url, pdf_base64, pdf_filename, body_text } = await req.json();

  if (!subject?.trim()) {
    return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    id:         1,
    subject:    subject.trim(),
    pdf_url:    pdf_url?.trim()      || null,
    body_text:  body_text?.trim()    || null,
    updated_at: new Date().toISOString(),
  };

  // Only update pdf_base64/pdf_filename when a new PDF is provided
  if (pdf_base64) {
    payload.pdf_base64  = pdf_base64;
    payload.pdf_filename = pdf_filename ?? "dhyom-guide.pdf";
  }
  if (pdf_url === null) {
    // PDF was removed
    payload.pdf_base64  = null;
    payload.pdf_filename = null;
  }

  const { error } = await adminClient()
    .from("newsletter_settings")
    .upsert(payload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
