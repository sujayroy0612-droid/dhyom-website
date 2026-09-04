import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ── GET — list orders with optional filters + summary ───────────────────────
// Query params: from (YYYY-MM-DD), to (YYYY-MM-DD), channel
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
      invoice_number, invoice_date,
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

  // Compute per-order total from items
  const withTotals = orders.map(o => ({
    ...o,
    order_total: (o.offline_sales_items ?? []).reduce((s, i) => s + Number(i.line_total), 0),
  }));

  // Summary
  const summary = {
    total: withTotals.reduce((s, o) => s + o.order_total, 0),
    byChannel: {
      wholesale:          withTotals.filter(o => o.channel === "wholesale").reduce((s, o) => s + o.order_total, 0),
      corporate_gifting:  withTotals.filter(o => o.channel === "corporate_gifting").reduce((s, o) => s + o.order_total, 0),
      dm_order:           withTotals.filter(o => o.channel === "dm_order").reduce((s, o) => s + o.order_total, 0),
      exhibition:         withTotals.filter(o => o.channel === "exhibition").reduce((s, o) => s + o.order_total, 0),
    },
  };

  return NextResponse.json({ orders: withTotals, summary });
}

interface OfflineOrder {
  id: string; sale_date: string; channel: string; customer_name: string;
  location?: string; payment_mode: string; payment_status: string;
  amount_paid: number; notes?: string; created_at: string;
  offline_sales_items: { id: string; product_id: string; quantity: number; unit_price: number; line_total: number; products?: unknown }[];
  order_total?: number;
}

// ── POST — create order + items ──────────────────────────────────────────────
// Body: { action: "create", order: {...}, items: [{product_id, quantity, unit_price}] }
// DELETE an order: { action: "delete", id }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = adminClient();

  if (body.action === "delete") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await sb.from("offline_sales_orders").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

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

    // Insert order
    const { data: orderRow, error: orderErr } = await sb
      .from("offline_sales_orders")
      .insert({ ...order })
      .select("id")
      .single();

    if (orderErr || !orderRow) {
      return NextResponse.json({ error: orderErr?.message ?? "Failed to create order" }, { status: 500 });
    }

    // Insert items
    const itemRows = items.map(i => ({
      order_id:   orderRow.id,
      product_id: i.product_id,
      quantity:   i.quantity,
      unit_price: Number(i.unit_price),
      line_total: i.quantity * Number(i.unit_price),
    }));

    const { error: itemsErr } = await sb.from("offline_sales_items").insert(itemRows);
    if (itemsErr) {
      // Roll back order if items fail
      await sb.from("offline_sales_orders").delete().eq("id", orderRow.id);
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: orderRow.id });
  }

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

    // Update order row
    const { error: orderErr } = await sb
      .from("offline_sales_orders")
      .update({ ...order })
      .eq("id", id);

    if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

    // Replace items: delete existing then insert new
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

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
