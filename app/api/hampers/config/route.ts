export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const sb = createServerClient();

  const [slotsRes, boxesRes] = await Promise.all([
    sb
      .from("hamper_slots")
      .select("id,label,allowed_categories,quantity,sort_order")
      .eq("product_id", productId)
      .order("sort_order"),
    sb
      .from("hamper_product_boxes")
      .select("id,extra_price,hamper_boxes(id,name,image_url)")
      .eq("product_id", productId),
  ]);

  type HamperBoxRecord = { id: string; name: string; image_url: string };
  type BoxRow = { id: string; extra_price: number; hamper_boxes: HamperBoxRecord | HamperBoxRecord[] | null };
  const boxes = (boxesRes.data ?? []).map((row: BoxRow) => {
    const hb = Array.isArray(row.hamper_boxes) ? row.hamper_boxes[0] : row.hamper_boxes;
    return {
      linkId:      row.id,
      extra_price: row.extra_price ?? 0,
      id:          hb?.id        ?? "",
      name:        hb?.name      ?? "",
      image_url:   hb?.image_url ?? "",
    };
  });

  return NextResponse.json({
    slots: slotsRes.data ?? [],
    boxes,
  });
}
