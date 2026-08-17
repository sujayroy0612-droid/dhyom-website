import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  const { data, error } = await admin()
    .from("newsletter_settings")
    .select("subject, pdf_url")
    .eq("id", 1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    subject: data?.subject ?? "Welcome to Dhyom",
    pdf_url: data?.pdf_url ?? null,
  });
}

export async function POST(req: NextRequest) {
  const { subject, pdf_url } = await req.json();

  if (!subject?.trim()) {
    return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  }

  const { error } = await admin()
    .from("newsletter_settings")
    .upsert({
      id:         1,
      subject:    subject.trim(),
      pdf_url:    pdf_url?.trim() || null,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
