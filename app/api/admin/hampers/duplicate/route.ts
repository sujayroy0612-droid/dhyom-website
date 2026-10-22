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

export async function POST(req: NextRequest) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sourceProductId, targetSubcategory, newName, newSlug } = await req.json();
  if (!sourceProductId || !targetSubcategory || !newName || !newSlug) {
    return NextResponse.json({ error: "sourceProductId, targetSubcategory, newName, newSlug required" }, { status: 400 });
  }

  const sb = adminClient();

  const { data: src, error: srcErr } = await sb
    .from("products")
    .select("*")
    .eq("id", sourceProductId)
    .single();
  if (srcErr || !src) return NextResponse.json({ error: "Source product not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _ca, slug: _slug, name: _name, subcategory: _sub, ...rest } = src;
  const { data: newProd, error: insertErr } = await sb
    .from("products")
    .insert({ ...rest, name: newName, slug: newSlug, subcategory: targetSubcategory, is_visible: false })
    .select()
    .single();
  if (insertErr || !newProd) return NextResponse.json({ error: insertErr?.message ?? "Insert failed" }, { status: 500 });

  const { data: slots } = await sb
    .from("hamper_slots")
    .select("label,allowed_categories,quantity,sort_order")
    .eq("product_id", sourceProductId);

  if (slots && slots.length > 0) {
    await sb.from("hamper_slots").insert(slots.map(s => ({ ...s, product_id: newProd.id })));
  }

  const { data: boxLinks } = await sb
    .from("hamper_product_boxes")
    .select("box_id,extra_price")
    .eq("product_id", sourceProductId);

  if (boxLinks && boxLinks.length > 0) {
    await sb.from("hamper_product_boxes").insert(boxLinks.map(b => ({ ...b, product_id: newProd.id })));
  }

  return NextResponse.json({ product: newProd });
}
