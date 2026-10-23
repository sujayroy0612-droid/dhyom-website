export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const sb = createServerClient();
  const { data } = await sb
    .from("hamper_settings")
    .select("min_total,max_total,gst_rate,shipping_allowance,payment_gateway_fee,box_cost,minimum_margin_floor,order_by_banner_text")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  const defaults = {
    min_total:            1399,
    max_total:            2300,
    gst_rate:             12,
    shipping_allowance:   200,
    payment_gateway_fee:  2,
    box_cost:             200,
    minimum_margin_floor: 30,
    order_by_banner_text: null as string | null,
  };

  return NextResponse.json({ settings: data ?? defaults });
}
