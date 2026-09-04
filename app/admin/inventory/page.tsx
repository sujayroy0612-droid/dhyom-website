"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FGProduct {
  id: string; name: string; category: string;
  stock: number; low_stock_threshold: number;
}

interface RawMat {
  id: string; name: string; category: string; unit: string;
  current_stock: number; low_stock_threshold: number; cost_per_unit?: number | null;
}

interface RecipeRow {
  id: string; product_id: string; raw_material_id: string; quantity_used: number;
  raw_materials: { id: string; name: string; unit: string } | null;
}

interface Batch {
  id: string; product_id: string; quantity_produced: number;
  batch_date: string; notes?: string; created_at: string;
  products: { id: string; name: string } | null;
}

interface Shortage { name: string; unit: string; required: number; available: number; short_by: number; }

type Tab = "goods" | "materials" | "production";

// ── Shared UI ─────────────────────────────────────────────────────────────────

const inputCls =
  "w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body font-light text-[0.88rem] text-ivory placeholder:text-[rgba(245,237,224,0.22)] focus:outline-none focus:border-[rgba(196,163,115,0.50)] transition-colors";
const selectCls = inputCls + " appearance-none cursor-pointer";
const optStyle: React.CSSProperties = { background: "#1a0a12", color: "#f5ede0" };

const RAW_CATEGORIES = ["wax","wick","container","fragrance_oil","packaging","other"] as const;
const RAW_UNITS      = ["g","ml","pieces"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  candle: "Candle", idol: "Idol", bracelet: "Bracelet",
  gift: "Gift Set", "pooja-essentials": "Pooja Essential",
};
const RM_CAT_LABELS: Record<string, string> = {
  wax: "Wax", wick: "Wick", container: "Container",
  fragrance_oil: "Fragrance Oil", packaging: "Packaging", other: "Other",
};

function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmt(n: number) { return n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }

