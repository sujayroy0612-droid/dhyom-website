import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const { data, error } = await adminClient()
    .from("campaigns")
    .select("slug, pdf_url, pdf_filename, pdf_base64")
    .eq("slug", slug)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    slug:         data.slug,
    pdf_url:      data.pdf_url,
    pdf_filename: data.pdf_filename,
    has_base64:   !!data.pdf_base64,
    base64_kb:    data.pdf_base64 ? Math.round(data.pdf_base64.length * 0.75 / 1024) : null,
  });
}
