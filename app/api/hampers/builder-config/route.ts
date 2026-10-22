export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const sb = createServerClient();

  const [levelsRes, boxesRes] = await Promise.all([
    sb.from("hamper_config").select("id,level,name,min_spend,sort_order").order("sort_order"),
    sb.from("hamper_boxes").select("id,name,image_url,price").order("name"),
  ]);

  return NextResponse.json({
    levels: levelsRes.data ?? [],
    boxes:  boxesRes.data  ?? [],
  });
}
