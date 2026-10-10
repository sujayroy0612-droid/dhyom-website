export const dynamic = "force-dynamic";

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

async function ensureBucket(sb: ReturnType<typeof adminClient>): Promise<string | null> {
  // Check if bucket exists first
  const { data: buckets, error: listErr } = await sb.storage.listBuckets();
  if (listErr) {
    console.error("[storage] listBuckets error:", listErr.message);
    return `Cannot list buckets: ${listErr.message}`;
  }
  const exists = (buckets ?? []).some(b => b.name === BUCKET);
  if (!exists) {
    const { error: createErr } = await sb.storage.createBucket(BUCKET, { public: true });
    if (createErr) {
      console.error("[storage] createBucket error:", createErr.message);
      return `Cannot create bucket: ${createErr.message}`;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized — please log in again." }, { status: 401 });
  }

  const formData  = await req.formData();
  const file      = formData.get("file") as File | null;
  const productId = formData.get("productId") as string | null;

  if (!file || !productId) {
    return NextResponse.json({ error: "Missing file or productId" }, { status: 400 });
  }

  const sb = adminClient();

  const bucketErr = await ensureBucket(sb);
  if (bucketErr) return NextResponse.json({ error: bucketErr }, { status: 500 });

  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${productId}/${Date.now()}.${ext}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await sb.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || "image/jpeg",
    upsert: true,
  });

  if (upErr) {
    console.error("[storage] upload error:", upErr.message);
    return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
