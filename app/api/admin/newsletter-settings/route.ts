import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await adminClient()
    .from("newsletter_settings")
    .select("subject, pdf_url, body_text")
    .eq("id", 1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    subject:   data?.subject   ?? "Welcome to Dhyom",
    pdf_url:   data?.pdf_url   ?? null,
    body_text: data?.body_text ?? null,
  });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subject, pdf_url, body_text } = await req.json();

  if (!subject?.trim()) {
    return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  }

  const { error } = await adminClient()
    .from("newsletter_settings")
    .upsert({
      id:         1,
      subject:    subject.trim(),
      pdf_url:    pdf_url?.trim()   || null,
      body_text:  body_text?.trim() || null,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
