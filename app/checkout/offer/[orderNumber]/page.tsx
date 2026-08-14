"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";

/* Category bought → category to offer (higher-ticket complementary) */
const OTO_MAP: Record<string, string> = {
  candle:             "gift",
  idol:               "gift",
  bracelet:           "gift",
  gift:               "candle",
  "pooja-essentials": "candle",
};

function generateOrderNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `DHYOM-${s}`;
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
        .select("order_number,first_name,last_name,customer_name,email,phone,address,shipping_street,shipping_city,shipping_state,shipping_pincode,items,payment_method,subtotal")
        .eq("order_number", orderNumber)
        .single();

      if (oErr || !o) { router.replace(`/order-confirmation/${orderNumber}`); return; }
      setOrder(o as OriginalOrder);

      const primaryCat = ((o.items as {category?: string}[])[0]?.category) ?? "candle";
      const offerCat   = OTO_MAP[primaryCat] ?? "gift";

      const { data: p } = await supabase
        .from("products")
        .select("id,name,price,description,image_url,category")
        .eq("category", offerCat)
        .eq("is_visible", true)
        .order("price", { ascending: false })
        .limit(1)
        .single();

      if (!p) { router.replace(`/order-confirmation/${orderNumber}`); return; }
      setProduct(p as OfferProduct);
      setLoading(false);
    }
    load();
  }, [orderNumber, router]);

  async function handleAccept() {
    if (!order || !product) return;
    setAccepting(true);
    const newNum = generateOrderNumber();
    const { error: insertErr } = await supabase.from("orders").insert({
      order_number:        newNum,
      parent_order_number: order.order_number,
      customer_id:         null,
      customer_name:       order.customer_name,
      first_name:          order.first_name,
      last_name:           order.last_name,
      email:               order.email,
      phone:               order.phone,
      address:             order.address,
      shipping_street:     order.shipping_street,
      shipping_city:       order.shipping_city,
      shipping_state:      order.shipping_state,
      shipping_pincode:    order.shipping_pincode,
      items: [{ id: product.id, name: product.name, price: product.price, quantity: 1, label: "", imageUrl: product.image_url ?? "", category: product.category }],
      subtotal:        product.price,
      shipping_fee:    0,
      discount:        0,
      total:           product.price,
      payment_method:  order.payment_method,
      payment_status:  "pending",
      order_status:    "pending",
    });
    if (insertErr) { setErr("Something went wrong. Please continue to your order."); setAccepting(false); return; }
    router.push(`/order-confirmation/${order.order_number}`);
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
            {accepting ? "Adding to your order..." : "Add to My Order"}
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
