import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET ?from=&to= — returns all overrides for the period
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? "";
  const to   = searchParams.get("to")   ?? "";

  const sb = adminClient();
  const { data, error } = await sb
    .from("ledger_manual_overrides")
    .select("product_id, opening, stock_in, wip")
    .eq("period_from", from)
    .eq("period_to",   to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ overrides: data ?? [] });
}

// POST { product_id, field, value, period_from, period_to }
export async function POST(req: NextRequest) {
  const { product_id, field, value, period_from, period_to } = await req.json();

  if (!product_id || !field || value == null || !period_from || !period_to) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const allowed = ["opening", "stock_in", "wip"];
  if (!allowed.includes(field)) {
    return NextResponse.json({ error: "Invalid field" }, { status: 400 });
  }

  const sb = adminClient();

  // Fetch existing row
  const { data: existing } = await sb
    .from("ledger_manual_overrides")
    .select("id, opening, stock_in, wip")
    .eq("product_id",  product_id)
    .eq("period_from", period_from)
    .eq("period_to",   period_to)
    .maybeSingle();

  const update = {
    product_id, period_from, period_to,
    opening:  existing?.opening  ?? null,
    stock_in: existing?.stock_in ?? null,
    wip:      existing?.wip      ?? null,
    [field]:  Number(value),
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb
    .from("ledger_manual_overrides")
    .upsert(update, { onConflict: "product_id,period_from,period_to" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
