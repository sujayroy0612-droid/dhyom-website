"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";

interface RzpOpts { key: string; amount: number; currency: string; name: string; description: string; order_id: string; prefill: { name: string; email: string; contact: string }; theme: { color: string }; handler(r: { razorpay_payment_id: string }): void; modal: { ondismiss(): void } }
type RzpCtor = new (o: RzpOpts) => { open(): void };

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window !== "undefined" && window.Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

interface OriginalOrder {
  order_number: string;
  first_name: string;
  last_name: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  shipping_street: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;
  items: Array<{ id: string; name: string; price: number; quantity: number; category?: string; label: string; imageUrl: string }>;
  payment_method: "cod" | "online";
  subtotal: number;
  total: number;
  shipping_fee: number;
}

interface OfferProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  image_url: string | null;
  category: string;
}

export default function OTOPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const router = useRouter();

  const [order,    setOrder]    = useState<OriginalOrder | null>(null);
  const [product,  setProduct]  = useState<OfferProduct | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [err,      setErr]      = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: o, error: oErr } = await supabase
        .from("orders")
        .select("order_number,first_name,last_name,customer_name,email,phone,address,shipping_street,shipping_city,shipping_state,shipping_pincode,items,payment_method,subtotal,total,shipping_fee")
        .eq("order_number", orderNumber)
        .single();

      if (oErr || !o) { router.replace(`/order-confirmation/${orderNumber}`); return; }
      setOrder(o as OriginalOrder);

      const primaryProductId = ((o.items as {id?: string}[])[0]?.id) ?? "";
      if (!primaryProductId) { router.replace(`/checkout/downsell/${orderNumber}`); return; }

      const funnelRes = await fetch(`/api/funnel-bump?stage=oto&productId=${encodeURIComponent(primaryProductId)}`);
      const { product: p } = await funnelRes.json();
      if (!p) { router.replace(`/checkout/downsell/${orderNumber}`); return; }
      setProduct(p as OfferProduct);
      setLoading(false);
    }
    load();
  }, [orderNumber, router]);

  async function handleAccept() {
    if (!order || !product) return;
    setAccepting(true);
    setErr(null);

    try {
      // Create Razorpay payment order for OTO amount
      const orderRes = await fetch("/api/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ amount: product.price, orderNumber: order.order_number }),
      });
      if (!orderRes.ok) throw new Error("payment-init");
      const { razorpayOrderId } = await orderRes.json();

      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("gateway-unavailable");

      const rzp = new (window.Razorpay as unknown as RzpCtor)({
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount:      Math.round(product.price * 100),
        currency:    "INR",
        name:        "Dhyom",
        description: product.name,
        order_id:    razorpayOrderId,
        prefill:     { name: order.customer_name, email: order.email, contact: order.phone },
        theme:       { color: "#3D1428" },
        handler: async (response) => {
          // Payment succeeded — add OTO item to existing order
          const addRes = await fetch("/api/create-upsell-order", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ order, product, razorpay_payment_id: response.razorpay_payment_id }),
          });
          if (!addRes.ok) {
            setErr(`Payment received (ID: ${response.razorpay_payment_id}) but order update failed. Please contact us.`);
            setAccepting(false);
            return;
          }
          router.push(`/order-confirmation/${order.order_number}`);
        },
        modal: {
          ondismiss: () => {
            // Payment dismissed — treat as decline, go to downsell
            setAccepting(false);
            router.push(`/checkout/downsell/${order.order_number}`);
          },
        },
      });
      rzp.open();
    } catch {
      setErr("Unable to open payment. Please try again.");
      setAccepting(false);
    }
  }

  function handleDecline() {
    if (order) router.push(`/checkout/downsell/${order.order_number}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black-plum flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
      </div>
    );
  }

  if (!order || !product) return null;

  const originalName = order.items[0]?.name ?? "your selection";

  return (
    <div className="min-h-screen bg-black-plum">
      <div className="pt-24 pb-20 max-w-xl mx-auto px-6">

        <div className="text-center mb-10">
          <p className="font-display text-[0.52rem] tracking-[0.26em] uppercase text-[rgba(196,163,115,0.40)] mb-3">
            One thought, before you go
          </p>
          <h1 className="font-display text-ivory leading-tight" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", letterSpacing: "0.05em" }}>
            Since you&rsquo;re bringing home
            <br />
            <span className="text-brass">{originalName}</span>
          </h1>
          <div className="mt-5 mx-auto w-10 h-px bg-[rgba(196,163,115,0.28)]" />
          <p className="mt-5 font-body font-light italic text-[rgba(245,237,224,0.42)] text-base leading-[1.85]">
            You may also love what comes alongside it.
          </p>
        </div>

        <div className="bg-damson border border-[rgba(196,163,115,0.22)] rounded-[6px] overflow-hidden mb-8">
          {product.image_url && (
            <div className="aspect-[3/2] relative bg-[#270b1b]">
              <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="576px" />
            </div>
          )}
          <div className="p-7">
            <h2 className="font-display text-ivory mb-2" style={{ fontSize: "1.1rem", letterSpacing: "0.05em" }}>{product.name}</h2>
            <p className="font-display text-brass mb-4" style={{ fontSize: "1rem", letterSpacing: "0.04em" }}>₹{product.price.toLocaleString("en-IN")}</p>
            {product.description && (
              <p className="font-body font-light italic text-[rgba(245,237,224,0.50)] text-[0.92rem] leading-[1.85]">{product.description}</p>
            )}
          </div>
        </div>

        {err && <p className="font-body font-light text-[rgba(205,75,75,0.68)] text-[0.84rem] mb-5 text-center">{err}</p>}

        <div className="flex flex-col gap-4 items-center">
          <button
            type="button"
            onClick={handleAccept}
            disabled={accepting}
            className="w-full flex items-center justify-center gap-2.5 font-display text-[0.65rem] tracking-[0.22em] uppercase bg-brass text-ink border border-brass hover:bg-[#d4b383] hover:border-[#d4b383] rounded-[3px] py-4 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? "Opening payment…" : `Yes — Add for ₹${product.price.toLocaleString("en-IN")}`}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={accepting}
            className="font-display text-[0.56rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.38)] hover:text-[rgba(196,163,115,0.65)] transition-colors duration-200 disabled:opacity-40 py-1"
          >
            No thanks, continue
          </button>
        </div>

      </div>
    </div>
  );
}
