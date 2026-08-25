import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";

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

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData    = await req.formData();
  const file        = formData.get("file") as File | null;
  const productId   = formData.get("productId") as string | null;
  const displayOrder = Number(formData.get("displayOrder") ?? "0");
  const isPrimary    = formData.get("isPrimary") === "true";

  if (!file || !productId) {
    return NextResponse.json({ error: "Missing file or productId" }, { status: 400 });
  }

  const sb = adminClient();

  // Create storage bucket if it doesn't exist yet (public read)
  await sb.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${productId}/${Date.now()}.${ext}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await sb.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(path);

  // Insert into product_images table using service-role key (bypasses schema cache / RLS issues)
  const { data: imgRow, error: dbErr } = await sb
    .from("product_images")
    .insert({ product_id: productId, url: publicUrl, display_order: displayOrder, is_primary: isPrimary, alt_text: null })
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // If this is the primary image, update products.image_url too
  if (isPrimary) {
    await sb.from("products").update({ image_url: publicUrl }).eq("id", productId);
  }

  return NextResponse.json({ image: imgRow, url: publicUrl });
}
