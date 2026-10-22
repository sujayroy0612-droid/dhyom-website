export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/hampers/products?categories=candle,idol
// Returns in-stock, visible products for the given category/categories.
export async function GET(req: NextRequest) {
  const url        = new URL(req.url);
  const catParam   = url.searchParams.get("categories") ?? "";
  const categories = catParam.split(",").map(s => s.trim()).filter(Boolean);

  if (!categories.length) {
    return NextResponse.json({ products: [] });
  }

  const sb = createServerClient();
  const { data, error } = await sb
    .from("products")
    .select("id,name,category,subcategory,collection,fragrance,price,stock,image_url,slug")
    .in("category", categories)
    .eq("is_visible", true)
    .gt("stock", 0)
    .order("category")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [] });
}
