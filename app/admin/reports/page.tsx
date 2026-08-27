"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Shared styles ──────────────────────────────────────────────────────────
const CARD  = "bg-[#1f0b17] border border-[rgba(196,163,115,0.12)] rounded-[6px] p-5";
const LABEL = "font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]";
const TH    = "px-3 py-2 text-left font-display text-[0.44rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.45)] border-b border-[rgba(196,163,115,0.10)]";
const TD    = "px-3 py-2.5 font-body font-light text-[rgba(245,237,224,0.72)] text-[0.82rem] border-b border-[rgba(196,163,115,0.06)]";
const TDr   = TD + " text-right";
const FIELD = "bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.20)] rounded-[3px] px-3 py-2 font-body font-light text-ivory text-[0.88rem] focus:outline-none focus:border-[rgba(196,163,115,0.48)]";
const BTN   = "font-display text-[0.52rem] tracking-[0.18em] uppercase text-brass border border-[rgba(196,163,115,0.30)] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.55)] rounded-[3px] px-4 py-2 transition-all duration-150";

function inr(n: number) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── CSV export ─────────────────────────────────────────────────────────────
function exportCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const lines = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

// ─── Simple SVG line chart ───────────────────────────────────────────────────
function LineChart({ data, color = "#c4a373" }: { data: { date: string; value: number }[]; color?: string }) {
  if (!data.length) return <div className="h-32 flex items-center justify-center text-[rgba(245,237,224,0.20)] text-sm">No data</div>;
  const W = 560; const H = 120; const PL = 52; const PR = 12; const PT = 10; const PB = 28;
  const vals = data.map(d => d.value);
  const maxV = Math.max(...vals, 1); const minV = 0;
  const plotW = W - PL - PR; const plotH = H - PT - PB;
  const xs = data.map((_, i) => PL + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2));
  const ys = vals.map(v => PT + plotH - ((v - minV) / (maxV - minV)) * plotH);
  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const ticks = [0, 0.5, 1].map(t => ({ y: PT + plotH * (1 - t), v: Math.round((minV + (maxV - minV) * t)) }));
  const xLabels = data.filter((_, i) => data.length <= 8 || i % Math.ceil(data.length / 7) === 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
      {ticks.map(t => (
        <g key={t.v}>
          <line x1={PL} y1={t.y} x2={W - PR} y2={t.y} stroke="rgba(196,163,115,0.08)" strokeWidth={1} />
          <text x={PL - 5} y={t.y + 4} textAnchor="end" fontSize={8} fill="rgba(245,237,224,0.30)">{t.v.toLocaleString("en-IN")}</text>
        </g>
      ))}
      {data.length > 1 && (
        <>
          <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
          <polygon points={`${xs[0]},${PT + plotH} ${pts} ${xs[xs.length - 1]},${PT + plotH}`} fill={color} fillOpacity={0.07} />
        </>
      )}
      {data.map((d, i) => (
        <circle key={i} cx={xs[i]} cy={ys[i]} r={2} fill={color} />
      ))}
      {xLabels.map(d => {
        const i = data.indexOf(d);
        return <text key={i} x={xs[i]} y={H - 4} textAnchor="middle" fontSize={7.5} fill="rgba(245,237,224,0.28)">{d.date.slice(5)}</text>;
      })}
    </svg>
  );
}

