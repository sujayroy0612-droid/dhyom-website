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

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const buffer   = Buffer.from(await file.arrayBuffer());
    const path     = `campaigns/${slug}.pdf`;
    const sb       = adminClient();

    const { error: uploadErr } = await sb.storage
      .from("guides")
      .upload(path, buffer, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      console.error("[upload-campaign-pdf] Storage error:", uploadErr.message);
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: { publicUrl } } = sb.storage.from("guides").getPublicUrl(path);

    console.log(`[upload-campaign-pdf] uploaded ${slug} → ${publicUrl}`);
    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[upload-campaign-pdf] exception:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
