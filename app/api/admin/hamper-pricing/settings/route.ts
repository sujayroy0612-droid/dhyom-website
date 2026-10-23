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

export async function PUT(req: NextRequest) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const {
    min_total, max_total, gst_rate, shipping_allowance,
    payment_gateway_fee, box_cost, minimum_margin_floor, order_by_banner_text,
  } = body;

  const sb = adminClient();

  // Upsert: update existing row, or insert if none exists
  const { data: existing } = await sb.from("hamper_settings").select("id").limit(1).single();

  if (existing?.id) {
    const { error } = await sb.from("hamper_settings").update({
      min_total, max_total, gst_rate, shipping_allowance,
      payment_gateway_fee, box_cost, minimum_margin_floor,
      order_by_banner_text: order_by_banner_text || null,
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await sb.from("hamper_settings").insert({
      min_total, max_total, gst_rate, shipping_allowance,
      payment_gateway_fee, box_cost, minimum_margin_floor,
      order_by_banner_text: order_by_banner_text || null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
