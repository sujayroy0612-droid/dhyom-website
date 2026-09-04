import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET — recent production batches (last 50)
export async function GET() {
  const sb = adminClient();
  const { data, error } = await sb
    .from("production_batches")
    .select("id, product_id, quantity_produced, batch_date, notes, created_at, products(id, name)")
    .order("batch_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ batches: data ?? [] });
}

interface Shortage {
  name: string;
  unit: string;
  required: number;
  available: number;
  short_by: number;
}

// POST { product_id, quantity, batch_date, notes }
// Delegates to the Postgres function which runs the full batch atomically.
export async function POST(req: NextRequest) {
  const { product_id, quantity, batch_date, notes } = await req.json() as {
    product_id:  string;
    quantity:    number;
    batch_date:  string;
    notes?:      string;
  };

  if (!product_id || !quantity || quantity < 1) {
    return NextResponse.json({ error: "product_id and quantity (≥ 1) are required" }, { status: 400 });
  }

  const sb = adminClient();
  const { data, error } = await sb.rpc("log_production_batch", {
    p_product_id: product_id,
    p_quantity:   quantity,
    p_batch_date: batch_date || new Date().toISOString().slice(0, 10),
    p_notes:      notes ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = data as { ok: boolean; shortages?: Shortage[] };
  if (!result.ok) {
    return NextResponse.json({ ok: false, shortages: result.shortages ?? [] }, { status: 422 });
  }
  return NextResponse.json({ ok: true });
}
