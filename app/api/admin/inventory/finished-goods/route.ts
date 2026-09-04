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
    .from("products")
    .select("id, name, category, stock, low_stock_threshold")
    .order("stock", { ascending: true })
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = adminClient();

  if (body.action === "adjust_stock") {
    const { id, delta } = body as { id: string; delta: number };
    const { data: row } = await sb.from("products").select("stock").eq("id", id).single();
    const newStock = Math.max(0, (row?.stock ?? 0) + delta);
    const { error } = await sb.from("products").update({ stock: newStock }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, new_stock: newStock });
  }

  if (body.action === "set_threshold") {
    const { id, threshold } = body as { id: string; threshold: number };
    const { error } = await sb
      .from("products")
      .update({ low_stock_threshold: Math.max(0, Number(threshold)) })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
