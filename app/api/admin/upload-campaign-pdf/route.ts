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
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const slug = (form.get("slug") as string | null) ?? "guide";
    const id   = (form.get("id")   as string | null) ?? null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ error: "Campaign id required. Save the campaign first." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const path   = `campaigns/${slug}.pdf`;
    const sb     = adminClient();

    // 1. Upload to Supabase Storage
    const { error: uploadErr } = await sb.storage
      .from("guides")
      .upload(path, buffer, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      console.error("[upload-campaign-pdf] Storage error:", uploadErr.message);
      return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    const { data: { publicUrl } } = sb.storage.from("guides").getPublicUrl(path);

    // 2. Write URL to DB immediately (single atomic call — no separate set-campaign-pdf needed)
    const { error: dbErr } = await sb
      .from("campaigns")
      .update({ pdf_url: publicUrl, pdf_filename: file.name })
      .eq("id", id);

    if (dbErr) {
      console.error("[upload-campaign-pdf] DB update error:", dbErr.message);
      return NextResponse.json({ error: `DB write failed: ${dbErr.message}` }, { status: 500 });
    }

    // 3. Read back from DB to confirm what was actually stored
    const { data: row, error: readErr } = await sb
      .from("campaigns")
      .select("id, slug, pdf_url, pdf_filename")
      .eq("id", id)
      .single();

    if (readErr || !row) {
      console.error("[upload-campaign-pdf] Read-back failed:", readErr?.message);
      return NextResponse.json({ error: "Upload succeeded but could not verify DB write." }, { status: 500 });
    }

    if (row.pdf_url !== publicUrl) {
      console.error("[upload-campaign-pdf] DB verify mismatch:", row.pdf_url, "vs", publicUrl);
      return NextResponse.json({
        error: `DB did not update. Stored: ${row.pdf_url}. Expected: ${publicUrl}`,
      }, { status: 500 });
    }

    console.log(`[upload-campaign-pdf] OK — ${row.slug} → ${publicUrl}`);
    return NextResponse.json({ ok: true, url: publicUrl, pdf_filename: file.name });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[upload-campaign-pdf] exception:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
