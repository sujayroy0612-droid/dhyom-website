import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? "";
  const to   = searchParams.get("to")   ?? "";

  const sb = adminClient();
  let q = sb.from("manual_channel_sales").select("product_id, channel, quantity, period_from, period_to");
  if (from) q = q.eq("period_from", from);
  if (to)   q = q.eq("period_to",   to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

// POST { product_id, channel, quantity, period_from, period_to }
export async function POST(req: NextRequest) {
  const { product_id, channel, quantity, period_from, period_to } = await req.json();
  if (!product_id || !channel || quantity == null || !period_from || !period_to) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const sb = adminClient();
  const { error } = await sb
    .from("manual_channel_sales")
    .upsert(
      { product_id, channel, quantity: Number(quantity), period_from, period_to, updated_at: new Date().toISOString() },
      { onConflict: "product_id,channel,period_from,period_to" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
