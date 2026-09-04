import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET ?product_id=xxx  — returns recipe rows with raw material details
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("product_id");
  if (!productId) return NextResponse.json({ error: "product_id required" }, { status: 400 });

  const sb = adminClient();
  const { data, error } = await sb
    .from("product_recipes")
    .select("id, product_id, raw_material_id, quantity_used, raw_materials(id, name, unit)")
    .eq("product_id", productId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recipe: data ?? [] });
}

// POST { action: "save", product_id, rows: [{raw_material_id, quantity_used}] }
// Replaces the entire recipe for a product atomically (delete + insert).
export async function POST(req: NextRequest) {
  const { action, product_id, rows } = await req.json() as {
    action: string;
    product_id: string;
    rows: { raw_material_id: string; quantity_used: number }[];
  };

  if (action !== "save") return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  if (!product_id)       return NextResponse.json({ error: "product_id required" }, { status: 400 });

  const sb = adminClient();

  const { error: delErr } = await sb
    .from("product_recipes")
    .delete()
    .eq("product_id", product_id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (!rows || rows.length === 0) return NextResponse.json({ ok: true });

  const { error: insErr } = await sb.from("product_recipes").insert(
    rows.map(r => ({
      product_id,
      raw_material_id: r.raw_material_id,
      quantity_used:   Number(r.quantity_used),
    }))
  );
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
