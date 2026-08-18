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
  const file = req.nextUrl.searchParams.get("file"); // optional: actual filename in storage
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const sb = adminClient();

  // List all files in campaigns folder and find a match
  const { data: fileData, error: fileErr } = await sb.storage
    .from("guides")
    .list("campaigns");

  if (fileErr) return NextResponse.json({ error: fileErr.message }, { status: 500 });

  // Match by explicit file param, or slug-based name (case-insensitive, hyphens=underscores)
  const normalize = (s: string) => s.toLowerCase().replace(/[_-]/g, "").replace(/\.pdf$/, "");
  const found = file
    ? fileData?.find((f) => f.name === file)
    : fileData?.find((f) => normalize(f.name) === normalize(`${slug}.pdf`));

  if (!found) {
    const names = fileData?.map((f) => f.name).join(", ") ?? "none";
    return NextResponse.json({
      error: `No matching file for slug '${slug}'. Files in campaigns/: ${names}`,
    }, { status: 404 });
  }

  const path = `campaigns/${found.name}`;
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
