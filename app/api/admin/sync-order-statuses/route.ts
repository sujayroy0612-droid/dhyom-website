import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Same mapping as the webhook handler — kept in sync manually
function deriveOrderStatus(shippingStatus: string): string | null {
  switch (shippingStatus) {
    case "picked_up":
    case "in_transit":
    case "out_for_delivery":
      return "shipped";
    case "delivered":
      return "delivered";
    case "rto_initiated":
    case "rto_delivered":
    case "cancelled":
      return "cancelled";
    default:
      return null;
  }
}

// POST — bulk-sync all orders where shipping_status disagrees with order_status
export async function POST() {
  const sb = adminClient();

  // Fetch all orders that have a shipping_status set
  const { data: orders, error } = await sb
    .from("orders")
    .select("id, order_status, shipping_status")
    .not("shipping_status", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const toFix = (orders ?? []).filter(o => {
    const derived = deriveOrderStatus(o.shipping_status);
    return derived !== null && derived !== o.order_status;
  });

  const results: { id: string; from: string; to: string; ok: boolean }[] = [];

  for (const o of toFix) {
    const newStatus = deriveOrderStatus(o.shipping_status)!;
    const { error: upErr } = await sb
      .from("orders")
      .update({ order_status: newStatus })
      .eq("id", o.id);
    results.push({ id: o.id, from: o.order_status, to: newStatus, ok: !upErr });
  }

  return NextResponse.json({ fixed: results.length, results });
}
