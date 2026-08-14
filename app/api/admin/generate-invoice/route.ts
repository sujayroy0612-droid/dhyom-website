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
  const { order_id, order_number, subtotal, shipping_fee } =
    await req.json() as { order_id: string; order_number: string; subtotal: number; shipping_fee: number };

  const sb = adminClient();

  /* Idempotency — return existing invoice if already generated */
  const { data: existing } = await sb
    .from("invoices")
    .select("id, invoice_number")
    .eq("order_id", order_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ invoice_number: existing.invoice_number, invoice_id: existing.id });
  }

  /* Get next sequential number from Postgres function */
  const { data: invNum, error: rpcErr } = await sb.rpc("generate_invoice_number");
  if (rpcErr || !invNum) {
    return NextResponse.json(
      { error: "generate_invoice_number failed: " + (rpcErr?.message ?? "returned null") },
      { status: 500 }
    );
  }

  /* GST @ 5% on subtotal */
  const taxable_value = Math.round(Number(subtotal) * 100) / 100;
  const gst_amount    = Math.round(taxable_value * 5) / 100;
  const total_amount  = Math.round((taxable_value + gst_amount + Number(shipping_fee ?? 0)) * 100) / 100;

  const { data: invoice, error: insErr } = await sb
    .from("invoices")
    .insert({ invoice_number: invNum, order_id, order_number, taxable_value, gst_amount, total_amount })
    .select("id, invoice_number")
    .single();

  if (insErr) {
    return NextResponse.json({ error: "Insert failed: " + insErr.message }, { status: 500 });
  }

  return NextResponse.json({ invoice_number: invoice.invoice_number, invoice_id: invoice.id });
}
