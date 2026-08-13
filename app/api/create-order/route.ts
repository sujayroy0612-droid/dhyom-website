import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { amount, orderNumber } = await req.json();

    if (!amount || !orderNumber) {
      return NextResponse.json({ error: "Missing amount or orderNumber" }, { status: 400 });
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!;
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // paise
        currency: "INR",
        receipt: orderNumber,
      }),
    });

    if (!rzpRes.ok) {
      const err = await rzpRes.json();
      return NextResponse.json(
        { error: err.error?.description ?? "Razorpay order creation failed" },
        { status: rzpRes.status }
      );
    }

    const data = await rzpRes.json();
    return NextResponse.json({
      razorpayOrderId: data.id,
      amount: data.amount,
      currency: data.currency,
    });
  } catch (err) {
    console.error("[create-order]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
