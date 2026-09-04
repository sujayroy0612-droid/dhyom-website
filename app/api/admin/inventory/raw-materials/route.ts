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
  const { data, error } = await sb
    .from("raw_materials")
    .select("*")
    .order("category")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ raw_materials: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = adminClient();

  if (body.action === "create") {
    const { name, category, unit, current_stock, low_stock_threshold, cost_per_unit } = body;
    const { data, error } = await sb
      .from("raw_materials")
      .insert({
        name,
        category,
        unit,
        current_stock:       Number(current_stock) || 0,
        low_stock_threshold: Number(low_stock_threshold) || 100,
        cost_per_unit:       cost_per_unit ? Number(cost_per_unit) : null,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, raw_material: data });
  }

  if (body.action === "update") {
    const { id, name, category, unit, low_stock_threshold, cost_per_unit } = body;
    const { error } = await sb
      .from("raw_materials")
      .update({
        name,
        category,
        unit,
        low_stock_threshold: Number(low_stock_threshold) || 100,
        cost_per_unit: cost_per_unit ? Number(cost_per_unit) : null,
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "adjust") {
    const { id, new_stock } = body as { id: string; new_stock: number };
    const { error } = await sb
      .from("raw_materials")
      .update({ current_stock: Math.max(0, Number(new_stock)) })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
