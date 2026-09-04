import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Atomically decrement stock for a list of items via the Postgres RPC.
async function deductStock(sb: ReturnType<typeof adminClient>, items: { product_id: string; quantity: number }[]) {
  await Promise.all(
    items.map(i => sb.rpc("decrement_product_stock", { p_product_id: i.product_id, p_quantity: i.quantity }))
  );
}

// ── GET — list orders with optional filters + summary ───────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from    = searchParams.get("from");
  const to      = searchParams.get("to");
  const channel = searchParams.get("channel");

  const sb = adminClient();

  let q = sb
    .from("offline_sales_orders")
    .select(`
      id, sale_date, channel, customer_name, location,
      payment_mode, payment_status, amount_paid, notes, created_at,
      invoice_number, invoice_date, stock_deducted,
      offline_sales_items (
        id, product_id, quantity, unit_price, line_total,
        products ( id, name, price )
      )
    `)
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (from)    q = q.gte("sale_date", from);
  if (to)      q = q.lte("sale_date", to);
  if (channel) q = q.eq("channel", channel);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orders = (data ?? []) as OfflineOrder[];

  const withTotals = orders.map(o => ({
    ...o,
    order_total: (o.offline_sales_items ?? []).reduce((s, i) => s + Number(i.line_total), 0),
  }));

  const byChannel = (ch: string) => withTotals.filter(o => o.channel === ch).reduce((s, o) => s + o.order_total, 0);
  const summary = {
    total: withTotals.reduce((s, o) => s + o.order_total, 0),
    byChannel: {
      wholesale:         byChannel("wholesale"),
      corporate_gifting: byChannel("corporate_gifting"),
      dm_order:          byChannel("dm_order"),
      exhibition:        byChannel("exhibition"),
      amazon:            byChannel("amazon"),
      flipkart:          byChannel("flipkart"),
      meesho:            byChannel("meesho"),
    },
  };

  return NextResponse.json({ orders: withTotals, summary });
}

interface OfflineOrder {
  id: string; sale_date: string; channel: string; customer_name: string;
  location?: string; payment_mode: string; payment_status: string;
  amount_paid: number; notes?: string; created_at: string;
  stock_deducted?: boolean;
  offline_sales_items: { id: string; product_id: string; quantity: number; unit_price: number; line_total: number; products?: unknown }[];
  order_total?: number;
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb   = adminClient();

  // ── delete ──────────────────────────────────────────────────────────────────
  if (body.action === "delete") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    // Restore stock if this order had deducted it
    const { data: orderData } = await sb
      .from("offline_sales_orders")
      .select("stock_deducted, offline_sales_items(product_id, quantity)")
      .eq("id", id)
      .single();

    if (orderData?.stock_deducted) {
      const items = (orderData.offline_sales_items ?? []) as { product_id: string; quantity: number }[];
      await Promise.all(
        items.map(i => sb.rpc("increment_product_stock", { p_product_id: i.product_id, p_quantity: i.quantity }))
      );
    }

    const { error } = await sb.from("offline_sales_orders").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── create ──────────────────────────────────────────────────────────────────
  if (body.action === "create") {
    const { order, items } = body as {
      order: {
        sale_date: string; channel: string; customer_name: string;
        location?: string; payment_mode: string; payment_status: string;
        amount_paid: number; notes?: string;
      };
      items: { product_id: string; quantity: number; unit_price: number }[];
    };

    if (!order || !items?.length) {
      return NextResponse.json({ error: "order and items are required" }, { status: 400 });
    }

    const { data: orderRow, error: orderErr } = await sb
      .from("offline_sales_orders")
      .insert({ ...order, stock_deducted: true })
      .select("id")
      .single();

    if (orderErr || !orderRow) {
      return NextResponse.json({ error: orderErr?.message ?? "Failed to create order" }, { status: 500 });
    }

    const itemRows = items.map(i => ({
      order_id:   orderRow.id,
      product_id: i.product_id,
      quantity:   i.quantity,
      unit_price: Number(i.unit_price),
      line_total: i.quantity * Number(i.unit_price),
    }));

    const { error: itemsErr } = await sb.from("offline_sales_items").insert(itemRows);
    if (itemsErr) {
      await sb.from("offline_sales_orders").delete().eq("id", orderRow.id);
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    // Deduct finished-goods stock for each line item
    await deductStock(sb, items.map(i => ({ product_id: i.product_id, quantity: i.quantity })));

    return NextResponse.json({ ok: true, id: orderRow.id });
  }

  // ── update ──────────────────────────────────────────────────────────────────
  if (body.action === "update") {
    const { id, order, items } = body as {
      id: string;
      order: {
        sale_date: string; channel: string; customer_name: string;
        location?: string; payment_mode: string; payment_status: string;
        amount_paid: number; notes?: string;
      };
      items: { product_id: string; quantity: number; unit_price: number }[];
    };

    if (!id || !order || !items?.length) {
      return NextResponse.json({ error: "id, order, and items are required" }, { status: 400 });
    }

    // Fetch old items + whether this order had stock deducted
    const { data: oldData } = await sb
      .from("offline_sales_orders")
      .select("stock_deducted, offline_sales_items(product_id, quantity)")
      .eq("id", id)
      .single();

    const wasDeducted = oldData?.stock_deducted ?? false;
    const oldItems    = (oldData?.offline_sales_items ?? []) as { product_id: string; quantity: number }[];

    // Restore stock for old items (only if they were previously deducted)
    if (wasDeducted && oldItems.length > 0) {
      await Promise.all(
        oldItems.map(i => sb.rpc("increment_product_stock", { p_product_id: i.product_id, p_quantity: i.quantity }))
      );
    }

    // Update order metadata
    const { error: orderErr } = await sb
      .from("offline_sales_orders")
      .update({ ...order, stock_deducted: true })
      .eq("id", id);

    if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

    // Replace items
    const { error: delErr } = await sb.from("offline_sales_items").delete().eq("order_id", id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    const itemRows = items.map(i => ({
      order_id:   id,
      product_id: i.product_id,
      quantity:   i.quantity,
      unit_price: Number(i.unit_price),
      line_total: i.quantity * Number(i.unit_price),
    }));

    const { error: itemsErr } = await sb.from("offline_sales_items").insert(itemRows);
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

    // Deduct stock for new items
    await deductStock(sb, items.map(i => ({ product_id: i.product_id, quantity: i.quantity })));

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
