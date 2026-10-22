export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST /api/hampers/validate
// Body: { productIds: string[] }
// Returns { ok: true } or { ok: false, outOfStock: [{ id, name }] }
export async function POST(req: NextRequest) {
  const { productIds } = await req.json() as { productIds: string[] };

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return NextResponse.json({ ok: true, outOfStock: [] });
  }

  const sb = createServerClient();
  const { data, error } = await sb
    .from("products")
    .select("id,name,stock,is_visible")
    .in("id", productIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const outOfStock = (data ?? [])
    .filter(p => p.stock <= 0 || !p.is_visible)
    .map(p => ({ id: p.id, name: p.name }));

  return NextResponse.json({ ok: outOfStock.length === 0, outOfStock });
}