function LowBadge() {
  return (
    <span className="inline-block ml-1.5 font-display text-[0.36rem] tracking-[0.12em] uppercase px-1.5 py-0.5 rounded-full bg-[rgba(200,80,80,0.10)] text-[rgba(200,80,80,0.80)] border border-[rgba(200,80,80,0.20)]">
      low
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>("goods");

  // ── Finished goods ──────────────────────────────────────────────────────────
  const [products,    setProducts]    = useState<FGProduct[]>([]);
  const [fgLoading,   setFgLoading]   = useState(true);
  const [deltas,      setDeltas]      = useState<Record<string, number>>({});
  const [adjusting,   setAdjusting]   = useState<Record<string, boolean>>({});
  const [thresholds,  setThresholds]  = useState<Record<string, string>>({});
  const [savingThresh,setSavingThresh]= useState<Record<string, boolean>>({});

  const loadFG = useCallback(async () => {
    setFgLoading(true);
    const res = await fetch("/api/admin/inventory/finished-goods");
    const d   = await res.json();
    if (d.products) {
      setProducts(d.products);
      const t: Record<string, string> = {};
      d.products.forEach((p: FGProduct) => { t[p.id] = String(p.low_stock_threshold ?? 10); });
      setThresholds(t);
    }
    setFgLoading(false);
  }, []);

  useEffect(() => { loadFG(); }, [loadFG]);

  async function applyDelta(p: FGProduct) {
    const delta = deltas[p.id] ?? 0;
    if (delta === 0) return;
    setAdjusting(prev => ({ ...prev, [p.id]: true }));
    await fetch("/api/admin/inventory/finished-goods", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adjust_stock", id: p.id, delta }),
    });
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, stock: Math.max(0, x.stock + delta) } : x)
      .sort((a, b) => a.stock - b.stock));
    setDeltas(prev => ({ ...prev, [p.id]: 0 }));
    setAdjusting(prev => ({ ...prev, [p.id]: false }));
  }

  async function saveThreshold(p: FGProduct) {
    const threshold = Number(thresholds[p.id]);
    if (isNaN(threshold) || threshold < 0) return;
    setSavingThresh(prev => ({ ...prev, [p.id]: true }));
    await fetch("/api/admin/inventory/finished-goods", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_threshold", id: p.id, threshold }),
    });
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, low_stock_threshold: threshold } : x));
    setSavingThresh(prev => ({ ...prev, [p.id]: false }));
  }

  // ── Raw materials ───────────────────────────────────────────────────────────
  const [rawMats,     setRawMats]     = useState<RawMat[]>([]);
  const [rmLoading,   setRmLoading]   = useState(true);
  const [adjustingRm, setAdjustingRm] = useState<string | null>(null);
  const [adjustValue, setAdjustValue] = useState("");
  const [savingAdj,   setSavingAdj]   = useState(false);
  const [showAddMat,  setShowAddMat]  = useState(false);
  const [savingMat,   setSavingMat]   = useState(false);
  const [newMat, setNewMat] = useState({
    name: "", category: "other" as typeof RAW_CATEGORIES[number],
    unit: "pieces" as typeof RAW_UNITS[number],
    current_stock: "", low_stock_threshold: "100", cost_per_unit: "",
  });

  const loadRM = useCallback(async () => {
    setRmLoading(true);
    const res = await fetch("/api/admin/inventory/raw-materials");
    const d   = await res.json();
    if (d.raw_materials) setRawMats(d.raw_materials);
    setRmLoading(false);
  }, []);

  useEffect(() => { loadRM(); }, [loadRM]);

  async function startAdjust(rm: RawMat) {
    setAdjustingRm(rm.id);
    setAdjustValue(String(rm.current_stock));
  }

  async function submitAdjust(rm: RawMat) {
    setSavingAdj(true);
    await fetch("/api/admin/inventory/raw-materials", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adjust", id: rm.id, new_stock: Number(adjustValue) }),
    });
    setRawMats(prev => prev.map(x => x.id === rm.id ? { ...x, current_stock: Number(adjustValue) } : x));
    setAdjustingRm(null);
    setSavingAdj(false);
  }

  async function submitNewMat(e: React.FormEvent) {
    e.preventDefault();
    setSavingMat(true);
    const res = await fetch("/api/admin/inventory/raw-materials", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...newMat }),
    });
    const d = await res.json();
    if (d.raw_material) {
      setRawMats(prev => [...prev, d.raw_material].sort((a, b) => a.name.localeCompare(b.name)));
      setNewMat({ name: "", category: "other", unit: "pieces", current_stock: "", low_stock_threshold: "100", cost_per_unit: "" });
      setShowAddMat(false);
    }
    setSavingMat(false);
  }

  // ── Production ──────────────────────────────────────────────────────────────
  const [batches,       setBatches]       = useState<Batch[]>([]);
  const [batchLoading,  setBatchLoading]  = useState(false);
  const [prodProduct,   setProdProduct]   = useState("");
  const [prodQty,       setProdQty]       = useState("1");
  const [prodDate,      setProdDate]      = useState(todayStr());
  const [prodNotes,     setProdNotes]     = useState("");
  const [prodSubmitting,setProdSubmitting]= useState(false);
  const [prodError,     setProdError]     = useState<string | null>(null);
  const [prodShortages, setProdShortages] = useState<Shortage[]>([]);
  const [prodSuccess,   setProdSuccess]   = useState(false);

  // Recipe editor
  const [recipe,        setRecipe]        = useState<RecipeRow[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeEdited,  setRecipeEdited]  = useState(false);
  const [savingRecipe,  setSavingRecipe]  = useState(false);
  const [newIng, setNewIng] = useState({ raw_material_id: "", quantity_used: "1" });

  const loadBatches = useCallback(async () => {
    setBatchLoading(true);
    const res = await fetch("/api/admin/inventory/production");
    const d   = await res.json();
    if (d.batches) setBatches(d.batches);
    setBatchLoading(false);
  }, []);

  useEffect(() => { if (tab === "production") loadBatches(); }, [tab, loadBatches]);

  async function loadRecipe(productId: string) {
    if (!productId) { setRecipe([]); return; }
    setRecipeLoading(true);
    const res = await fetch(`/api/admin/inventory/recipes?product_id=${productId}`);
    const d   = await res.json();
    setRecipe((d.recipe ?? []) as RecipeRow[]);
    setRecipeEdited(false);
    setRecipeLoading(false);
  }

  function handleProductChange(id: string) {
    setProdProduct(id);
    setProdError(null);
    setProdShortages([]);
    setProdSuccess(false);
    loadRecipe(id);
  }

  function addIngredient() {
    if (!newIng.raw_material_id || !newIng.quantity_used) return;
    const rm = rawMats.find(r => r.id === newIng.raw_material_id);
    if (!rm) return;
    setRecipe(prev => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        product_id: prodProduct,
        raw_material_id: newIng.raw_material_id,
        quantity_used: Number(newIng.quantity_used),
        raw_materials: { id: rm.id, name: rm.name, unit: rm.unit },
      }
    ]);
    setNewIng({ raw_material_id: "", quantity_used: "1" });
    setRecipeEdited(true);
  }

  function removeIngredient(idx: number) {
    setRecipe(prev => prev.filter((_, i) => i !== idx));
    setRecipeEdited(true);
  }

  async function saveRecipe() {
    if (!prodProduct) return;
    setSavingRecipe(true);
    await fetch("/api/admin/inventory/recipes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save", product_id: prodProduct,
        rows: recipe.map(r => ({ raw_material_id: r.raw_material_id, quantity_used: r.quantity_used })),
      }),
    });
    setSavingRecipe(false);
    setRecipeEdited(false);
  }

  async function submitProduction(e: React.FormEvent) {
    e.preventDefault();
    setProdError(null); setProdShortages([]); setProdSuccess(false);
    if (!prodProduct) { setProdError("Select a product."); return; }
    const qty = Number(prodQty);
    if (!qty || qty < 1) { setProdError("Quantity must be at least 1."); return; }

    setProdSubmitting(true);
    const res = await fetch("/api/admin/inventory/production", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: prodProduct, quantity: qty, batch_date: prodDate, notes: prodNotes }),
    });
    const d = await res.json();
    setProdSubmitting(false);

    if (!d.ok && d.shortages?.length) {
      setProdShortages(d.shortages);
      return;
    }
    if (!d.ok) { setProdError(d.error ?? "Production failed."); return; }

    setProdSuccess(true);
    setProdQty("1"); setProdNotes("");
    // Refresh goods + recipe
    loadFG();
    loadRM();
    loadBatches();
    loadRecipe(prodProduct);
  }

  // ── Low-stock summary ───────────────────────────────────────────────────────
  const fgLow = products.filter(p => p.stock <= p.low_stock_threshold);
  const rmLow = rawMats.filter(r => r.current_stock <= r.low_stock_threshold);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-8 pt-8 pb-16">

      {/* Header */}
      <div className="mb-6">
        <p className="font-display text-[0.44rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.35)] mb-1">Management</p>
        <h1 className="font-display text-ivory" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>Inventory</h1>
      </div>

      {/* Low-stock banner */}
      {(fgLow.length > 0 || rmLow.length > 0) && (
        <div className="mb-5 rounded-[6px] border border-[rgba(200,80,80,0.25)] bg-[rgba(200,80,80,0.06)] px-4 py-3">
          <p className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(200,80,80,0.70)] mb-2">
            Low Stock Alert — {fgLow.length + rmLow.length} item{fgLow.length + rmLow.length !== 1 ? "s" : ""} need attention
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {fgLow.map(p => (
              <span key={p.id} className="font-body font-light text-[0.78rem] text-[rgba(245,237,224,0.55)]">
                {p.name} <span className="text-[rgba(200,80,80,0.70)]">({p.stock} left)</span>
              </span>
            ))}
            {rmLow.map(r => (
              <span key={r.id} className="font-body font-light text-[0.78rem] text-[rgba(245,237,224,0.55)]">
                {r.name} <span className="text-[rgba(200,80,80,0.70)]">({fmt(r.current_stock)} {r.unit})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-[rgba(196,163,115,0.10)]">
        {([
          { key: "goods",      label: "Finished Goods" },
          { key: "materials",  label: "Raw Materials" },
          { key: "production", label: "Log Production" },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              "px-5 py-2.5 font-display text-[0.46rem] tracking-[0.16em] uppercase border-b-2 -mb-px transition-colors",
              tab === t.key
                ? "border-brass text-brass"
                : "border-transparent text-[rgba(245,237,224,0.35)] hover:text-[rgba(245,237,224,0.60)]",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Finished Goods ────────────────────────────────────────────── */}
      {tab === "goods" && (
        <div>
          {fgLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
            </div>
          ) : (
            <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] overflow-hidden">
              {/* Col headers */}
              <div className="grid grid-cols-[1fr_120px_80px_120px_160px_80px] gap-4 px-5 py-3 border-b border-[rgba(196,163,115,0.08)]">
                {["Product","Category","Stock","Threshold","Adjust Stock",""].map(h => (
                  <span key={h} className="font-display text-[0.40rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.35)]">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-[rgba(196,163,115,0.06)]">
                {products.map(p => {
                  const low   = p.stock <= p.low_stock_threshold;
                  const delta = deltas[p.id] ?? 0;
                  return (
                    <div key={p.id} className="grid grid-cols-[1fr_120px_80px_120px_160px_80px] gap-4 items-center px-5 py-3.5">
                      <p className="font-display text-ivory truncate" style={{ fontSize: "0.78rem", letterSpacing: "0.04em" }}>
                        {p.name}
                      </p>
                      <span className="font-display text-[0.42rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.42)]">
                        {CATEGORY_LABELS[p.category] ?? p.category}
                      </span>
                      <span className={`font-display text-[0.88rem] tracking-wide ${low ? "text-[rgba(200,80,80,0.85)]" : "text-ivory"}`}>
                        {p.stock}
                        {low && <LowBadge />}
                      </span>
                      {/* Threshold */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" min={0}
                          value={thresholds[p.id] ?? p.low_stock_threshold}
                          onChange={e => setThresholds(prev => ({ ...prev, [p.id]: e.target.value }))}
                          className="w-16 bg-[rgba(255,255,255,0.03)] border border-[rgba(196,163,115,0.15)] rounded-[3px] px-2 py-1 font-body text-[0.80rem] text-ivory focus:outline-none focus:border-[rgba(196,163,115,0.45)] text-center"
                        />
                        <button
                          onClick={() => saveThreshold(p)}
                          disabled={savingThresh[p.id] || String(p.low_stock_threshold) === thresholds[p.id]}
                          className="font-display text-[0.38rem] tracking-[0.12em] uppercase px-2 py-1 border rounded-[3px] border-[rgba(196,163,115,0.22)] text-[rgba(196,163,115,0.55)] hover:text-brass hover:border-[rgba(196,163,115,0.45)] transition-colors disabled:opacity-25"
                        >
                          {savingThresh[p.id] ? "…" : "Set"}
                        </button>
                      </div>
                      {/* Delta adjuster */}
                      <div className="flex items-center gap-1.5">
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
                      </div>
                      <button
                        disabled={delta === 0 || adjusting[p.id]}
                        onClick={() => applyDelta(p)}
                        className="font-display text-[0.38rem] tracking-[0.12em] uppercase px-2.5 py-1.5 border rounded-[3px] transition-all disabled:opacity-30 disabled:cursor-not-allowed border-[rgba(196,163,115,0.30)] text-brass hover:bg-[rgba(196,163,115,0.08)]"
                      >
                        {adjusting[p.id] ? "…" : "Save"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Raw Materials ─────────────────────────────────────────────── */}
      {tab === "materials" && (
        <div className="flex flex-col gap-4">
          {rmLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
            </div>
          ) : (
            <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_70px_90px_90px_180px] gap-4 px-5 py-3 border-b border-[rgba(196,163,115,0.08)]">
                {["Name","Category","Unit","Stock","Threshold","Actions"].map(h => (
                  <span key={h} className="font-display text-[0.40rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.35)]">{h}</span>
                ))}
              </div>
              {rawMats.length === 0 ? (
                <div className="py-12 text-center font-body font-light text-[0.82rem] text-[rgba(245,237,224,0.25)]">
                  No raw materials yet. Add your first one below.
                </div>
              ) : (
                <div className="divide-y divide-[rgba(196,163,115,0.06)]">
                  {rawMats.map(rm => {
                    const low = rm.current_stock <= rm.low_stock_threshold;
                    const isAdj = adjustingRm === rm.id;
                    return (
                      <div key={rm.id} className="grid grid-cols-[1fr_120px_70px_90px_90px_180px] gap-4 items-center px-5 py-3.5">
                        <p className="font-display text-ivory truncate" style={{ fontSize: "0.78rem", letterSpacing: "0.04em" }}>
                          {rm.name}
                        </p>
                        <span className="font-display text-[0.42rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.42)]">
                          {RM_CAT_LABELS[rm.category] ?? rm.category}
                        </span>
                        <span className="font-body font-light text-[0.80rem] text-[rgba(245,237,224,0.55)]">{rm.unit}</span>
                        <span className={`font-display text-[0.88rem] tracking-wide ${low ? "text-[rgba(200,80,80,0.85)]" : "text-ivory"}`}>
                          {fmt(rm.current_stock)}
                          {low && <LowBadge />}
                        </span>
                        <span className="font-body font-light text-[0.80rem] text-[rgba(245,237,224,0.40)]">{fmt(rm.low_stock_threshold)}</span>
                        <div className="flex items-center gap-2">
                          {isAdj ? (
                            <>
                              <input
                                type="number" min={0} step="0.01"
                                value={adjustValue}
                                onChange={e => setAdjustValue(e.target.value)}
                                className="w-20 bg-[rgba(255,255,255,0.04)] border border-[rgba(196,163,115,0.30)] rounded-[3px] px-2 py-1 font-body text-[0.80rem] text-ivory focus:outline-none"
                              />
                              <button
                                onClick={() => submitAdjust(rm)}
                                disabled={savingAdj}
                                className="font-display text-[0.38rem] tracking-[0.12em] uppercase px-2 py-1 rounded-[3px] border border-[rgba(196,163,115,0.30)] text-brass hover:bg-[rgba(196,163,115,0.08)] transition-colors disabled:opacity-30"
                              >
                                {savingAdj ? "…" : "Save"}
                              </button>
                              <button
                                onClick={() => setAdjustingRm(null)}
                                className="font-display text-[0.36rem] tracking-[0.10em] uppercase text-[rgba(245,237,224,0.30)] hover:text-[rgba(245,237,224,0.60)] transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startAdjust(rm)}
                              className="font-display text-[0.38rem] tracking-[0.12em] uppercase px-2.5 py-1.5 rounded-[3px] border border-[rgba(196,163,115,0.22)] text-[rgba(196,163,115,0.60)] hover:text-brass hover:border-[rgba(196,163,115,0.45)] transition-colors"
                            >
                              Adjust Stock
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Add raw material */}
          <div>
            {!showAddMat ? (
              <button
                onClick={() => setShowAddMat(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[4px] bg-[rgba(196,163,115,0.08)] border border-[rgba(196,163,115,0.18)] text-[rgba(196,163,115,0.65)] hover:text-brass hover:bg-[rgba(196,163,115,0.13)] transition-colors"
              >
                <span className="text-[1rem]">+</span>
                <span className="font-display text-[0.46rem] tracking-[0.16em] uppercase">Add Raw Material</span>
              </button>
            ) : (
              <form onSubmit={submitNewMat} className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] p-6">
                <p className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.40)] mb-4">New Raw Material</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Name</label>
                    <input type="text" required value={newMat.name} onChange={e => setNewMat(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Soy Wax" className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Category</label>
                    <select value={newMat.category} onChange={e => setNewMat(p => ({ ...p, category: e.target.value as typeof RAW_CATEGORIES[number] }))} className={selectCls}>
                      {RAW_CATEGORIES.map(c => <option key={c} value={c} style={optStyle}>{RM_CAT_LABELS[c]}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Unit</label>
                    <select value={newMat.unit} onChange={e => setNewMat(p => ({ ...p, unit: e.target.value as typeof RAW_UNITS[number] }))} className={selectCls}>
                      {RAW_UNITS.map(u => <option key={u} value={u} style={optStyle}>{u}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Current Stock</label>
                    <input type="number" min={0} step="0.01" required value={newMat.current_stock} onChange={e => setNewMat(p => ({ ...p, current_stock: e.target.value }))} className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Low-Stock Threshold</label>
                    <input type="number" min={0} step="0.01" value={newMat.low_stock_threshold} onChange={e => setNewMat(p => ({ ...p, low_stock_threshold: e.target.value }))} className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Cost per Unit (optional)</label>
                    <input type="number" min={0} step="0.01" value={newMat.cost_per_unit} onChange={e => setNewMat(p => ({ ...p, cost_per_unit: e.target.value }))} placeholder="₹ per g/ml/piece" className={inputCls} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={savingMat} className="px-5 py-2 rounded-[4px] bg-[rgba(196,163,115,0.12)] border border-[rgba(196,163,115,0.28)] text-brass font-display text-[0.44rem] tracking-[0.16em] uppercase hover:bg-[rgba(196,163,115,0.18)] transition-colors disabled:opacity-40">
                    {savingMat ? "Saving…" : "Save Material"}
                  </button>
                  <button type="button" onClick={() => setShowAddMat(false)} className="font-display text-[0.44rem] tracking-[0.14em] uppercase text-[rgba(245,237,224,0.30)] hover:text-[rgba(245,237,224,0.60)] transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Log Production ───────────────────────────────────────────── */}
      {tab === "production" && (
        <div className="flex flex-col gap-6 max-w-2xl">

          {/* Production form */}
          <form onSubmit={submitProduction} className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] p-6 flex flex-col gap-4">
            <p className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.40)]">Log a Production Batch</p>

            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Product</label>
                <select value={prodProduct} onChange={e => handleProductChange(e.target.value)} className={selectCls} required>
                  <option value="" style={optStyle}>Select product…</option>
                  {products.map(p => <option key={p.id} value={p.id} style={optStyle}>{p.name} (stock: {p.stock})</option>)}
                </select>
              </div>
              <div className="w-28 flex flex-col gap-1.5">
                <label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Qty Produced</label>
                <input type="number" min={1} value={prodQty} onChange={e => setProdQty(e.target.value)} className={inputCls} required />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Batch Date</label>
                <input type="date" value={prodDate} onChange={e => setProdDate(e.target.value)} className={inputCls} />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Notes (optional)</label>
                <input type="text" value={prodNotes} onChange={e => setProdNotes(e.target.value)} placeholder="Batch notes…" className={inputCls} />
              </div>
            </div>

            {prodError && <p className="font-body font-light text-[0.82rem] text-[rgba(210,90,90,0.80)]">{prodError}</p>}

            {prodShortages.length > 0 && (
              <div className="rounded-[4px] border border-[rgba(210,90,90,0.30)] bg-[rgba(210,90,90,0.06)] p-4">
                <p className="font-display text-[0.42rem] tracking-[0.16em] uppercase text-[rgba(210,90,90,0.70)] mb-2">Insufficient Raw Materials</p>
                <div className="flex flex-col gap-1">
                  {prodShortages.map((s, i) => (
                    <p key={i} className="font-body font-light text-[0.80rem] text-[rgba(245,237,224,0.55)]">
                      <span className="text-ivory">{s.name}</span> — need {fmt(s.required)} {s.unit}, have {fmt(s.available)} {s.unit}
                      <span className="text-[rgba(210,90,90,0.70)]"> (short {fmt(s.short_by)} {s.unit})</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {prodSuccess && (
              <p className="font-body font-light text-[0.82rem] text-[rgba(100,210,130,0.80)]">
                Batch logged. Stock updated.
              </p>
            )}

            <button type="submit" disabled={prodSubmitting} className="self-start px-6 py-2.5 rounded-[4px] bg-[rgba(196,163,115,0.12)] border border-[rgba(196,163,115,0.28)] text-brass font-display text-[0.46rem] tracking-[0.16em] uppercase hover:bg-[rgba(196,163,115,0.18)] transition-colors disabled:opacity-40">
              {prodSubmitting ? "Processing…" : "Log Batch"}
            </button>
          </form>

          {/* Recipe editor — shown when a product is selected */}
          {prodProduct && (
            <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.40)]">
                  Recipe — {products.find(p => p.id === prodProduct)?.name}
                </p>
                {recipeEdited && (
                  <button
                    onClick={saveRecipe}
                    disabled={savingRecipe}
                    className="font-display text-[0.40rem] tracking-[0.14em] uppercase px-3 py-1.5 rounded-[3px] border border-[rgba(196,163,115,0.30)] text-brass hover:bg-[rgba(196,163,115,0.10)] transition-colors disabled:opacity-40"
                  >
                    {savingRecipe ? "Saving…" : "Save Recipe"}
                  </button>
                )}
              </div>

              {recipeLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
              ) : recipe.length === 0 ? (
                <p className="font-body font-light text-[0.80rem] text-[rgba(245,237,224,0.30)]">
                  No recipe set. Add ingredients below — production batches require a recipe to deduct raw materials.
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="grid grid-cols-[1fr_100px_50px_40px] gap-3 pb-1.5 border-b border-[rgba(196,163,115,0.08)]">
                    {["Ingredient","Qty per unit","Unit",""].map(h => (
                      <span key={h} className="font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.30)]">{h}</span>
                    ))}
                  </div>
                  {recipe.map((row, idx) => (
                    <div key={row.id} className="grid grid-cols-[1fr_100px_50px_40px] gap-3 items-center py-1.5">
                      <span className="font-body font-light text-[0.82rem] text-ivory">{row.raw_materials?.name ?? row.raw_material_id}</span>
                      <input
                        type="number" min={0.01} step="0.01"
                        value={row.quantity_used}
                        onChange={e => {
                          const v = Number(e.target.value);
                          setRecipe(prev => prev.map((r, i) => i === idx ? { ...r, quantity_used: v } : r));
                          setRecipeEdited(true);
                        }}
                        className="bg-[rgba(255,255,255,0.03)] border border-[rgba(196,163,115,0.15)] rounded-[3px] px-2 py-1 font-body text-[0.82rem] text-ivory focus:outline-none w-full"
                      />
                      <span className="font-body font-light text-[0.78rem] text-[rgba(245,237,224,0.40)]">{row.raw_materials?.unit}</span>
                      <button onClick={() => removeIngredient(idx)} className="text-[rgba(210,90,90,0.45)] hover:text-[rgba(210,90,90,0.80)] text-[0.85rem] transition-colors">×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add ingredient row */}
              {rawMats.length > 0 && (
                <div className="flex items-end gap-3 pt-2 border-t border-[rgba(196,163,115,0.08)]">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.35)]">Raw Material</label>
                    <select
                      value={newIng.raw_material_id}
                      onChange={e => setNewIng(p => ({ ...p, raw_material_id: e.target.value }))}
                      className={selectCls}
                    >
                      <option value="" style={optStyle}>Select…</option>
                      {rawMats
                        .filter(rm => !recipe.some(r => r.raw_material_id === rm.id))
                        .map(rm => <option key={rm.id} value={rm.id} style={optStyle}>{rm.name} ({rm.unit})</option>)}
                    </select>
                  </div>
                  <div className="w-28 flex flex-col gap-1.5">
                    <label className="font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.35)]">Qty per unit</label>
                    <input
                      type="number" min={0.01} step="0.01"
                      value={newIng.quantity_used}
                      onChange={e => setNewIng(p => ({ ...p, quantity_used: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <button
                    onClick={addIngredient}
                    disabled={!newIng.raw_material_id}
                    className="font-display text-[0.42rem] tracking-[0.14em] uppercase px-3 py-2 rounded-[3px] border border-[rgba(196,163,115,0.25)] text-[rgba(196,163,115,0.60)] hover:text-brass hover:border-[rgba(196,163,115,0.45)] transition-colors disabled:opacity-30"
                  >
                    Add
                  </button>
                </div>
              )}

              {recipeEdited && (
                <button
                  onClick={saveRecipe}
                  disabled={savingRecipe}
                  className="self-start px-5 py-2 rounded-[4px] bg-[rgba(196,163,115,0.10)] border border-[rgba(196,163,115,0.28)] text-brass font-display text-[0.44rem] tracking-[0.14em] uppercase hover:bg-[rgba(196,163,115,0.16)] transition-colors disabled:opacity-40"
                >
                  {savingRecipe ? "Saving…" : "Save Recipe"}
                </button>
              )}
            </div>
          )}

          {/* Recent batches */}
          <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] overflow-hidden">
            <div className="px-5 py-3 border-b border-[rgba(196,163,115,0.08)]">
              <p className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.40)]">Recent Batches</p>
            </div>
            {batchLoading ? (
              <div className="flex items-center justify-center h-24">
                <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
              </div>
            ) : batches.length === 0 ? (
              <div className="py-10 text-center font-body font-light text-[0.80rem] text-[rgba(245,237,224,0.25)]">No batches logged yet.</div>
            ) : (
              <div className="divide-y divide-[rgba(196,163,115,0.06)]">
                <div className="grid grid-cols-[120px_1fr_80px_1fr] gap-4 px-5 py-2.5">
                  {["Date","Product","Qty","Notes"].map(h => (
                    <span key={h} className="font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.30)]">{h}</span>
                  ))}
                </div>
                {batches.map(b => (
                  <div key={b.id} className="grid grid-cols-[120px_1fr_80px_1fr] gap-4 items-center px-5 py-3">
                    <span className="font-body font-light text-[0.78rem] text-[rgba(245,237,224,0.50)]">{b.batch_date}</span>
                    <span className="font-body font-light text-[0.82rem] text-ivory truncate">
                      {(b.products as { name: string } | null)?.name ?? b.product_id}
                    </span>
                    <span className="font-display text-ivory text-[0.82rem]">+{b.quantity_produced}</span>
                    <span className="font-body font-light text-[0.76rem] text-[rgba(245,237,224,0.35)] truncate">{b.notes ?? "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
