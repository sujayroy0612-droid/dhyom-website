import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

interface OrderItem { id?: string; name: string; price: number; quantity: number; label?: string; category?: string; }
interface Order {
  id: string; order_number: string; created_at: string; total: number; subtotal: number;
  shipping_fee: number; items: OrderItem[]; payment_type: string | null; payment_status: string;
  amount_paid_online: number | null; order_status: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to   = searchParams.get("to")   ?? new Date().toISOString().slice(0, 10);

  const sb = adminClient();
  const { data: orders, error } = await sb
    .from("orders")
    .select("id,order_number,created_at,total,subtotal,shipping_fee,items,payment_type,payment_status,amount_paid_online,order_status")
    .gte("created_at", `${from}T00:00:00`)
    .lte("created_at", `${to}T23:59:59`)
    .neq("order_status", "cancelled")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (orders ?? []) as Order[];

  // ── Revenue by day ─────────────────────────────────────────────────────────
  const dayMap = new Map<string, { revenue: number; orders: number }>();
  for (const o of rows) {
    const day = o.created_at.slice(0, 10);
    const existing = dayMap.get(day) ?? { revenue: 0, orders: 0 };
    dayMap.set(day, { revenue: existing.revenue + Number(o.total), orders: existing.orders + 1 });
  }
  const revenueByDay = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, revenue: Math.round(v.revenue * 100) / 100, orders: v.orders }));

  // ── Revenue & units by product ─────────────────────────────────────────────
  const productMap = new Map<string, { name: string; units: number; revenue: number }>();
  for (const o of rows) {
    for (const item of (o.items as OrderItem[]) ?? []) {
      const key = item.id ?? item.name;
      const ex  = productMap.get(key) ?? { name: item.name, units: 0, revenue: 0 };
      productMap.set(key, {
        name:    item.name,
        units:   ex.units + item.quantity,
        revenue: ex.revenue + item.price * item.quantity,
      });
    }
  }
  const revenueByProduct = Array.from(productMap.entries())
    .map(([id, v]) => ({ id, name: v.name, units: v.units, revenue: Math.round(v.revenue * 100) / 100, avgPrice: Math.round(v.revenue / v.units * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── Revenue by category ────────────────────────────────────────────────────
  // category is on the order item if present; otherwise fall back to first word of name
  const { data: prods } = await sb.from("products").select("id,category");
  const catById = new Map((prods ?? []).map((p: { id: string; category: string }) => [p.id, p.category]));

  const catMap = new Map<string, { units: number; revenue: number }>();
  for (const o of rows) {
    for (const item of (o.items as OrderItem[]) ?? []) {
      const cat = (item.id ? catById.get(item.id) : null) ?? item.category ?? "Other";
      const ex  = catMap.get(cat) ?? { units: 0, revenue: 0 };
      catMap.set(cat, { units: ex.units + item.quantity, revenue: ex.revenue + item.price * item.quantity });
    }
  }
  const revenueByCategory = Array.from(catMap.entries())
    .map(([category, v]) => ({ category, units: v.units, revenue: Math.round(v.revenue * 100) / 100, avgPrice: Math.round(v.revenue / v.units * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── Payment split ──────────────────────────────────────────────────────────
  let prepaidRev = 0, codRev = 0, prepaidOrders = 0, codOrders = 0;
  for (const o of rows) {
    if (o.payment_type === "partial_cod") { codRev += Number(o.total); codOrders++; }
    else { prepaidRev += Number(o.total); prepaidOrders++; }
  }

  // ── AOV by day ─────────────────────────────────────────────────────────────
  const aovByDay = revenueByDay.map(d => ({ date: d.date, aov: d.orders ? Math.round(d.revenue / d.orders * 100) / 100 : 0 }));

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalRevenue = rows.reduce((s, o) => s + Number(o.total), 0);
  const totalUnits   = rows.reduce((s, o) => s + (o.items as OrderItem[]).reduce((si, i) => si + i.quantity, 0), 0);

  return NextResponse.json({
    revenueByDay,
    revenueByProduct,
    revenueByCategory,
    aovByDay,
    paymentSplit: {
      prepaid: Math.round(prepaidRev * 100) / 100, prepaidOrders,
      partial_cod: Math.round(codRev * 100) / 100, codOrders,
    },
    totals: { revenue: Math.round(totalRevenue * 100) / 100, orders: rows.length, units: totalUnits },
  });
}
