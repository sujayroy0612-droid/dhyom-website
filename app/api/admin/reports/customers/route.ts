import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

interface Order {
  id: string; email: string; first_name: string; last_name: string;
  customer_id: string | null; total: number; created_at: string;
  shipping_state: string | null; order_status: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to   = searchParams.get("to")   ?? new Date().toISOString().slice(0, 10);

  const sb = adminClient();

  // Fetch orders in range + ALL historical orders (for new vs repeat logic)
  const [inRangeRes, allRes] = await Promise.all([
    sb.from("orders").select("id,email,first_name,last_name,customer_id,total,created_at,shipping_state,order_status")
      .gte("created_at", `${from}T00:00:00`).lte("created_at", `${to}T23:59:59`)
      .neq("order_status", "cancelled"),
    sb.from("orders").select("email,customer_id,created_at,total,order_status,first_name,last_name")
      .neq("order_status", "cancelled").order("created_at", { ascending: true }),
  ]);

  if (inRangeRes.error) return NextResponse.json({ error: inRangeRes.error.message }, { status: 500 });

  const inRange   = (inRangeRes.data ?? []) as Order[];
  const allOrders = (allRes.data ?? []) as Order[];

  // ── Build first-order date per identity (email or customer_id) ────────────
  const firstOrder = new Map<string, string>(); // identity → first order date
  for (const o of allOrders) {
    const key = o.customer_id ?? o.email;
    if (!firstOrder.has(key)) firstOrder.set(key, o.created_at);
  }

  // ── New vs Repeat in range ────────────────────────────────────────────────
  let newCount = 0, repeatCount = 0, newRevenue = 0, repeatRevenue = 0;
  const seenInRange = new Map<string, number>(); // identity → count in range
  for (const o of inRange) {
    const key = o.customer_id ?? o.email;
    seenInRange.set(key, (seenInRange.get(key) ?? 0) + 1);
  }
  for (const o of inRange) {
    const key  = o.customer_id ?? o.email;
    const first = firstOrder.get(key) ?? o.created_at;
    // "new" = their very first order ever falls within this date range
    const isNew = first >= `${from}T00:00:00` && first <= `${to}T23:59:59`;
    if (isNew) { newCount++; newRevenue += Number(o.total); }
    else        { repeatCount++; repeatRevenue += Number(o.total); }
  }

  // ── Top customers (lifetime, not just in range) ───────────────────────────
  const ltMap = new Map<string, { email: string; name: string; orders: number; revenue: number; lastOrder: string }>();
  for (const o of allOrders) {
    const key = o.customer_id ?? o.email;
    const ex  = ltMap.get(key) ?? { email: o.email, name: `${o.first_name} ${o.last_name}`.trim(), orders: 0, revenue: 0, lastOrder: o.created_at };
    ltMap.set(key, {
      email: o.email,
      name:  `${o.first_name} ${o.last_name}`.trim() || o.email,
      orders: ex.orders + 1,
      revenue: ex.revenue + Number(o.total),
      lastOrder: o.created_at > ex.lastOrder ? o.created_at : ex.lastOrder,
    });
  }
  const topCustomers = Array.from(ltMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20)
    .map(c => ({ ...c, revenue: Math.round(c.revenue * 100) / 100, lastOrder: c.lastOrder.slice(0, 10) }));

  // ── Avg LTV (all time) ─────────────────────────────────────────────────────
  const totalRevenueLT = allOrders.reduce((s, o) => s + Number(o.total), 0);
  const uniqueCustomers = ltMap.size;
  const avgLTV = uniqueCustomers ? Math.round(totalRevenueLT / uniqueCustomers * 100) / 100 : 0;

  // ── Geographic spread (from in-range orders) ──────────────────────────────
  const geoMap = new Map<string, { orders: number; revenue: number }>();
  for (const o of inRange) {
    const state = o.shipping_state?.trim() || "Unknown";
    const ex    = geoMap.get(state) ?? { orders: 0, revenue: 0 };
    geoMap.set(state, { orders: ex.orders + 1, revenue: ex.revenue + Number(o.total) });
  }
  const byState = Array.from(geoMap.entries())
    .map(([state, v]) => ({ state, orders: v.orders, revenue: Math.round(v.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue);

  return NextResponse.json({
    newVsRepeat: {
      new_count:      newCount,
      repeat_count:   repeatCount,
      new_revenue:    Math.round(newRevenue    * 100) / 100,
      repeat_revenue: Math.round(repeatRevenue * 100) / 100,
    },
    topCustomers,
    avgLTV,
    byState,
    totalCustomers: uniqueCustomers,
    ordersInRange:  inRange.length,
  });
}