// ─── Date range picker ───────────────────────────────────────────────────────
function DateRange({ from, to, onChange }: { from: string; to: string; onChange: (f: string, t: string) => void }) {
  const presets = [
    { label: "7d",   days: 7   },
    { label: "30d",  days: 30  },
    { label: "90d",  days: 90  },
    { label: "365d", days: 365 },
  ];
  function applyPreset(days: number) {
    const t = new Date().toISOString().slice(0, 10);
    const f = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    onChange(f, t);
  }
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="flex items-center gap-2">
        <label className={LABEL + " whitespace-nowrap"}>From</label>
        <input type="date" value={from} onChange={e => onChange(e.target.value, to)} className={FIELD + " text-[0.82rem] py-1.5 px-2"} style={{ colorScheme: "dark" }} />
      </div>
      <div className="flex items-center gap-2">
        <label className={LABEL + " whitespace-nowrap"}>To</label>
        <input type="date" value={to} onChange={e => onChange(from, e.target.value)} className={FIELD + " text-[0.82rem] py-1.5 px-2"} style={{ colorScheme: "dark" }} />
      </div>
      <div className="flex gap-1.5">
        {presets.map(p => (
          <button key={p.days} onClick={() => applyPreset(p.days)} className="font-display text-[0.44rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.55)] border border-[rgba(196,163,115,0.18)] rounded px-2.5 py-1.5 hover:border-[rgba(196,163,115,0.45)] hover:text-brass transition-all">{p.label}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={CARD + " flex flex-col gap-1"}>
      <p className={LABEL}>{label}</p>
      <p className="font-display text-ivory text-xl leading-tight">{value}</p>
      {sub && <p className="font-body font-light text-[rgba(245,237,224,0.35)] text-[0.72rem]">{sub}</p>}
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner() {
  return <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />;
}

// ══════════════════════════════════════════════════════════════════════════════
// SALES TAB
// ══════════════════════════════════════════════════════════════════════════════
interface SalesData {
  revenueByDay: { date: string; revenue: number; orders: number }[];
  revenueByProduct: { id: string; name: string; units: number; revenue: number; avgPrice: number }[];
  revenueByCategory: { category: string; units: number; revenue: number; avgPrice: number }[];
  aovByDay: { date: string; aov: number }[];
  paymentSplit: { prepaid: number; prepaidOrders: number; partial_cod: number; codOrders: number };
  totals: { revenue: number; orders: number; units: number };
}

function SalesTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/reports/sales?from=${from}&to=${to}`);
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center gap-3 py-12 text-[rgba(245,237,224,0.35)]"><Spinner /><span className="font-body font-light text-sm">Loading sales data…</span></div>;
  if (err)     return <p className="text-red-400 text-sm py-8">{err}</p>;
  if (!data)   return null;

  const aov = data.totals.orders ? data.totals.revenue / data.totals.orders : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Revenue" value={inr(data.totals.revenue)} sub={`${data.totals.orders} orders`} />
        <Stat label="Orders" value={String(data.totals.orders)} />
        <Stat label="Units Sold" value={String(data.totals.units)} />
        <Stat label="Avg Order Value" value={inr(aov)} />
      </div>

      {/* Revenue over time chart */}
      <div className={CARD}>
        <p className="font-display text-ivory text-[0.72rem] tracking-[0.08em] mb-4">Revenue Over Time</p>
        <LineChart data={data.revenueByDay.map(d => ({ date: d.date, value: d.revenue }))} />
        <div className="mt-2 flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[#c4a373]" />
          <span className="font-display text-[0.44rem] tracking-[0.1em] uppercase text-[rgba(245,237,224,0.35)]">Daily Revenue (₹)</span>
        </div>
      </div>

      {/* AOV trend */}
      <div className={CARD}>
        <p className="font-display text-ivory text-[0.72rem] tracking-[0.08em] mb-4">Average Order Value Trend</p>
        <LineChart data={data.aovByDay.map(d => ({ date: d.date, value: d.aov }))} color="#8fdfba" />
      </div>

      {/* Payment split */}
      <div className={CARD}>
        <p className="font-display text-ivory text-[0.72rem] tracking-[0.08em] mb-4">Payment Split</p>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className={LABEL}>Prepaid (Razorpay)</p>
            <p className="font-display text-ivory text-lg mt-1">{inr(data.paymentSplit.prepaid)}</p>
            <p className="font-body font-light text-[rgba(245,237,224,0.35)] text-[0.72rem]">{data.paymentSplit.prepaidOrders} orders</p>
          </div>
          <div>
            <p className={LABEL}>Partial COD</p>
            <p className="font-display text-ivory text-lg mt-1">{inr(data.paymentSplit.partial_cod)}</p>
            <p className="font-body font-light text-[rgba(245,237,224,0.35)] text-[0.72rem]">{data.paymentSplit.codOrders} orders</p>
          </div>
        </div>
        {/* Bar visual */}
        {(data.paymentSplit.prepaid + data.paymentSplit.partial_cod) > 0 && (() => {
          const total = data.paymentSplit.prepaid + data.paymentSplit.partial_cod;
          const pct = (data.paymentSplit.prepaid / total) * 100;
          return (
            <div className="mt-4 flex rounded-full overflow-hidden h-2">
              <div style={{ width: `${pct}%` }} className="bg-brass" />
              <div style={{ width: `${100 - pct}%` }} className="bg-[rgba(196,163,115,0.20)]" />
            </div>
          );
        })()}
      </div>

      {/* Revenue by product */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-display text-ivory text-[0.72rem] tracking-[0.08em]">Revenue by Product</p>
          <button className={BTN} onClick={() => exportCSV(
            ["Product", "Units Sold", "Revenue (₹)", "Avg Price (₹)"],
            data.revenueByProduct.map(r => [r.name, r.units, r.revenue, r.avgPrice]),
            `sales-by-product-${from}-${to}.csv`
          )}>Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className={TH}>Product</th><th className={TH + " text-right"}>Units</th><th className={TH + " text-right"}>Revenue</th><th className={TH + " text-right"}>Avg Price</th></tr></thead>
            <tbody>
              {data.revenueByProduct.map((r, i) => (
                <tr key={i}>
                  <td className={TD}>{r.name}</td>
                  <td className={TDr}>{r.units}</td>
                  <td className={TDr}>{inr(r.revenue)}</td>
                  <td className={TDr}>{inr(r.avgPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue by category */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-display text-ivory text-[0.72rem] tracking-[0.08em]">Revenue by Category</p>
          <button className={BTN} onClick={() => exportCSV(
            ["Category", "Units Sold", "Revenue (₹)", "Avg Price (₹)"],
            data.revenueByCategory.map(r => [r.category, r.units, r.revenue, r.avgPrice]),
            `sales-by-category-${from}-${to}.csv`
          )}>Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className={TH}>Category</th><th className={TH + " text-right"}>Units</th><th className={TH + " text-right"}>Revenue</th><th className={TH + " text-right"}>Avg Price</th></tr></thead>
            <tbody>
              {data.revenueByCategory.map((r, i) => (
                <tr key={i}>
                  <td className={TD + " capitalize"}>{r.category}</td>
                  <td className={TDr}>{r.units}</td>
                  <td className={TDr}>{inr(r.revenue)}</td>
                  <td className={TDr}>{inr(r.avgPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS TAB
// ══════════════════════════════════════════════════════════════════════════════
interface CustomersData {
  newVsRepeat: { new_count: number; repeat_count: number; new_revenue: number; repeat_revenue: number };
  topCustomers: { email: string; name: string; orders: number; revenue: number; lastOrder: string }[];
  avgLTV: number;
  byState: { state: string; orders: number; revenue: number }[];
  totalCustomers: number;
  ordersInRange: number;
}

function CustomersTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<CustomersData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/reports/customers?from=${from}&to=${to}`);
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center gap-3 py-12 text-[rgba(245,237,224,0.35)]"><Spinner /><span className="font-body font-light text-sm">Loading customer data…</span></div>;
  if (err)     return <p className="text-red-400 text-sm py-8">{err}</p>;
  if (!data)   return null;

  const nr = data.newVsRepeat;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Customers" value={String(data.totalCustomers)} sub="All time" />
        <Stat label="Orders in Range" value={String(data.ordersInRange)} />
        <Stat label="New Customers" value={String(nr.new_count)} sub={`${inr(nr.new_revenue)} revenue`} />
        <Stat label="Avg Lifetime Value" value={inr(data.avgLTV)} sub="All time" />
      </div>

      {/* New vs Repeat */}
      <div className={CARD}>
        <p className="font-display text-ivory text-[0.72rem] tracking-[0.08em] mb-4">New vs Repeat (in selected range)</p>
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <p className={LABEL}>New Customers</p>
            <p className="font-display text-ivory text-2xl mt-1">{nr.new_count}</p>
            <p className="font-body font-light text-[rgba(245,237,224,0.35)] text-[0.72rem]">{inr(nr.new_revenue)} revenue</p>
          </div>
          <div>
            <p className={LABEL}>Repeat Customers</p>
            <p className="font-display text-ivory text-2xl mt-1">{nr.repeat_count}</p>
            <p className="font-body font-light text-[rgba(245,237,224,0.35)] text-[0.72rem]">{inr(nr.repeat_revenue)} revenue</p>
          </div>
        </div>
        {(nr.new_count + nr.repeat_count) > 0 && (() => {
          const pct = (nr.new_count / (nr.new_count + nr.repeat_count)) * 100;
          return (
            <div>
              <div className="flex rounded-full overflow-hidden h-2">
                <div style={{ width: `${pct}%` }} className="bg-[#8fdfba]" />
                <div style={{ width: `${100 - pct}%` }} className="bg-[rgba(196,163,115,0.25)]" />
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-display text-[0.40rem] tracking-[0.12em] uppercase text-[rgba(143,223,186,0.55)]">New {Math.round(pct)}%</span>
                <span className="font-display text-[0.40rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.45)]">Repeat {Math.round(100 - pct)}%</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Top customers */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-display text-ivory text-[0.72rem] tracking-[0.08em]">Top Customers (Lifetime)</p>
          <button className={BTN} onClick={() => exportCSV(
            ["Name", "Email", "Orders", "Lifetime Revenue (₹)", "Last Order"],
            data.topCustomers.map(c => [c.name, c.email, c.orders, c.revenue, c.lastOrder]),
            `top-customers-${from}-${to}.csv`
          )}>Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className={TH}>#</th><th className={TH}>Name</th><th className={TH}>Email</th>
              <th className={TH + " text-right"}>Orders</th><th className={TH + " text-right"}>Revenue</th><th className={TH + " text-right"}>Last Order</th>
            </tr></thead>
            <tbody>
              {data.topCustomers.map((c, i) => (
                <tr key={i}>
                  <td className={TD + " text-[rgba(196,163,115,0.45)]"}>{i + 1}</td>
                  <td className={TD}>{c.name || "—"}</td>
                  <td className={TD + " text-[rgba(245,237,224,0.40)]"}>{c.email}</td>
                  <td className={TDr}>{c.orders}</td>
                  <td className={TDr}>{inr(c.revenue)}</td>
                  <td className={TDr}>{c.lastOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Geographic spread */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-display text-ivory text-[0.72rem] tracking-[0.08em]">Orders by State</p>
          <button className={BTN} onClick={() => exportCSV(
            ["State", "Orders", "Revenue (₹)"],
            data.byState.map(r => [r.state, r.orders, r.revenue]),
            `geo-spread-${from}-${to}.csv`
          )}>Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className={TH}>State</th><th className={TH + " text-right"}>Orders</th><th className={TH + " text-right"}>Revenue</th></tr></thead>
            <tbody>
              {data.byState.map((r, i) => (
                <tr key={i}>
                  <td className={TD}>{r.state}</td>
                  <td className={TDr}>{r.orders}</td>
                  <td className={TDr}>{inr(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// P&L TAB
// ══════════════════════════════════════════════════════════════════════════════
interface AdSpendEntry { id: string; month: string; platform: string; amount: number; notes: string | null; created_at: string; }
interface PLData {
  revenue: number; cogs: number; packaging: number; shipping: number;
  gatewayFees: number; adSpend: number; netProfit: number;
  ordersCount: number;
  missingCostProducts: { id: string; name: string }[];
}

const PLATFORMS = ["Meta", "Amazon", "Flipkart", "Google", "Other"];

function PLTab({ from, to }: { from: string; to: string }) {
  const [pl, setPL]       = useState<PLData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]     = useState<string | null>(null);

  const [adEntries, setAdEntries]     = useState<AdSpendEntry[]>([]);
  const [adLoading, setAdLoading]     = useState(false);
  const [editingAd, setEditingAd]     = useState<string | null>(null);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [adForm, setAdForm] = useState({ month: currentMonth, platform: "Meta", amount: "", notes: "" });

  const loadPL = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/reports/pl?from=${from}&to=${to}`);
      if (!res.ok) throw new Error(await res.text());
      setPL(await res.json());
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  }, [from, to]);

  const loadAd = useCallback(async () => {
    setAdLoading(true);
    const res = await fetch("/api/admin/ad-spend");
    if (res.ok) setAdEntries(await res.json());
    setAdLoading(false);
  }, []);

  useEffect(() => { loadPL(); }, [loadPL]);
  useEffect(() => { loadAd(); }, [loadAd]);

  async function saveAd(e: React.FormEvent) {
    e.preventDefault();
    if (!adForm.amount) return;
    const body = { month: adForm.month, platform: adForm.platform, amount: Number(adForm.amount), notes: adForm.notes || undefined };
    if (editingAd) {
      await fetch("/api/admin/ad-spend", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingAd, ...body }) });
      setEditingAd(null);
    } else {
      await fetch("/api/admin/ad-spend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setAdForm({ month: currentMonth, platform: "Meta", amount: "", notes: "" });
    await loadAd();
    await loadPL();
  }

  async function deleteAd(id: string) {
    if (!confirm("Delete this ad spend entry?")) return;
    await fetch("/api/admin/ad-spend", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await loadAd();
    await loadPL();
  }

  function editAd(e: AdSpendEntry) {
    setEditingAd(e.id);
    setAdForm({ month: e.month, platform: e.platform, amount: String(e.amount), notes: e.notes ?? "" });
  }

  const plRows: { label: string; value: number; sub?: string; color?: string; bold?: boolean }[] = pl ? [
    { label: "Revenue",                        value: pl.revenue,     color: "#8fdfba" },
    { label: "− Cost of Goods (COGS)",          value: -pl.cogs,       sub: "cost_price × qty per line item" },
    { label: "− Packaging Cost",               value: -pl.packaging,  sub: "packaging_cost × qty per line item" },
    { label: "− Shipping Cost",                value: -pl.shipping,   sub: "actual Shiprocket rate per order" },
    { label: "− Payment Gateway Fees (~2%)",   value: -pl.gatewayFees,sub: "estimate — varies by payment method" },
    { label: "− Ad Spend",                     value: -pl.adSpend,    sub: "from entries below, months in range" },
    { label: "= Net Profit",                   value: pl.netProfit,   bold: true, color: pl.netProfit >= 0 ? "#8fdfba" : "#f87171" },
  ] : [];

  return (
    <div className="flex flex-col gap-8">

      {/* Missing cost warning */}
      {pl && pl.missingCostProducts.length > 0 && (
        <div className="bg-[rgba(220,160,50,0.08)] border border-[rgba(220,160,50,0.30)] rounded-[6px] px-5 py-4">
          <p className="font-display text-[0.58rem] tracking-[0.16em] uppercase text-[rgba(220,160,50,0.85)] mb-2">
            {pl.missingCostProducts.length} product{pl.missingCostProducts.length > 1 ? "s" : ""} missing cost price — P&L may be inaccurate
          </p>
          <p className="font-body font-light text-[rgba(245,237,224,0.45)] text-[0.78rem] mb-3">
            COGS and packaging costs will be understated until you fill in <em>Cost Price (COGS)</em> for these products in the Products admin.
          </p>
          <div className="flex flex-wrap gap-2">
            {pl.missingCostProducts.slice(0, 12).map(p => (
              <Link key={p.id} href="/admin/products" className="font-display text-[0.44rem] tracking-[0.12em] uppercase text-[rgba(220,160,50,0.70)] border border-[rgba(220,160,50,0.20)] rounded px-2 py-1 hover:border-[rgba(220,160,50,0.45)] transition-all">
                {p.name}
              </Link>
            ))}
            {pl.missingCostProducts.length > 12 && (
              <span className="font-display text-[0.44rem] tracking-[0.12em] uppercase text-[rgba(245,237,224,0.25)]">+ {pl.missingCostProducts.length - 12} more</span>
            )}
          </div>
        </div>
      )}

      {/* P&L table */}
      {loading ? (
        <div className="flex items-center gap-3 py-8 text-[rgba(245,237,224,0.35)]"><Spinner /><span className="font-body font-light text-sm">Calculating P&L…</span></div>
      ) : err ? (
        <p className="text-red-400 text-sm">{err}</p>
      ) : pl ? (
        <div className={CARD}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-display text-ivory text-[0.72rem] tracking-[0.08em]">P&L Breakdown</p>
              <p className="font-body font-light text-[rgba(245,237,224,0.30)] text-[0.70rem] mt-0.5">{pl.ordersCount} orders · {from} → {to}</p>
            </div>
            <button className={BTN} onClick={() => exportCSV(
              ["Line Item", "Amount (₹)", "Notes"],
              plRows.map(r => [r.label, r.value, r.sub ?? ""]),
              `pl-${from}-${to}.csv`
            )}>Export CSV</button>
          </div>
          <table className="w-full">
            <tbody>
              {plRows.map((r, i) => (
                <tr key={i} className={r.bold ? "border-t border-[rgba(196,163,115,0.18)]" : ""}>
                  <td className={TD + (r.bold ? " font-semibold" : "")}>
                    {r.label}
                    {r.sub && <span className="block font-body font-light text-[rgba(245,237,224,0.28)] text-[0.68rem] mt-0.5">{r.sub}</span>}
                  </td>
                  <td className={TDr + (r.bold ? " font-semibold text-base" : "")} style={{ color: r.color }}>
                    {r.value >= 0 ? inr(r.value) : `−${inr(Math.abs(r.value))}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Gross margin summary */}
          {pl.revenue > 0 && (
            <div className="mt-4 pt-4 border-t border-[rgba(196,163,115,0.10)] flex flex-wrap gap-6">
              <div>
                <p className={LABEL}>Gross Margin (before ad/shipping)</p>
                <p className="font-display text-ivory mt-0.5">{Math.round((pl.revenue - pl.cogs - pl.packaging) / pl.revenue * 100)}%</p>
              </div>
              <div>
                <p className={LABEL}>Net Margin</p>
                <p className="font-display mt-0.5" style={{ color: pl.netProfit >= 0 ? "#8fdfba" : "#f87171" }}>{Math.round(pl.netProfit / pl.revenue * 100)}%</p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Ad spend form */}
      <div className={CARD}>
        <p className="font-display text-ivory text-[0.72rem] tracking-[0.08em] mb-4">{editingAd ? "Edit Ad Spend Entry" : "Add Ad Spend Entry"}</p>
        <form onSubmit={saveAd} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Month</label>
            <input type="month" value={adForm.month} onChange={e => setAdForm(f => ({ ...f, month: e.target.value }))} className={FIELD} style={{ colorScheme: "dark" }} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Platform</label>
            <select value={adForm.platform} onChange={e => setAdForm(f => ({ ...f, platform: e.target.value }))} className={FIELD} style={{ background: "#1a0a12" }} required>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Amount (₹)</label>
            <input type="number" min="0" step="0.01" value={adForm.amount} onChange={e => setAdForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className={FIELD} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Notes (optional)</label>
            <input value={adForm.notes} onChange={e => setAdForm(f => ({ ...f, notes: e.target.value }))} placeholder="Campaign name, etc." className={FIELD} />
          </div>
          <div className="flex gap-2 md:col-span-4">
            <button type="submit" className="font-display text-[0.52rem] tracking-[0.18em] uppercase bg-brass text-[#1a0a12] px-5 py-2 rounded-[3px] hover:bg-[#d4b383] transition-all">
              {editingAd ? "Update" : "Add Entry"}
            </button>
            {editingAd && (
              <button type="button" onClick={() => { setEditingAd(null); setAdForm({ month: currentMonth, platform: "Meta", amount: "", notes: "" }); }} className={BTN}>
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Ad entries table */}
        {adLoading ? (
          <div className="mt-6 flex items-center gap-2 text-[rgba(245,237,224,0.35)]"><Spinner /><span className="text-sm">Loading…</span></div>
        ) : adEntries.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className={TH}>Month</th><th className={TH}>Platform</th><th className={TH + " text-right"}>Amount</th><th className={TH}>Notes</th><th className={TH}></th></tr></thead>
              <tbody>
                {adEntries.map(e => (
                  <tr key={e.id}>
                    <td className={TD}>{e.month}</td>
                    <td className={TD}>{e.platform}</td>
                    <td className={TDr}>{inr(e.amount)}</td>
                    <td className={TD + " text-[rgba(245,237,224,0.35)]"}>{e.notes ?? "—"}</td>
                    <td className={TD}>
                      <div className="flex gap-3">
                        <button onClick={() => editAd(e)} className="font-display text-[0.42rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.55)] hover:text-brass transition-colors">Edit</button>
                        <button onClick={() => deleteAd(e.id)} className="font-display text-[0.42rem] tracking-[0.12em] uppercase text-[rgba(200,80,80,0.50)] hover:text-[rgba(200,80,80,0.85)] transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 font-body font-light text-[rgba(245,237,224,0.25)] text-[0.80rem]">No ad spend entries yet. Add your first entry above.</p>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
type Tab = "sales" | "customers" | "pl";

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("sales");
  const defaultFrom = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const defaultTo   = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(defaultFrom);
  const [to,   setTo]   = useState(defaultTo);

  const tabs: { id: Tab; label: string }[] = [
    { id: "sales",     label: "Sales"     },
    { id: "customers", label: "Customers" },
    { id: "pl",        label: "P&L"       },
  ];

  return (
    <div className="min-h-screen bg-black-plum px-6 py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="font-display text-[0.48rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.40)] mb-2">Admin</p>
        <h1 className="font-display text-ivory" style={{ fontSize: "1.5rem", letterSpacing: "0.05em" }}>Reports</h1>
        <p className="font-body font-light text-[rgba(245,237,224,0.30)] text-[0.85rem] mt-1">Real data from orders, products, and ad spend.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-[rgba(196,163,115,0.12)] mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`font-display text-[0.54rem] tracking-[0.18em] uppercase px-6 py-3 transition-all border-b-2 -mb-px ${
              tab === t.id
                ? "text-brass border-brass"
                : "text-[rgba(245,237,224,0.38)] border-transparent hover:text-[rgba(245,237,224,0.65)]"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Date range — shared across all tabs */}
      <DateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />

      {/* Tab content */}
      {tab === "sales"     && <SalesTab     from={from} to={to} />}
      {tab === "customers" && <CustomersTab from={from} to={to} />}
      {tab === "pl"        && <PLTab        from={from} to={to} />}
    </div>
  );
}
