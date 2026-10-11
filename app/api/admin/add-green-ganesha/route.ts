export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized — must be logged in as admin." }, { status: 401 });
  }

  const sb = adminClient();

  // Check if already inserted
  const { data: existing } = await sb
    .from("products")
    .select("id,slug")
    .eq("slug", "ganesha-idol-green")
    .single();

  if (existing) {
    return NextResponse.json({ ok: true, already_exists: true, id: existing.id });
  }

  // Also update the Pink Ganesha with its variant info
  await sb
    .from("products")
    .update({ variant_group: "ganesha-idol", variant_label: "Pink" })
    .eq("id", "5f0fff0b-d3c5-46c2-be64-0df7c241d688");

  // Insert Green Ganesha
  const { data, error } = await sb
    .from("products")
    .insert({
      name: "Ganesha Idol",
      slug: "ganesha-idol-green",
      category: "idol",
      type: "idol",
      subcategory: "ganesha",
      collection: null,
      fragrance: "Green",
      price: 699,
      mrp: 899,
      stock: 10,
      is_visible: true,
      is_featured: false,
      description: "",
      image_url: "",
      image_urls: [],
      sku: "DH-G-GR",
      bullet_points: null,
      short_description: null,
      cost_price: 0,
      packaging_cost: 0,
      variant_group: "ganesha-idol",
      variant_label: "Green",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: data.id, slug: data.slug, name: data.name });
}
