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

  // 1. Get current pdf_url
  const { data: campaign, error: campErr } = await sb
    .from("campaigns")
    .select("id, slug, pdf_url")
    .eq("slug", slug)
    .single();

  if (campErr || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!campaign.pdf_url) {
    return NextResponse.json({ error: "No pdf_url stored for this campaign" }, { status: 400 });
  }

  // 2. Fetch the PDF from the stored URL (Cloudinary or other)
  let pdfBuffer: Buffer;
  try {
    const res = await fetch(campaign.pdf_url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Dhyom/1.0)" },
    });
    if (!res.ok) {
      return NextResponse.json({
        error: `Fetch failed: HTTP ${res.status} from ${campaign.pdf_url}`,
        pdf_url: campaign.pdf_url,
      }, { status: 502 });
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("pdf") && !contentType.includes("octet-stream")) {
      return NextResponse.json({
        error: `Fetch returned wrong content-type: ${contentType}`,
        pdf_url: campaign.pdf_url,
      }, { status: 502 });
    }
    pdfBuffer = Buffer.from(await res.arrayBuffer());
  } catch (fetchErr) {
    return NextResponse.json({
      error: `Fetch exception: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`,
      pdf_url: campaign.pdf_url,
    }, { status: 502 });
  }

  // 3. Upload to Supabase Storage
  const storagePath = `campaigns/${slug}.pdf`;
  const { error: uploadErr } = await sb.storage
    .from("guides")
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

  if (uploadErr) {
    return NextResponse.json({
      error: `Supabase Storage upload failed: ${uploadErr.message}`,
      hint: "Make sure you created a PUBLIC bucket named 'guides' in Supabase Storage",
    }, { status: 500 });
  }

  // 4. Get the new public URL
  const { data: { publicUrl } } = sb.storage.from("guides").getPublicUrl(storagePath);

  // 5. Update campaign pdf_url
  const { error: updateErr } = await sb
    .from("campaigns")
    .update({ pdf_url: publicUrl, pdf_filename: `${slug}.pdf` })
    .eq("id", campaign.id);

  if (updateErr) {
    return NextResponse.json({ error: `DB update failed: ${updateErr.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    migrated_from: campaign.pdf_url,
    migrated_to: publicUrl,
    size_kb: Math.round(pdfBuffer.length / 1024),
  });
}
