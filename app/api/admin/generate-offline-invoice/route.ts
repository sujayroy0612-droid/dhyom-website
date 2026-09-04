import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const { offline_order_id } = await req.json() as { offline_order_id: string };
  if (!offline_order_id) {
    return NextResponse.json({ error: "offline_order_id is required" }, { status: 400 });
  }

  const sb = adminClient();

  // Idempotency — return existing invoice number if already generated
  const { data: existing, error: fetchErr } = await sb
    .from("offline_sales_orders")
    .select("invoice_number, invoice_date")
    .eq("id", offline_order_id)
    .single();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  if (existing?.invoice_number) {
    return NextResponse.json({ invoice_number: existing.invoice_number });
  }

  // Get next sequential number from the same Postgres function used for online orders
  const { data: invNum, error: rpcErr } = await sb.rpc("generate_invoice_number");
  if (rpcErr || !invNum) {
    return NextResponse.json(
      { error: "generate_invoice_number failed: " + (rpcErr?.message ?? "returned null") },
      { status: 500 }
    );
  }

  // Stamp the invoice number + date onto the offline order row
  const { error: upErr } = await sb
    .from("offline_sales_orders")
    .update({ invoice_number: invNum, invoice_date: new Date().toISOString() })
    .eq("id", offline_order_id);

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ invoice_number: invNum });
}
