"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

const CATEGORY_LABELS: Record<string, string> = {
  candle:             "Candles",
  idol:               "Idols",
  bracelet:           "Spiritual Bracelets",
  gift:               "Gift Sets",
  "pooja-essentials": "Pooja Essentials",
};

const CATEGORY_ORDER = ["candle", "idol", "bracelet", "gift", "pooja-essentials"];

type FunnelField = "bump_product_id" | "oto_product_id" | "downsell_product_id";

interface FunnelRow {
  id: string;
  category: string;
  bump_product_id: string | null;
  oto_product_id: string | null;
  downsell_product_id: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  category: string;
  price: number;
}

const FUNNEL_STAGES: { field: FunnelField; label: string; hint: string }[] = [
  { field: "bump_product_id",     label: "Order Bump",     hint: "Shown in cart before checkout" },
  { field: "oto_product_id",      label: "One-Time Offer", hint: "Shown immediately after purchase" },
  { field: "downsell_product_id", label: "Downsell",       hint: "Shown if OTO is declined" },
];

export default function FunnelPlannerPage() {
  const [rows,     setRows]    = useState<FunnelRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading,  setLoading] = useState(true);
  const [loadErr,  setLoadErr] = useState<string | null>(null);
  const [saving,   setSaving]  = useState<Record<string, boolean>>({});
  const [toast,    setToast]   = useState("");

  useEffect(() => {
    async function load() {
      /* funnel_settings fetched via server API (bypasses RLS with service role key) */
      const [fApiRes, pRes] = await Promise.all([
        fetch("/api/admin/funnel-settings"),
        supabase.from("products").select("id, name, category, price").eq("is_visible", true).order("category").order("name"),
      ]);

      if (!fApiRes.ok) {
        const body = await fApiRes.json().catch(() => ({})) as { error?: string };
        setLoadErr(body.error ?? `API error ${fApiRes.status}`);
        setLoading(false);
        return;
      }
      if (pRes.error) {
        setLoadErr(`products error: ${pRes.error.message}`);
        setLoading(false);
        return;
      }

      const { rows: rawRows } = await fApiRes.json() as { rows: FunnelRow[] };
      rawRows.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
      setRows(rawRows);
      setProducts((pRes.data ?? []) as ProductOption[]);
      setLoading(false);
    }
    load();
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function updateField(rowId: string, field: FunnelField, value: string | null) {
    const key = `${rowId}-${field}`;
    /* Optimistic update */
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r));
    setSaving(s => ({ ...s, [key]: true }));

    const res = await fetch("/api/admin/funnel-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rowId, field, value }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      showToast("Error: " + (body.error ?? "unknown"));
    }
    setSaving(s => { const n = { ...s }; delete n[key]; return n; });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12060e] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-8 pt-8 pb-20">
      <div className="max-w-4xl">

        <div className="mb-6">
          <p className="font-display text-[0.44rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.35)] mb-1">
            Admin · Settings
          </p>
          <h1 className="font-display text-ivory mb-1" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>
            Funnel Planner
          </h1>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.35)] text-sm">
            Choose which product appears at each funnel stage per category. Set to &ldquo;No offer&rdquo; to skip that stage.
          </p>
        </div>

        {toast && (
          <div className="mb-5 bg-[rgba(196,163,115,0.08)] border border-[rgba(196,163,115,0.22)] rounded-[4px] px-4 py-3">
            <p className="font-display text-[0.52rem] tracking-[0.12em] uppercase text-brass">{toast}</p>
          </div>
        )}

        {loadErr ? (
          <div className="bg-[#1e0c17] border border-[rgba(200,80,80,0.28)] rounded-[6px] px-5 py-4">
            <p className="font-display text-[0.44rem] tracking-[0.16em] uppercase text-[rgba(200,80,80,0.65)] mb-1">Error</p>
            <p className="font-mono text-[rgba(220,100,100,0.85)] text-sm break-all">{loadErr}</p>
            {loadErr.includes("service_role") || loadErr.includes("SUPABASE_SERVICE_ROLE_KEY") ? (
              <p className="font-body font-light text-[rgba(245,237,224,0.35)] text-xs mt-3">
                Add <code className="font-mono bg-[rgba(255,255,255,0.06)] px-1">SUPABASE_SERVICE_ROLE_KEY</code> to Vercel Environment Variables, then redeploy.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {rows.map(row => (
              <div key={row.id} className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] overflow-hidden">

                <div className="px-5 py-3 bg-[rgba(196,163,115,0.04)] border-b border-[rgba(196,163,115,0.08)]">
                  <p className="font-display text-[0.52rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.65)]">
                    {CATEGORY_LABELS[row.category] ?? row.category}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[rgba(196,163,115,0.08)]">
                  {FUNNEL_STAGES.map(({ field, label, hint }) => {
                    const key = `${row.id}-${field}`;
                    const isSavingThis = !!saving[key];
                    const selectedName = row[field]
                      ? (products.find(p => p.id === row[field])?.name ?? null)
                      : null;

                    return (
                      <div key={field} className="px-5 py-4 flex flex-col gap-2">
                        <div>
                          <p className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.55)]">
                            {label}
                          </p>
                          <p className="font-body font-light text-[rgba(245,237,224,0.22)] text-[0.72rem] mt-0.5">{hint}</p>
                        </div>

                        <div className="relative">
                          <select
                            value={row[field] ?? ""}
                            onChange={e => updateField(row.id, field, e.target.value || null)}
                            disabled={isSavingThis}
                            className={[
                              "w-full bg-[#12060e] border border-[rgba(196,163,115,0.18)] rounded-[3px] pr-7 pl-3 py-2.5",
                              "font-display text-[0.65rem] tracking-wide text-ivory",
                              "focus:outline-none focus:border-[rgba(196,163,115,0.50)] transition-colors duration-150",
                              "appearance-none",
                              isSavingThis
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:border-[rgba(196,163,115,0.35)] cursor-pointer",
                            ].join(" ")}
                          >
                            <option value="">No offer</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} · ₹{p.price.toLocaleString("en-IN")}
                              </option>
                            ))}
                          </select>
                          <svg
                            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgba(196,163,115,0.38)]"
                            width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5"
                          >
                            <path d="M1 1l4 4 4-4" />
                          </svg>
                        </div>

                        {selectedName ? (
                          <p className="font-display text-[0.48rem] tracking-wide text-brass truncate">{selectedName}</p>
                        ) : (
                          <p className="font-display text-[0.44rem] tracking-wide text-[rgba(245,237,224,0.20)]">Skipped</p>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
