import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const STAGE_FIELD: Record<string, string> = {
  bump:     "bump_product_id",
  oto:      "oto_product_id",
  downsell: "downsell_product_id",
};

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  const stage    = req.nextUrl.searchParams.get("stage") ?? "bump";
  const field    = STAGE_FIELD[stage];

  if (!category || !field) return NextResponse.json({ product: null });

  const sb = adminSupabase();

  const { data: fs } = await sb
    .from("funnel_settings")
    .select(field)
    .eq("category", category)
    .single();

  const productId = fs ? (fs as unknown as Record<string, string | null>)[field] : null;
  if (!productId) return NextResponse.json({ product: null });

  const { data: product } = await sb
    .from("products")
    .select("id,name,price,description,image_url,category,subcategory,collection,type,fragrance")
    .eq("id", productId)
    .eq("is_visible", true)
    .single();

  return NextResponse.json({ product: product ?? null });
}
