"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

type OrderItem = { name: string; quantity: number; price: number; label?: string };

type Order = {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
  order_status: string;
  payment_status: string;
  items: OrderItem[];
};

function statusColor(s: string) {
  if (s === "delivered") return "text-[rgba(100,215,100,0.80)]";
  if (s === "shipped")   return "text-[rgba(100,180,215,0.80)]";
  if (s === "cancelled") return "text-[rgba(210,80,80,0.70)]";
  return "text-[rgba(196,163,115,0.65)]";
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("id,order_number,created_at,total,order_status,payment_status,items")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setOrders((data ?? []) as Order[]); setLoading(false); });
  }, [user]);

  if (loading) {
    return <p className="font-body font-light text-[rgba(245,237,224,0.38)] text-[0.95rem]">Loading orders…</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="py-12 flex flex-col items-start gap-4">
        <p className="font-display text-[0.62rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.38)]">No orders yet</p>
        <p className="font-body font-light italic text-[rgba(245,237,224,0.42)] text-[0.95rem] leading-[1.85]">
          Orders placed while signed in will appear here.
        </p>
        <Link href="/shop" className="mt-2 font-display text-[0.60rem] tracking-[0.20em] uppercase text-brass border border-[rgba(196,163,115,0.35)] rounded-full px-7 py-2.5 hover:bg-[rgba(196,163,115,0.07)] transition-all duration-200">
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {orders.map((o) => (
        <div key={o.id} className="bg-damson border border-[rgba(196,163,115,0.13)] rounded-[6px] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[rgba(196,163,115,0.10)]">
            <div>
              <p className="font-display text-[0.52rem] tracking-[0.20em] uppercase text-[rgba(196,163,115,0.45)]">
                {o.order_number}
              </p>
              <p className="font-body font-light text-[rgba(245,237,224,0.38)] text-[0.78rem] mt-0.5">
                {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`font-display text-[0.52rem] tracking-[0.16em] uppercase ${statusColor(o.order_status)}`}>
                {o.order_status}
              </span>
              <span className="font-display text-brass" style={{ fontSize: "0.95rem", letterSpacing: "0.04em" }}>
                ₹{Number(o.total).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <div className="px-5 py-4 flex flex-col gap-2">
            {(o.items ?? []).map((item, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
                <p className="font-body font-light text-[rgba(245,237,224,0.62)] text-[0.88rem]">
                  {item.name}{item.label ? ` (${item.label})` : ""} × {item.quantity}
                </p>
                <p className="font-display text-[rgba(196,163,115,0.60)] text-[0.82rem] flex-shrink-0">
                  ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
