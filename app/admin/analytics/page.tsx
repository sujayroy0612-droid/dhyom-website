"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Order {
  total: number;
  order_status: string;
  items: { id: string; name: string; quantity: number }[];
  created_at: string;
}

interface DayTotal { date: string; total: number }
interface TopProduct { name: string; units: number }
interface StatusBreakdown { status: string; count: number }

export default function AnalyticsPage() {
  const [daily,    setDaily]    = useState<DayTotal[]>([]);
  const [top,      setTop]      = useState<TopProduct[]>([]);
  const [statuses, setStatuses] = useState<StatusBreakdown[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [totalRev, setTotalRev] = useState(0);
  const [totalOrd, setTotalOrd] = useState(0);

  useEffect(() => {
    const since = new Date();
    since.setDate(since.getDate() - 29);

    supabase
      .from("orders")
      .select("total, order_status, items, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const orders = (data ?? []) as Order[];
        setTotalOrd(orders.length);
        setTotalRev(orders.reduce((s, o) => s + (o.total ?? 0), 0));

        // Daily totals — last 30 days
        const dayMap: Record<string, number> = {};
        for (let i = 0; i < 30; i++) {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          dayMap[d.toISOString().slice(0, 10)] = 0;
        }
        orders.forEach(o => {
          const day = o.created_at.slice(0, 10);
          if (dayMap[day] !== undefined) dayMap[day] += o.total ?? 0;
        });
        setDaily(Object.entries(dayMap).map(([date, total]) => ({ date, total })));

        // Top products by units sold
        const unitMap: Record<string, number> = {};
        orders.forEach(o => {
          (o.items ?? []).forEach(item => {
            unitMap[item.name] = (unitMap[item.name] ?? 0) + (item.quantity ?? 1);
          });
        });
        const sorted = Object.entries(unitMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, units]) => ({ name, units }));
        setTop(sorted);

        // Status breakdown
        const stMap: Record<string, number> = {};
        orders.forEach(o => { stMap[o.order_status] = (stMap[o.order_status] ?? 0) + 1; });
        setStatuses(Object.entries(stMap).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count));

        setLoading(false);
      });
  }, []);

  const maxDay = Math.max(...daily.map(d => d.total), 1);
  const maxUnits = Math.max(...top.map(t => t.units), 1);

  return (
    <div className="px-8 pt-8 pb-16">
      <div className="mb-6">
        <p className="font-display text-[0.44rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.35)] mb-1">Last 30 Days</p>
        <h1 className="font-display text-ivory" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>Analytics</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { label: "Orders (30d)",  value: totalOrd },
              { label: "Revenue (30d)", value: `₹${totalRev.toLocaleString("en-IN")}` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] px-5 py-5">
                <p className="font-display text-[0.42rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.35)] mb-2">{label}</p>
                <p className="font-display text-brass" style={{ fontSize: "1.6rem", letterSpacing: "0.04em" }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Revenue chart */}
          <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] px-6 py-6 mb-6">
            <p className="font-display text-ivory mb-5" style={{ fontSize: "0.78rem", letterSpacing: "0.08em" }}>
              Daily Revenue — Last 30 Days
            </p>
            {daily.every(d => d.total === 0) ? (
              <p className="font-body font-light italic text-[rgba(245,237,224,0.25)] text-sm py-6 text-center">No revenue data yet.</p>
            ) : (
              <div className="flex items-end gap-[3px] h-32">
                {daily.map(({ date, total }) => {
                  const height = total === 0 ? 2 : Math.max(4, Math.round((total / maxDay) * 128));
                  const label  = new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center justify-end group relative" title={`${label}: ₹${total.toLocaleString("en-IN")}`}>
                      <div
                        className="w-full rounded-t-[2px] bg-brass opacity-60 group-hover:opacity-100 transition-opacity duration-150"
                        style={{ height: `${height}px` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-10">
                        <div className="bg-[#12060e] border border-[rgba(196,163,115,0.25)] rounded-[3px] px-2 py-1 whitespace-nowrap">
                          <p className="font-display text-brass text-[0.50rem] tracking-wide">₹{total.toLocaleString("en-IN")}</p>
                          <p className="font-body font-light text-[rgba(245,237,224,0.40)] text-[0.48rem]">{label}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top products */}
            <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] px-6 py-6">
              <p className="font-display text-ivory mb-5" style={{ fontSize: "0.78rem", letterSpacing: "0.08em" }}>
                Top 5 Products by Units Sold
              </p>
              {top.length === 0 ? (
                <p className="font-body font-light italic text-[rgba(245,237,224,0.25)] text-sm py-4 text-center">No sales data yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {top.map(({ name, units }, i) => (
                    <div key={name}>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="font-body font-light text-[rgba(245,237,224,0.60)] text-xs flex items-center gap-2">
                          <span className="font-display text-[rgba(196,163,115,0.40)] text-[0.58rem]">{i + 1}</span>
                          {name}
                        </span>
                        <span className="font-display text-brass text-[0.70rem] tracking-wide">{units} units</span>
                      </div>
                      <div className="h-1 bg-[rgba(196,163,115,0.08)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brass opacity-60 rounded-full"
                          style={{ width: `${Math.round((units / maxUnits) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status breakdown */}
            <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] px-6 py-6">
              <p className="font-display text-ivory mb-5" style={{ fontSize: "0.78rem", letterSpacing: "0.08em" }}>
                Order Status Breakdown
              </p>
              {statuses.length === 0 ? (
                <p className="font-body font-light italic text-[rgba(245,237,224,0.25)] text-sm py-4 text-center">No orders yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {statuses.map(({ status, count }) => {
                    const pct = Math.round((count / totalOrd) * 100);
                    return (
                      <div key={status}>
                        <div className="flex justify-between items-baseline mb-1.5">
                          <span className="font-display text-[0.46rem] tracking-[0.12em] uppercase text-[rgba(245,237,224,0.55)]">{status}</span>
                          <span className="font-body font-light text-[rgba(245,237,224,0.40)] text-xs">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1 bg-[rgba(196,163,115,0.08)] rounded-full overflow-hidden">
                          <div className="h-full bg-[rgba(196,163,115,0.45)] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
