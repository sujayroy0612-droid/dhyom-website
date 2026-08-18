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

  const sb = adminClient();
  const path = `campaigns/${slug}.pdf`;

  // Check the file exists in Supabase Storage
  const { data: fileData, error: fileErr } = await sb.storage
    .from("guides")
    .list("campaigns", { search: `${slug}.pdf` });

  if (fileErr) return NextResponse.json({ error: fileErr.message }, { status: 500 });

  const found = fileData?.find((f) => f.name === `${slug}.pdf`);
  if (!found) {
    return NextResponse.json({
      error: `File not found: upload '${slug}.pdf' to Supabase Storage → guides bucket → campaigns folder first`,
    }, { status: 404 });
  }

  // Get public URL
  const { data: { publicUrl } } = sb.storage.from("guides").getPublicUrl(path);

  // Update campaign
  const { error: updateErr } = await sb
    .from("campaigns")
    .update({ pdf_url: publicUrl, pdf_filename: `${slug}.pdf` })
    .eq("slug", slug);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, pdf_url: publicUrl });
}
