import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  if (!category) return NextResponse.json({ product: null });

  const sb = adminSupabase();

  const { data: fs } = await sb
    .from("funnel_settings")
    .select("bump_product_id")
    .eq("category", category)
    .single();

  const bumpId = fs?.bump_product_id;
  if (!bumpId) return NextResponse.json({ product: null });

  const { data: product } = await sb
    .from("products")
    .select("id,name,price,image_url,category,subcategory,collection,type,fragrance")
    .eq("id", bumpId)
    .eq("is_visible", true)
    .single();

  return NextResponse.json({ product: product ?? null });
}
