"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  candle: "Candle",
  idol: "Idol",
  bracelet: "Bracelet",
  gift: "Gift Set",
  "pooja-essentials": "Pooja Essential",
};

const CATEGORIES = ["all", "candle", "idol", "bracelet", "gift", "pooja-essentials"];

export default function InventoryPage() {
  const [products,   setProducts]   = useState<Product[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("all");
  const [adjusting,  setAdjusting]  = useState<Record<string, boolean>>({});
  const [deltas,     setDeltas]     = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.from("products").select("id, name, category, stock").order("category").order("name")
      .then(({ data }) => { setProducts((data ?? []) as Product[]); setLoading(false); });
  }, []);

  async function applyDelta(product: Product) {
    const delta = deltas[product.id] ?? 0;
    if (delta === 0) return;
    const newStock = Math.max(0, (product.stock ?? 0) + delta);
    setAdjusting(p => ({ ...p, [product.id]: true }));
    await supabase.from("products").update({ stock: newStock }).eq("id", product.id);
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStock } : p));
    setDeltas(p => ({ ...p, [product.id]: 0 }));
    setAdjusting(p => ({ ...p, [product.id]: false }));
  }

  const visible = filter === "all" ? products : products.filter(p => p.category === filter);
  const lowCount = products.filter(p => (p.stock ?? 0) < 10).length;

  return (
    <div className="px-8 pt-8 pb-16">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="font-display text-[0.44rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.35)] mb-1">Management</p>
          <h1 className="font-display text-ivory" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>Inventory</h1>
        </div>
        {lowCount > 0 && (
          <span className="font-display text-[0.46rem] tracking-[0.14em] uppercase text-[rgba(200,80,80,0.75)] bg-[rgba(200,80,80,0.08)] border border-[rgba(200,80,80,0.20)] px-3 py-1.5 rounded-full">
            {lowCount} low stock
          </span>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-5">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={[
              "font-display text-[0.44rem] tracking-[0.14em] uppercase px-3 py-1.5 rounded-full border transition-all duration-150",
              filter === c
                ? "border-brass text-brass bg-[rgba(196,163,115,0.08)]"
                : "border-[rgba(196,163,115,0.18)] text-[rgba(245,237,224,0.38)] hover:border-[rgba(196,163,115,0.35)] hover:text-[rgba(245,237,224,0.60)]",
            ].join(" ")}
          >
            {c === "all" ? "All" : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
        </div>
      ) : (
        <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_140px_80px_180px] gap-4 px-5 py-3 border-b border-[rgba(196,163,115,0.08)]">
            {["Product", "Category", "Stock", "Adjust"].map(h => (
              <span key={h} className="font-display text-[0.42rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.35)]">{h}</span>
            ))}
          </div>
          <div className="divide-y divide-[rgba(196,163,115,0.06)]">
            {visible.map(p => {
              const low  = (p.stock ?? 0) < 10;
              const delta = deltas[p.id] ?? 0;
              return (
                <div key={p.id} className="grid grid-cols-1 md:grid-cols-[1fr_140px_80px_180px] gap-2 md:gap-4 items-center px-5 py-3.5">
                  <p className="font-display text-ivory" style={{ fontSize: "0.80rem", letterSpacing: "0.04em" }}>{p.name}</p>
                  <span className="font-display text-[0.44rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.42)]">
                    {CATEGORY_LABELS[p.category] ?? p.category}
                  </span>
                  <span className={`font-display text-[0.85rem] tracking-wide ${low ? "text-[rgba(200,80,80,0.85)]" : "text-ivory"}`}>
                    {p.stock ?? 0}
                    {low && <span className="ml-1 text-[0.50rem] text-[rgba(200,80,80,0.65)]">low</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDeltas(d => ({ ...d, [p.id]: (d[p.id] ?? 0) - 1 }))}
                      className="w-7 h-7 rounded-[3px] border border-[rgba(196,163,115,0.20)] text-[rgba(245,237,224,0.50)] hover:border-[rgba(196,163,115,0.40)] hover:text-ivory flex items-center justify-center text-sm leading-none transition-colors"
                    >−</button>
                    <span className={`w-8 text-center font-display text-sm ${delta !== 0 ? "text-brass" : "text-[rgba(245,237,224,0.25)]"}`}>
                      {delta > 0 ? `+${delta}` : delta === 0 ? "0" : delta}
                    </span>
                    <button
                      onClick={() => setDeltas(d => ({ ...d, [p.id]: (d[p.id] ?? 0) + 1 }))}
                      className="w-7 h-7 rounded-[3px] border border-[rgba(196,163,115,0.20)] text-[rgba(245,237,224,0.50)] hover:border-[rgba(196,163,115,0.40)] hover:text-ivory flex items-center justify-center text-sm leading-none transition-colors"
                    >+</button>
                    <button
                      disabled={delta === 0 || adjusting[p.id]}
                      onClick={() => applyDelta(p)}
                      className="ml-1 font-display text-[0.42rem] tracking-[0.12em] uppercase px-2.5 py-1.5 border rounded-[3px] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed border-[rgba(196,163,115,0.30)] text-brass hover:bg-[rgba(196,163,115,0.08)]"
                    >
                      {adjusting[p.id] ? "…" : "Save"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
