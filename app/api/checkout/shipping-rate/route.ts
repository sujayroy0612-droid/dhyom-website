import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkShippingRate } from "@/lib/shiprocket";

const FALLBACK_RATE    = 99;
const DEFAULT_WEIGHT_G = 200; // grams per item when weight_grams is null

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// In-memory cache — shared across warm serverless instances (soft cache)
interface CacheEntry { courierId: number; courierName: string; rate: number; expiresAt: number; }
const rateCache = new Map<string, CacheEntry>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

interface CartItemInput { id?: string; quantity: number; }

export async function POST(req: NextRequest) {
  let delivery_pincode: string, cart_items: CartItemInput[], is_cod: boolean;
  try {
    ({ delivery_pincode, cart_items, is_cod } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!delivery_pincode || !/^\d{6}$/.test(delivery_pincode)) {
    return NextResponse.json({ error: "Invalid pincode" }, { status: 400 });
  }

  const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE;
  if (!pickupPincode || !process.env.SHIPROCKET_EMAIL) {
    console.warn("[shipping-rate] Shiprocket env vars not set — returning fallback rate");
    return NextResponse.json({ shipping_fee: FALLBACK_RATE, actual_rate: FALLBACK_RATE, is_fallback: true });
  }

  // ── Weight calculation ─────────────────────────────────────────────────────
  const productIds = (cart_items ?? []).map(i => i.id).filter(Boolean) as string[];
  let totalGrams = 0;

  if (productIds.length > 0) {
    const { data: prods } = await adminClient()
      .from("products")
      .select("id, weight_grams")
      .in("id", productIds);

    const byId = new Map(
      (prods ?? []).map((p: { id: string; weight_grams: number | null }) => [p.id, p.weight_grams])
    );

    for (const item of cart_items ?? []) {
      const qty = item.quantity ?? 1;
      const w   = item.id ? (byId.get(item.id) ?? null) : null;
      if (!w) {
        console.warn(`[shipping-rate] No weight_grams for product ${item.id ?? "unknown"} — using ${DEFAULT_WEIGHT_G}g default`);
        totalGrams += DEFAULT_WEIGHT_G * qty;
      } else {
        totalGrams += w * qty;
      }
    }
  } else {
    totalGrams = DEFAULT_WEIGHT_G;
  }

  const weightKg = Math.max(0.1, totalGrams / 1000);
  const cacheKey = `${delivery_pincode}:${Math.round(weightKg * 100)}:${is_cod ? 1 : 0}`;

  // ── Cache hit ──────────────────────────────────────────────────────────────
  const cached = rateCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      shipping_fee: Math.round(cached.rate),
      actual_rate:  Math.round(cached.rate),
      courier_id:   cached.courierId,
      courier_name: cached.courierName,
      is_fallback:  false,
    });
  }

  // ── Live Shiprocket rate check ─────────────────────────────────────────────
  try {
    const result = await checkShippingRate(pickupPincode, delivery_pincode, weightKg, is_cod ?? false);

    rateCache.set(cacheKey, {
      courierId:  result.courierId,
      courierName: result.courierName,
      rate:       result.rate,
      expiresAt:  Date.now() + CACHE_TTL,
    });

    console.log(`[shipping-rate] ${pickupPincode}→${delivery_pincode} ${weightKg.toFixed(2)}kg ${is_cod ? "COD" : "prepaid"}: ₹${Math.round(result.rate)} via ${result.courierName}`);

    return NextResponse.json({
      shipping_fee: Math.round(result.rate),
      actual_rate:  Math.round(result.rate),
      courier_id:   result.courierId,
      courier_name: result.courierName,
      is_fallback:  false,
    });
  } catch (err) {
    console.error("[shipping-rate] Shiprocket rate check failed — falling back to ₹99:", err);
    return NextResponse.json({
      shipping_fee: FALLBACK_RATE,
      actual_rate:  FALLBACK_RATE,
      is_fallback:  true,
    });
  }
}
