"use client";

import { useState, useEffect, useMemo } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  candle:             "Candles",
  idol:               "Idols",
  bracelet:           "Spiritual Bracelets",
  gift:               "Gift Sets",
  "pooja-essentials": "Pooja Essentials",
};

const CATEGORY_ORDER = ["candle", "idol", "bracelet", "gift", "pooja-essentials"];

type FunnelField = "bump_product_id" | "oto_product_id" | "downsell_product_id";

interface ProductFunnelRow {
  productId:          string;
  productName:        string;
  category:           string;
  price:              number;
  settingsId:         string | null;
  bump_product_id:    string | null;
  oto_product_id:     string | null;
  downsell_product_id: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  category: string;
  price: number;
}

const STAGES: { field: FunnelField; label: string; short: string }[] = [
  { field: "bump_product_id",     label: "Order Bump",     short: "Bump" },
  { field: "oto_product_id",      label: "One-Time Offer", short: "OTO"  },
  { field: "downsell_product_id", label: "Downsell",       short: "Down" },
];

const selectCls = [
  "w-full bg-[#12060e] border border-[rgba(196,163,115,0.18)] rounded-[3px]",
  "pl-2.5 pr-7 py-2 font-body text-[0.78rem] text-ivory",
  "focus:outline-none focus:border-[rgba(196,163,115,0.50)] transition-colors duration-150 appearance-none",
].join(" ");

