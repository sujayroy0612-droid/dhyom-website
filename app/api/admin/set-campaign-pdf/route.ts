import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const { id, pdf_url, pdf_filename } = await req.json() as {
    id: string;
    pdf_url: string;
    pdf_filename: string;
  };

  if (!id || !pdf_url) {
    return NextResponse.json({ error: "id and pdf_url required" }, { status: 400 });
  }

  const { error } = await adminClient()
    .from("campaigns")
    .update({ pdf_url, pdf_filename: pdf_filename ?? null })
    .eq("id", id);

  if (error) {
    console.error("[set-campaign-pdf] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[set-campaign-pdf] updated ${id} → ${pdf_url}`);
  return NextResponse.json({ ok: true });
}
