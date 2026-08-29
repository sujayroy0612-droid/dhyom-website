import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  const sb = adminClient();
  const [zonesRes, ratesRes] = await Promise.all([
    sb.from("shipping_zones").select("id,pincode_prefix,zone_name").order("zone_name").order("pincode_prefix"),
    sb.from("shipping_rates").select("id,zone_name,min_weight_g,max_weight_g,rate").order("min_weight_g").order("zone_name"),
  ]);
  if (zonesRes.error) return NextResponse.json({ error: zonesRes.error.message }, { status: 500 });
  if (ratesRes.error) return NextResponse.json({ error: ratesRes.error.message }, { status: 500 });
  return NextResponse.json({ zones: zonesRes.data, rates: ratesRes.data });
}

export async function POST(req: NextRequest) {
  const sb = adminClient();
  const body = await req.json();
  const { action } = body;

  if (action === "update_rate") {
    const { id, rate } = body;
    const { error } = await sb.from("shipping_rates").update({ rate: Number(rate) }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "add_zone_prefix") {
    const { pincode_prefix, zone_name } = body;
    const prefix = String(pincode_prefix).trim().slice(0, 2);
    if (!/^\d{2}$/.test(prefix)) return NextResponse.json({ error: "Pincode prefix must be 2 digits" }, { status: 400 });
    const { error } = await sb.from("shipping_zones").insert({ pincode_prefix: prefix, zone_name });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "delete_zone_prefix") {
    const { id } = body;
    const { error } = await sb.from("shipping_zones").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "add_rate_tier") {
    const { zone_name, min_weight_g, max_weight_g, rate } = body;
    const { error } = await sb.from("shipping_rates").insert({
      zone_name, min_weight_g: Number(min_weight_g),
      max_weight_g: max_weight_g != null ? Number(max_weight_g) : null,
      rate: Number(rate),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "delete_rate") {
    const { id } = body;
    const { error } = await sb.from("shipping_rates").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