export default function FunnelPlannerPage() {
  const [rows,           setRows]    = useState<ProductFunnelRow[]>([]);
  const [productOptions, setOptions] = useState<ProductOption[]>([]);
  const [loading,        setLoading] = useState(true);
  const [loadErr,        setLoadErr] = useState<string | null>(null);
  const [saving,         setSaving]  = useState<Record<string, boolean>>({});
  const [toast,          setToast]   = useState("");
  const [expanded,       setExpanded] = useState<Set<string>>(new Set(["candle"]));

  useEffect(() => {
    fetch("/api/admin/funnel-settings")
      .then(r => r.json())
      .then(({ rows: r, productOptions: o, error }) => {
        if (error) { setLoadErr(error); } else { setRows(r ?? []); setOptions(o ?? []); }
        setLoading(false);
      })
      .catch(e => { setLoadErr(String(e)); setLoading(false); });
  }, []);

  /* Group rows by category, sorted by CATEGORY_ORDER */
  const grouped = useMemo(() => {
    const map = new Map<string, ProductFunnelRow[]>();
    for (const r of rows) {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    }
    const sorted = CATEGORY_ORDER.filter(c => map.has(c)).map(c => ({ category: c, products: map.get(c)! }));
    /* append any unknown categories at the end */
    Array.from(map.entries()).forEach(([c, ps]) => {
      if (!CATEGORY_ORDER.includes(c)) sorted.push({ category: c, products: ps });
    });
    return sorted;
  }, [rows]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  function toggle(cat: string) {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(cat)) { n.delete(cat); } else { n.add(cat); }
      return n;
    });
  }

  async function updateField(productId: string, field: FunnelField, value: string | null) {
    const key = `${productId}-${field}`;
    setRows(prev => prev.map(r => r.productId === productId ? { ...r, [field]: value } : r));
    setSaving(s => ({ ...s, [key]: true }));

    const res = await fetch("/api/admin/funnel-settings", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ productId, field, value }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      showToast("Error: " + (body.error ?? "unknown"));
    } else {
      showToast("Saved");
    }
    setSaving(s => { const n = { ...s }; delete n[key]; return n; });
  }

  if (loading) return (
    <div className="min-h-screen bg-[#12060e] flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
    </div>
  );

  return (
    <div className="px-6 pt-8 pb-24">
      <div className="max-w-5xl">

        {/* Header */}
        <div className="mb-6">
          <p className="font-display text-[0.44rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.35)] mb-1">Admin · Settings</p>
          <h1 className="font-display text-ivory mb-1" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>Funnel Planner</h1>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.35)] text-sm">
            Per-product Order Bump / OTO / Downsell. Each product has its own settings. Group headers are collapsible.
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-5 bg-[rgba(196,163,115,0.08)] border border-[rgba(196,163,115,0.22)] rounded-[4px] px-4 py-2.5">
            <p className="font-display text-[0.50rem] tracking-[0.12em] uppercase text-brass">{toast}</p>
          </div>
        )}

        {/* Error */}
        {loadErr && (
          <div className="bg-[#1e0c17] border border-[rgba(200,80,80,0.28)] rounded-[6px] px-5 py-4 mb-6">
            <p className="font-display text-[0.44rem] tracking-[0.16em] uppercase text-[rgba(200,80,80,0.65)] mb-1">Error loading settings</p>
            <p className="font-mono text-[rgba(220,100,100,0.85)] text-sm break-all">{loadErr}</p>
            <p className="font-body font-light text-[rgba(245,237,224,0.35)] text-xs mt-3">
              Make sure you have run the migration SQL and that <code className="font-mono bg-[rgba(255,255,255,0.06)] px-1">SUPABASE_SERVICE_ROLE_KEY</code> is set.
            </p>
          </div>
        )}

        {/* Category sections */}
        <div className="flex flex-col gap-3">
          {grouped.map(({ category, products }) => {
            const isOpen = expanded.has(category);
            return (
              <div key={category} className="bg-[#1a0a12] border border-[rgba(196,163,115,0.12)] rounded-[6px] overflow-hidden">

                {/* Category header — clickable */}
                <button
                  type="button"
                  onClick={() => toggle(category)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[rgba(196,163,115,0.04)] transition-colors duration-150"
                >
                  <div className="flex items-center gap-3">
                    <p className="font-display text-[0.54rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.70)]">
                      {CATEGORY_LABELS[category] ?? category}
                    </p>
                    <span className="font-body text-[0.72rem] text-[rgba(245,237,224,0.22)]">
                      {products.length} product{products.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <svg
                    width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="rgba(196,163,115,0.45)" strokeWidth="1.5"
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                  >
                    <path d="M1 1l4 4 4-4" />
                  </svg>
                </button>

                {/* Column headers — shown when open */}
                {isOpen && (
                  <div className="border-t border-[rgba(196,163,115,0.08)]">
                    {/* Sticky column headers */}
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-0 px-5 py-2 bg-[rgba(196,163,115,0.04)] border-b border-[rgba(196,163,115,0.06)]">
                      <p className="font-display text-[0.40rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.35)]">Product</p>
                      {STAGES.map(s => (
                        <p key={s.field} className="font-display text-[0.40rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.35)]">{s.label}</p>
                      ))}
                    </div>

                    {/* Product rows */}
                    {products.map((row, idx) => (
                      <div
                        key={row.productId}
                        className={[
                          "grid grid-cols-[1fr_1fr_1fr_1fr] gap-0 px-5 py-3 items-center",
                          idx !== products.length - 1 ? "border-b border-[rgba(196,163,115,0.06)]" : "",
                        ].join(" ")}
                      >
                        {/* Product name */}
                        <div className="pr-4">
                          <p className="font-display text-ivory text-[0.72rem] leading-tight truncate" style={{ letterSpacing: "0.03em" }}>
                            {row.productName}
                          </p>
                          <p className="font-body text-[rgba(196,163,115,0.45)] text-[0.68rem] mt-0.5">
                            ₹{row.price.toLocaleString("en-IN")}
                          </p>
                        </div>

                        {/* 3 dropdowns */}
                        {STAGES.map(({ field }) => {
                          const key = `${row.productId}-${field}`;
                          const isSaving = !!saving[key];
                          return (
                            <div key={field} className="pr-3 relative">
                              <select
                                value={row[field] ?? ""}
                                onChange={e => updateField(row.productId, field, e.target.value || null)}
                                disabled={isSaving}
                                className={[selectCls, isSaving ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-[rgba(196,163,115,0.38)]"].join(" ")}
                              >
                                <option value="">No offer</option>
                                {productOptions.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} · ₹{p.price.toLocaleString("en-IN")}
                                  </option>
                                ))}
                              </select>
                              <svg
                                className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[rgba(196,163,115,0.38)]"
                                width="9" height="5" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5"
                              >
                                <path d="M1 1l4 4 4-4" />
                              </svg>
                              {isSaving && (
                                <div className="absolute right-8 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
