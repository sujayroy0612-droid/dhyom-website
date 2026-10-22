export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const sb = createServerClient();

  const [tiersRes, boxesRes, slotsRes] = await Promise.all([
    sb.from("hamper_tiers").select("id,name,price,description,sort_order").eq("is_active", true).order("sort_order"),
    sb.from("hamper_boxes").select("id,name,image_url").eq("is_active", true).order("name"),
    sb.from("hamper_slots").select("id,tier_id,label,allowed_categories,quantity,sort_order").order("sort_order"),
  ]);

  return NextResponse.json({
    tiers:  tiersRes.data  ?? [],
    boxes:  boxesRes.data  ?? [],
    slots:  slotsRes.data  ?? [],
  });
}
