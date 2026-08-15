import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order, product } = body as {
      order: { order_number: string; items: Record<string, unknown>[]; subtotal: number; total: number; shipping_fee: number };
      product: { id: string; name: string; price: number; image_url: string | null; category: string };
    };

    if (!order?.order_number || !product?.id) {
      return NextResponse.json({ error: "Missing order or product" }, { status: 400 });
    }

    const sb = adminSupabase();

    // Fetch current order to get latest items/totals
    const { data: current, error: fetchErr } = await sb
      .from("orders")
      .select("items, subtotal, total, shipping_fee")
      .eq("order_number", order.order_number)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const existingItems = (current.items as Record<string, unknown>[]) ?? [];

    // Check if OTO product is already in the order (prevent double-add)
    const alreadyAdded = existingItems.some((i) => i.id === product.id);
    if (alreadyAdded) {
      return NextResponse.json({ ok: true, orderNumber: order.order_number });
    }

    const newItem = {
      id:             product.id,
      name:           product.name,
      price:          product.price,
      quantity:       1,
      label:          "",
      imageUrl:       product.image_url ?? "",
      category:       product.category,
    };

    const updatedItems    = [...existingItems, newItem];
    const updatedSubtotal = Number(current.subtotal) + product.price;
    const updatedTotal    = Number(current.total) + product.price;

    const { error: updateErr } = await sb
      .from("orders")
      .update({
        items:    updatedItems,
        subtotal: updatedSubtotal,
        total:    updatedTotal,
      })
      .eq("order_number", order.order_number);

    if (updateErr) {
      console.error("[create-upsell-order]", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, orderNumber: order.order_number });
  } catch (err) {
    console.error("[create-upsell-order]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
