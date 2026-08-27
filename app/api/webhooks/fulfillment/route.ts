import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Map Shiprocket status strings → our normalised shipping_status
const STATUS_MAP: Record<string, string> = {
  // Pickup phase
  "pickup scheduled":      "pickup_scheduled",
  "pickup generated":      "pickup_scheduled",
  "pickup queue":          "pickup_scheduled",
  "pickup error":          "pickup_error",
  "pickup complete":       "picked_up",
  "picked up":             "picked_up",
  // Transit
  "in transit":            "in_transit",
  "reached at destination hub": "in_transit",
  "out for delivery":      "out_for_delivery",
  // Terminal — positive
  "delivered":             "delivered",
  // Terminal — negative
  "delivery failed":       "delivery_failed",
  "undelivered":           "delivery_failed",
  "rto initiated":         "rto_initiated",
  "rto in transit":        "rto_initiated",
  "rto out for delivery":  "rto_initiated",
  "rto delivered":         "rto_delivered",
  "rto acknowledged":      "rto_delivered",
  "lost":                  "lost",
  "cancelled":             "cancelled",
};

function normaliseStatus(raw: string): string {
  return STATUS_MAP[raw.toLowerCase().trim()] ?? raw.toLowerCase().replace(/\s+/g, "_");
}

// Map shipping_status → order_status for auto-advancing the merchant status
function toOrderStatus(shippingStatus: string): string | null {
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
      return null; // don't change order_status
  }
}

// GET — lets Shiprocket verify the URL is reachable
export async function GET() {
  return NextResponse.json({ ok: true, service: "dhyom-fulfillment-webhook" });
}

export async function POST(req: NextRequest) {
  // ── 1. Verify token ────────────────────────────────────────────────────────
  const expectedToken = process.env.SHIPROCKET_WEBHOOK_TOKEN;

  if (expectedToken) {
    // Accept token from x-api-key, x-webhook-token, Authorization: Bearer, or ?token=
    const authHeader  = req.headers.get("authorization") ?? "";
    const headerToken = req.headers.get("x-api-key")
                     ?? req.headers.get("x-webhook-token")
                     ?? "";
    const queryToken  = new URL(req.url).searchParams.get("token") ?? "";
    const incoming    = authHeader.replace(/^bearer\s+/i, "") || headerToken || queryToken;

    if (!incoming || incoming !== expectedToken) {
      console.warn("[fulfillment-webhook] Unauthorized — token mismatch");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn("[fulfillment-webhook] SHIPROCKET_WEBHOOK_TOKEN not set — accepting without verification");
  }

  // ── 2. Parse payload ───────────────────────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Shiprocket sends AWB as "awb" or "awb_code"; order_id as "order_id" (their internal id)
  const awb            = (payload.awb ?? payload.awb_code ?? "") as string;
  const srOrderId      = String(payload.order_id ?? "");
  const rawStatus      = (payload.current_status ?? payload.status ?? "") as string;
  const courierName    = (payload.courier_name ?? "") as string;

  if (!rawStatus) {
    return NextResponse.json({ ok: true, note: "no status in payload" });
  }

  const shippingStatus = normaliseStatus(rawStatus);
  const orderStatus    = toOrderStatus(shippingStatus);

  console.log(`[shiprocket-webhook] AWB=${awb} srOrderId=${srOrderId} rawStatus="${rawStatus}" → shipping_status="${shippingStatus}"`);

  // ── 3. Find the order ──────────────────────────────────────────────────────
  const sb = adminClient();
  let orderId: string | null = null;

  // Try AWB first (most reliable), then Shiprocket order_id
  if (awb) {
    const { data } = await sb.from("orders").select("id").eq("awb_number", awb).maybeSingle();
    orderId = data?.id ?? null;
  }
  if (!orderId && srOrderId) {
    const { data } = await sb.from("orders").select("id").eq("shiprocket_order_id", srOrderId).maybeSingle();
    orderId = data?.id ?? null;
  }

  if (!orderId) {
    console.warn(`[shiprocket-webhook] No order found for AWB="${awb}" srOrderId="${srOrderId}"`);
    return NextResponse.json({ ok: true, note: "order not found — ignored" });
  }

  // ── 4. Update order ────────────────────────────────────────────────────────
  const updates: Record<string, string> = { shipping_status: shippingStatus };
  if (orderStatus) updates.order_status = orderStatus;
  if (courierName) updates.courier_name = courierName;

  const { error } = await sb.from("orders").update(updates).eq("id", orderId);
  if (error) {
    console.error("[shiprocket-webhook] DB update failed:", error);
    // Still return 200 so Shiprocket doesn't retry endlessly
    return NextResponse.json({ ok: false, error: error.message });
  }

  console.log(`[shiprocket-webhook] Updated order ${orderId}: shipping_status="${shippingStatus}"${orderStatus ? ` order_status="${orderStatus}"` : ""}`);
  return NextResponse.json({ ok: true, shipping_status: shippingStatus });
}
