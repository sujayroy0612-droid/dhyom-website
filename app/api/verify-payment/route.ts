import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      razorpayOrderId:   string;
      razorpayPaymentId: string;
      razorpaySignature: string;
      base:              Record<string, unknown>;
      amountToCharge:    number;
      notifyData:        Record<string, unknown>;
    };

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, base, amountToCharge, notifyData } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !base || amountToCharge == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── 1. Verify Razorpay HMAC signature ─────────────────────────────────
    // Razorpay signs razorpay_order_id + "|" + razorpay_payment_id with the
    // key secret. Any mismatch means the payment response was not from Razorpay.
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const expectedSig = createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSig !== razorpaySignature) {
      console.error("[verify-payment] Signature mismatch — possible tampered response");
      return NextResponse.json({ error: "Payment signature verification failed" }, { status: 400 });
    }

    // ── 2. Verify amount against Razorpay's own order record ──────────────
    // Prevents a scenario where a real payment for ₹1 is used to insert an
    // order claiming a higher prepaid amount.
    const keyId  = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!;
    const creds  = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const rzpRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}`, {
      headers: { Authorization: `Basic ${creds}` },
    });

    if (!rzpRes.ok) {
      console.error("[verify-payment] Could not fetch Razorpay order:", rzpRes.status);
      return NextResponse.json({ error: "Could not verify payment with gateway" }, { status: 502 });
    }

    const rzpOrder = await rzpRes.json() as { amount: number; status: string };

    // Razorpay stores amount in paise (integer); compare exactly
    const expectedPaise = Math.round(amountToCharge * 100);
    if (rzpOrder.amount !== expectedPaise) {
      console.error(`[verify-payment] Amount mismatch: rzp=${rzpOrder.amount} client=${expectedPaise}`);
      return NextResponse.json({ error: "Payment amount does not match" }, { status: 400 });
    }

    // ── 3. Insert order via service role ──────────────────────────────────
    const sb = adminClient();
    const { error: insertErr } = await sb.from("orders").insert({
      ...base,
      payment_status:      "paid",
      razorpay_order_id:   razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
    });

    if (insertErr) {
      console.error("[verify-payment] Order insert error:", insertErr);
      return NextResponse.json({ error: "Order could not be saved" }, { status: 500 });
    }

    // ── 4. Fire founder notification (server-to-server, non-blocking) ─────
    const host     = req.headers.get("host") ?? "dhyom.in";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    void fetch(`${protocol}://${host}/api/notify-order`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.CRON_SECRET ?? ""}`,
      },
      body: JSON.stringify(notifyData),
    }).catch((err) => console.error("[verify-payment] notify-order error:", err));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[verify-payment]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
