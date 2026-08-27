import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

interface OrderItem { id?: string; name: string; price: number; quantity: number; }
interface Order {
  total: number; items: OrderItem[];
  shipping_fee: number; actual_shipping_cost: number | null;
  payment_type: string | null; amount_paid_online: number | null;
  order_status: string;
}
interface ProductCost { id: string; name: string; cost_price: number | null; packaging_cost: number | null; }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to   = searchParams.get("to")   ?? new Date().toISOString().slice(0, 10);

  const sb = adminClient();

  const [ordersRes, adSpendRes] = await Promise.all([
    sb.from("orders")
      .select("total,items,shipping_fee,actual_shipping_cost,payment_type,amount_paid_online,order_status")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .neq("order_status", "cancelled"),
    sb.from("ad_spend_entries")
      .select("amount,month,platform"),
  ]);

  if (ordersRes.error) return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });

  const orders = (ordersRes.data ?? []) as Order[];

  // ── Collect all product IDs referenced across orders ──────────────────────
  const productIds = new Set<string>();
  for (const o of orders) {
    for (const item of (o.items as OrderItem[]) ?? []) {
      if (item.id) productIds.add(item.id);
    }
  }

  let costById = new Map<string, ProductCost>();
  if (productIds.size > 0) {
    const { data: prods } = await sb
      .from("products")
      .select("id,name,cost_price,packaging_cost")
      .in("id", Array.from(productIds));
    costById = new Map((prods ?? []).map((p: ProductCost) => [p.id, p]));
  }

  // ── Core P&L calculation ───────────────────────────────────────────────────
  let revenue   = 0;
  let cogs      = 0;
  let packaging = 0;
  let shipping  = 0;
  let onlineRevenue = 0; // for gateway fee calculation

  const missingCostSet = new Map<string, string>(); // id → name

  for (const o of orders) {
    revenue += Number(o.total);
    shipping += Number(o.actual_shipping_cost ?? o.shipping_fee ?? 0);

    // Online portion for gateway fee (prepaid = full total; partial_cod = amount_paid_online)
    if (o.payment_type === "partial_cod") {
      onlineRevenue += Number(o.amount_paid_online ?? 0);
    } else {
      onlineRevenue += Number(o.total);
    }

    for (const item of (o.items as OrderItem[]) ?? []) {
      const prod = item.id ? costById.get(item.id) : null;

      if (!prod || (prod.cost_price == null || prod.cost_price === 0)) {
        if (item.id) missingCostSet.set(item.id, prod?.name ?? item.name);
      }

      cogs      += Number(prod?.cost_price     ?? 0) * item.quantity;
      packaging += Number(prod?.packaging_cost ?? 0) * item.quantity;
    }
  }

  // ── Ad spend (filter by months overlapping the date range) ────────────────
  const fromMonth = from.slice(0, 7); // YYYY-MM
  const toMonth   = to.slice(0, 7);
  const adEntries = (adSpendRes.data ?? []) as { amount: number; month: string; platform: string }[];
  const adSpend   = adEntries
    .filter(e => e.month >= fromMonth && e.month <= toMonth)
    .reduce((s, e) => s + Number(e.amount), 0);

  const gatewayFees = Math.round(onlineRevenue * 0.02 * 100) / 100;

  const netProfit = revenue - cogs - packaging - shipping - gatewayFees - adSpend;

  const missingCostProducts = Array.from(missingCostSet.entries()).map(([id, name]) => ({ id, name }));

  return NextResponse.json({
    revenue:      Math.round(revenue      * 100) / 100,
    cogs:         Math.round(cogs         * 100) / 100,
    packaging:    Math.round(packaging    * 100) / 100,
    shipping:     Math.round(shipping     * 100) / 100,
    gatewayFees,
    adSpend:      Math.round(adSpend      * 100) / 100,
    netProfit:    Math.round(netProfit    * 100) / 100,
    ordersCount:  orders.length,
    missingCostProducts,
  });
}
