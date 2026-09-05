import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? "";
  const to   = searchParams.get("to")   ?? "";

  const sb = adminClient();

  // 1. Products
  const { data: products, error: prodErr } = await sb
    .from("products")
    .select("id, name, category, stock, low_stock_threshold, custom_remarks")
    .order("stock", { ascending: false })
    .order("name");
  if (prodErr) return NextResponse.json({ error: prodErr.message }, { status: 500 });

  // 2. Production batches (stock in) filtered by date
  let batchQ = sb.from("production_batches").select("product_id, quantity_produced, batch_date");
  if (from) batchQ = batchQ.gte("batch_date", from);
  if (to)   batchQ = batchQ.lte("batch_date", to);
  const { data: batches } = await batchQ;

  const stockInMap: Record<string, number> = {};
  (batches ?? []).forEach((b: { product_id: string; quantity_produced: number }) => {
    stockInMap[b.product_id] = (stockInMap[b.product_id] ?? 0) + b.quantity_produced;
  });

  // 3a. Manual channel sales (Amazon / Flipkart / Meesho entered directly)
  const { data: manualRows } = await sb
    .from("manual_channel_sales")
    .select("product_id, channel, quantity")
    .eq("period_from", from || "")
    .eq("period_to",   to   || "");

  const manualAmazonMap:   Record<string, number> = {};
  const manualFlipkartMap: Record<string, number> = {};
  const manualMeeshoMap:   Record<string, number> = {};
  const manualWebsiteMap:  Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (manualRows ?? []).forEach((r: any) => {
    if      (r.channel === "amazon")   manualAmazonMap[r.product_id]   = (manualAmazonMap[r.product_id]   ?? 0) + r.quantity;
    else if (r.channel === "flipkart") manualFlipkartMap[r.product_id] = (manualFlipkartMap[r.product_id] ?? 0) + r.quantity;
    else if (r.channel === "meesho")   manualMeeshoMap[r.product_id]   = (manualMeeshoMap[r.product_id]   ?? 0) + r.quantity;
    else if (r.channel === "website")  manualWebsiteMap[r.product_id]  = (manualWebsiteMap[r.product_id]  ?? 0) + r.quantity;
  });

  // 3. Offline/channel sales filtered by date
  let offQ = sb
    .from("offline_sales_orders")
    .select("id, channel, sale_date, offline_sales_items(product_id, quantity)");
  if (from) offQ = offQ.gte("sale_date", from);
  if (to)   offQ = offQ.lte("sale_date", to);
  const { data: offOrders } = await offQ;

  const amazonMap:   Record<string, number> = {};
  const flipkartMap: Record<string, number> = {};
  const meeshoMap:   Record<string, number> = {};
  const offlineMap:  Record<string, number> = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (offOrders ?? []).forEach((o: any) => {
    const ch    = o.channel as string;
    const items = (o.offline_sales_items ?? []) as { product_id: string; quantity: number }[];
    items.forEach(i => {
      if      (ch === "amazon")   { amazonMap[i.product_id]   = (amazonMap[i.product_id]   ?? 0) + i.quantity; }
      else if (ch === "flipkart") { flipkartMap[i.product_id] = (flipkartMap[i.product_id] ?? 0) + i.quantity; }
      else if (ch === "meesho")   { meeshoMap[i.product_id]   = (meeshoMap[i.product_id]   ?? 0) + i.quantity; }
      else                        { offlineMap[i.product_id]  = (offlineMap[i.product_id]  ?? 0) + i.quantity; }
    });
  });

  // 4. WIP: max producible units from current raw material stock
  const { data: recipes } = await sb
    .from("product_recipes")
    .select("product_id, quantity_used, raw_materials(current_stock)");

  const recipeMap: Record<string, { qty: number; stock: number }[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (recipes ?? []).forEach((r: any) => {
    if (!recipeMap[r.product_id]) recipeMap[r.product_id] = [];
    const rmStock = Array.isArray(r.raw_materials) ? (r.raw_materials[0]?.current_stock ?? 0) : (r.raw_materials?.current_stock ?? 0);
    recipeMap[r.product_id].push({ qty: Number(r.quantity_used), stock: Number(rmStock) });
  });

  const wipMap: Record<string, number> = {};
  Object.entries(recipeMap).forEach(([pid, ingredients]) => {
    if (!ingredients.length) return;
    wipMap[pid] = Math.max(0, Math.min(...ingredients.map(i => Math.floor(i.stock / i.qty))));
  });

  // 5. Build ledger rows
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ledger = (products ?? []).map((p: any) => {
    const stockIn    = stockInMap[p.id]    ?? 0;
    const outAmazon  = (amazonMap[p.id]   ?? 0) + (manualAmazonMap[p.id]   ?? 0);
    const outFlipkart= (flipkartMap[p.id] ?? 0) + (manualFlipkartMap[p.id] ?? 0);
    const outMeesho  = (meeshoMap[p.id]   ?? 0) + (manualMeeshoMap[p.id]   ?? 0);
    const outOffline = offlineMap[p.id]   ?? 0;
    const outWebsite = manualWebsiteMap[p.id] ?? 0;
    const totalOut   = outAmazon + outFlipkart + outMeesho + outOffline + outWebsite;
    const closing    = p.stock;
    const wip        = wipMap[p.id] ?? 0;
    const total      = closing + wip;
    const opening    = Math.max(0, closing - stockIn + totalOut);

    let autoRemarks = "";
    if (closing <= p.low_stock_threshold) {
      autoRemarks = wip > 0 ? "Below reorder — production possible" : "Below reorder — plan production";
    } else if (wip > 0) {
      autoRemarks = "Raw stock in advance";
    }
    const remarks = (p.custom_remarks as string | null) ?? autoRemarks;

    return {
      id: p.id, name: p.name, category: p.category,
      opening, stock_in: stockIn,
      out_amazon: outAmazon, out_flipkart: outFlipkart, out_meesho: outMeesho,
      out_website: outWebsite, out_offline: outOffline,
      closing, wip, total,
      reorder: p.low_stock_threshold,
      remarks,
      low: closing <= p.low_stock_threshold,
    };
  });

  return NextResponse.json({ ledger });
}
