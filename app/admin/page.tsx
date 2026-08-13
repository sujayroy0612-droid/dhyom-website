"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

interface Order {
  order_number: string;
  first_name: string;
  last_name: string;
  total: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
}

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  revenue: number;
  lowStock: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending:    "text-[rgba(220,160,60,0.85)]  bg-[rgba(220,160,60,0.08)]",
  processing: "text-[rgba(100,160,220,0.85)] bg-[rgba(100,160,220,0.08)]",
  packed:     "text-[rgba(140,100,220,0.85)] bg-[rgba(140,100,220,0.08)]",
  shipped:    "text-[rgba(60,160,220,0.85)]  bg-[rgba(60,160,220,0.08)]",
  delivered:  "text-[rgba(80,200,120,0.85)]  bg-[rgba(80,200,120,0.08)]",
  cancelled:  "text-[rgba(200,80,80,0.75)]   bg-[rgba(200,80,80,0.06)]",
};

export default function AdminDashboard() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [ordersRes, productsRes] = await Promise.all([
        supabase.from("orders").select("order_number, first_name, last_name, total, order_status, payment_status, payment_method, created_at").order("created_at", { ascending: false }),
        supabase.from("products").select("stock"),
      ]);

      const all: Order[] = (ordersRes.data ?? []) as Order[];
      const products = (productsRes.data ?? []) as { stock: number }[];

      const pending  = all.filter(o => o.order_status === "pending").length;
      const revenue  = all
        .filter(o => ["delivered", "shipped", "packed", "processing"].includes(o.order_status))
        .reduce((s, o) => s + (o.total ?? 0), 0);
      const lowStock = products.filter(p => (p.stock ?? 0) < 10).length;

      setStats({ totalOrders: all.length, pendingOrders: pending, revenue, lowStock });
      setOrders(all.slice(0, 5));
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="px-8 pt-8 pb-16">
      <div className="mb-8">
        <p className="font-display text-[0.44rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.35)] mb-1">
          Overview
        </p>
        <h1 className="font-display text-ivory" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>
          Dashboard
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
            {[
              { label: "Total Orders",   value: stats!.totalOrders,              color: "text-ivory" },
              { label: "Pending Orders", value: stats!.pendingOrders,            color: "text-[rgba(220,160,60,0.85)]",  badge: stats!.pendingOrders > 0 },
              { label: "Revenue",        value: `₹${stats!.revenue.toLocaleString("en-IN")}`, color: "text-brass" },
              { label: "Low Stock",      value: stats!.lowStock,                 color: stats!.lowStock > 0 ? "text-[rgba(200,80,80,0.80)]" : "text-[rgba(80,200,120,0.80)]" },
            ].map(({ label, value, color, badge }) => (
              <div key={label} className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] px-5 py-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-display text-[0.42rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.38)]">
                    {label}
                  </p>
                  {badge && (
                    <span className="w-2 h-2 rounded-full bg-[rgba(220,160,60,0.70)] animate-pulse" />
                  )}
                </div>
                <p className={`font-display ${color}`} style={{ fontSize: "1.6rem", letterSpacing: "0.04em" }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Recent orders table */}
          <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(196,163,115,0.08)]">
              <h2 className="font-display text-ivory" style={{ fontSize: "0.78rem", letterSpacing: "0.08em" }}>
                Recent Orders
              </h2>
              <Link href="/admin/orders" className="font-display text-[0.46rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.50)] hover:text-brass transition-colors">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-[rgba(196,163,115,0.06)]">
              {orders.length === 0 ? (
                <p className="px-5 py-8 font-body font-light italic text-[rgba(245,237,224,0.28)] text-sm text-center">
                  No orders yet.
                </p>
              ) : orders.map((o) => (
                <div key={o.order_number} className="grid grid-cols-[1fr_160px_100px_90px_90px] gap-3 items-center px-5 py-3.5 hover:bg-[rgba(196,163,115,0.03)] transition-colors">
                  <div>
                    <p className="font-display text-ivory" style={{ fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                      {o.order_number}
                    </p>
                    <p className="font-body font-light text-[rgba(245,237,224,0.38)] text-[0.72rem] mt-0.5">
                      {o.first_name} {o.last_name}
                    </p>
                  </div>
                  <span className="font-display text-brass" style={{ fontSize: "0.82rem", letterSpacing: "0.04em" }}>
                    ₹{o.total.toLocaleString("en-IN")}
                  </span>
                  <span className={`font-display text-[0.44rem] tracking-[0.12em] uppercase px-2 py-1 rounded-[3px] ${STATUS_COLORS[o.order_status] ?? "text-[rgba(245,237,224,0.40)] bg-transparent"}`}>
                    {o.order_status}
                  </span>
                  <span className="font-display text-[0.44rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.38)]">
                    {o.payment_method === "cod" ? "COD" : "Online"}
                  </span>
                  <span className="font-body font-light text-[rgba(245,237,224,0.28)] text-[0.70rem]">
                    {new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
