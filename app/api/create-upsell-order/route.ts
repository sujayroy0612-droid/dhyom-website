import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function generateOrderNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `DHYOM-${s}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order, product } = body as {
      order: {
        order_number: string; customer_name: string; first_name: string; last_name: string;
        email: string; phone: string; address: string; shipping_street: string;
        shipping_city: string; shipping_state: string; shipping_pincode: string;
        payment_method: string;
      };
      product: { id: string; name: string; price: number; image_url: string | null; category: string };
    };

    if (!order?.order_number || !product?.id) {
      return NextResponse.json({ error: "Missing order or product" }, { status: 400 });
    }

    const newNum = generateOrderNumber();
    const sb = adminSupabase();

    const { error } = await sb.from("orders").insert({
      order_number:    newNum,
      customer_id:     null,
      customer_name:   order.customer_name,
      first_name:      order.first_name,
      last_name:       order.last_name,
      email:           order.email,
      phone:           order.phone,
      address:         order.address,
      shipping_street: order.shipping_street,
      shipping_city:   order.shipping_city,
      shipping_state:  order.shipping_state,
      shipping_pincode: order.shipping_pincode,
      items: [{ id: product.id, name: product.name, price: product.price, quantity: 1, label: "", imageUrl: product.image_url ?? "", category: product.category }],
      subtotal:        product.price,
      shipping_fee:    0,
      discount:        0,
      total:           product.price,
      payment_method:  order.payment_method,
      payment_status:  "pending",
      order_status:    "pending",
      order_notes:     `Upsell from order ${order.order_number}`,
    });

    if (error) {
      console.error("[create-upsell-order]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, orderNumber: newNum });
  } catch (err) {
    console.error("[create-upsell-order]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
