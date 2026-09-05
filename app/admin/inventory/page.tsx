"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface LedgerRow {
  id: string; name: string; category: string;
  opening: number; stock_in: number;
  out_amazon: number; out_flipkart: number; out_meesho: number;
  out_website: number; out_offline: number;
  closing: number; wip: number; total: number;
  reorder: number; remarks: string; low: boolean;
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

type Tab = "ledger" | "materials" | "production";

// ── Shared UI ─────────────────────────────────────────────────────────────────

const inputCls =
  "w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body font-light text-[0.88rem] text-ivory placeholder:text-[rgba(245,237,224,0.22)] focus:outline-none focus:border-[rgba(196,163,115,0.50)] transition-colors";
const selectCls = inputCls + " appearance-none cursor-pointer";
const optStyle: React.CSSProperties = { background: "#1a0a12", color: "#f5ede0" };

const RAW_CATEGORIES = ["wax","wick","container","fragrance_oil","packaging","other"] as const;
const RAW_UNITS      = ["g","ml","pieces"] as const;

const RM_CAT_LABELS: Record<string, string> = {
  wax: "Wax", wick: "Wick", container: "Container",
  fragrance_oil: "Fragrance Oil", packaging: "Packaging", other: "Other",
};

function todayStr() { return new Date().toISOString().slice(0, 10); }
function firstOfMonth() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Table cell styles
const TH = "px-3 py-2 font-display text-[0.38rem] tracking-[0.14em] uppercase text-center whitespace-nowrap";
const TD = "px-3 py-2.5 text-center font-body font-light text-[0.80rem] whitespace-nowrap";
const TH_LEFT = TH + " text-left";
const TD_LEFT = TD + " text-left";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>("ledger");

  // ── Ledger ──────────────────────────────────────────────────────────────────
  const [ledger,        setLedger]        = useState<LedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [filterFrom,    setFilterFrom]    = useState(firstOfMonth());
  const [filterTo,      setFilterTo]      = useState(todayStr());
  // Single shared edit state — key = `${productId}:${fieldType}`
  const [editingCell,   setEditingCell]   = useState<string | null>(null);
  const [editingVal,    setEditingVal]    = useState("");

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true);
    const params = new URLSearchParams();
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo)   params.set("to",   filterTo);
    const res = await fetch(`/api/admin/inventory/ledger?${params}`);
    const d   = await res.json();
    if (d.ledger) setLedger(d.ledger);
    setLedgerLoading(false);
  }, [filterFrom, filterTo]);

  useEffect(() => { if (tab === "ledger") loadLedger(); }, [tab, loadLedger]);

  function startEdit(productId: string, field: string, currentVal: string | number) {
    setEditingCell(`${productId}:${field}`);
    setEditingVal(String(currentVal));
  }

  async function commitEdit(productId: string, field: string) {
    const val = editingVal.trim();
    setEditingCell(null);

    // Channel sales (amazon / flipkart / meesho / website)
    if (["amazon","flipkart","meesho","website"].includes(field)) {
      const qty = parseInt(val, 10);
      if (isNaN(qty) || qty < 0) return;
      await fetch("/api/admin/inventory/channel-sales", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, channel: field, quantity: qty, period_from: filterFrom, period_to: filterTo }),
      });
      loadLedger(); return;
    }

    // Closing stock (direct set)
    if (field === "closing") {
      const stock = parseInt(val, 10);
      if (isNaN(stock) || stock < 0) return;
      await fetch("/api/admin/inventory/finished-goods", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_stock", id: productId, stock }),
      });
      loadLedger(); return;
    }

    // Reorder level
    if (field === "reorder") {
      const threshold = parseInt(val, 10);
      if (isNaN(threshold) || threshold < 0) return;
      await fetch("/api/admin/inventory/finished-goods", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_threshold", id: productId, threshold }),
      });
      loadLedger(); return;
    }

    // Remarks
    if (field === "remarks") {
      await fetch("/api/admin/inventory/finished-goods", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_remarks", id: productId, remarks: val }),
      });
      loadLedger(); return;
    }

    // Opening stock / Stock In / WIP — manual overrides per period
    if (["opening","stock_in","wip"].includes(field)) {
      const n = parseInt(val, 10);
      if (isNaN(n) || n < 0) return;
      await fetch("/api/admin/inventory/ledger-overrides", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, field, value: n, period_from: filterFrom, period_to: filterTo }),
      });
      loadLedger(); return;
    }
  }

  function EditCell({ productId, field, value, numeric = true, className = "", style = {} }: {
    productId: string; field: string; value: string | number;
    numeric?: boolean; className?: string; style?: React.CSSProperties;
  }) {
    const key = `${productId}:${field}`;
    const isEditing = editingCell === key;
    if (isEditing) {
      return (
        <input
          autoFocus type={numeric ? "number" : "text"} min={numeric ? 0 : undefined}
          value={editingVal}
          onChange={e => setEditingVal(e.target.value)}
          onBlur={() => commitEdit(productId, field)}
          onKeyDown={e => { if (e.key === "Enter") commitEdit(productId, field); if (e.key === "Escape") setEditingCell(null); }}
          onClick={e => e.stopPropagation()}
          className={`bg-[rgba(196,163,115,0.10)] border border-[rgba(196,163,115,0.45)] rounded-[3px] px-1.5 py-0.5 font-body text-[0.80rem] text-ivory focus:outline-none ${numeric ? "w-16 text-center" : "w-full"}`}
          style={style}
        />
      );
    }
    return (
      <span
        onClick={() => startEdit(productId, field, value)}
        className={`cursor-pointer hover:text-brass transition-colors ${className}`}
        title="Click to edit"
      >
        {value === "" || value === 0 ? <span className="text-[rgba(245,237,224,0.25)]">0</span> : value}
      </span>
    );
  }

  // Totals row
  const totals = ledger.reduce(
    (acc, r) => ({
      opening:     acc.opening + r.opening,
      stock_in:    acc.stock_in + r.stock_in,
      out_amazon:  acc.out_amazon  + r.out_amazon,
      out_flipkart:acc.out_flipkart+ r.out_flipkart,
      out_meesho:  acc.out_meesho  + r.out_meesho,
      out_website: acc.out_website + r.out_website,
      out_offline: acc.out_offline + r.out_offline,
      closing:     acc.closing + r.closing,
      wip:         acc.wip + r.wip,
      total:       acc.total + r.total,
    }),
    { opening:0, stock_in:0, out_amazon:0, out_flipkart:0, out_meesho:0, out_website:0, out_offline:0, closing:0, wip:0, total:0 }
  );

  // Low-stock counts for banner
  const fgLow = ledger.filter(r => r.low).length;

  // ── Raw materials ───────────────────────────────────────────────────────────
  const [rawMats,     setRawMats]     = useState<RawMat[]>([]);
  const [rmLoading,   setRmLoading]   = useState(true);
  const [adjustingRm, setAdjustingRm] = useState<string | null>(null);
  const [adjustValue, setAdjustValue] = useState("");
  const [savingRmAdj, setSavingRmAdj] = useState(false);
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

  useEffect(() => { if (tab === "materials") loadRM(); }, [tab, loadRM]);

  async function submitAdjustRm(rm: RawMat) {
    setSavingRmAdj(true);
    await fetch("/api/admin/inventory/raw-materials", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adjust", id: rm.id, new_stock: Number(adjustValue) }),
    });
    setRawMats(prev => prev.map(x => x.id === rm.id ? { ...x, current_stock: Number(adjustValue) } : x));
    setAdjustingRm(null);
    setSavingRmAdj(false);
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

  const rmLow = rawMats.filter(r => r.current_stock <= r.low_stock_threshold).length;

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
  const [recipe,        setRecipe]        = useState<RecipeRow[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeEdited,  setRecipeEdited]  = useState(false);
  const [savingRecipe,  setSavingRecipe]  = useState(false);
  const [newIng, setNewIng] = useState({ raw_material_id: "", quantity_used: "1" });

  // Load products for production dropdown (reuse ledger data)
  const [allProducts, setAllProducts] = useState<{ id: string; name: string; stock: number }[]>([]);
  useEffect(() => {
    fetch("/api/admin/inventory/finished-goods")
      .then(r => r.json())
      .then(d => { if (d.products) setAllProducts(d.products); });
  }, []);

  const loadBatches = useCallback(async () => {
    setBatchLoading(true);
    const res = await fetch("/api/admin/inventory/production");
    const d   = await res.json();
    if (d.batches) setBatches(d.batches);
    setBatchLoading(false);
  }, []);

  useEffect(() => { if (tab === "production") { loadBatches(); loadRM(); } }, [tab, loadBatches, loadRM]);

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
    setProdError(null); setProdShortages([]); setProdSuccess(false);
    loadRecipe(id);
  }

  function addIngredient() {
    if (!newIng.raw_material_id || !newIng.quantity_used) return;
    const rm = rawMats.find(r => r.id === newIng.raw_material_id);
    if (!rm) return;
    setRecipe(prev => [...prev, {
      id: `tmp-${Date.now()}`, product_id: prodProduct,
      raw_material_id: newIng.raw_material_id, quantity_used: Number(newIng.quantity_used),
      raw_materials: { id: rm.id, name: rm.name, unit: rm.unit },
    }]);
    setNewIng({ raw_material_id: "", quantity_used: "1" });
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
    if (!d.ok && d.shortages?.length) { setProdShortages(d.shortages); return; }
    if (!d.ok) { setProdError(d.error ?? "Production failed."); return; }
    setProdSuccess(true);
    setProdQty("1"); setProdNotes("");
    loadBatches(); loadRM();
    if (tab === "ledger") loadLedger();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-8 pt-8 pb-16">

      {/* Header */}
      <div className="mb-5">
        <p className="font-display text-[0.44rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.35)] mb-1">Management</p>
        <h1 className="font-display text-ivory" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>Inventory</h1>
      </div>

      {/* Low-stock banner */}
      {(fgLow > 0 || rmLow > 0) && (
        <div className="mb-5 rounded-[6px] border border-[rgba(200,80,80,0.25)] bg-[rgba(200,80,80,0.06)] px-4 py-2.5">
          <p className="font-display text-[0.42rem] tracking-[0.16em] uppercase text-[rgba(200,80,80,0.70)]">
            {fgLow > 0 && `${fgLow} finished product${fgLow > 1 ? "s" : ""} below reorder level`}
            {fgLow > 0 && rmLow > 0 && "  ·  "}
            {rmLow > 0 && `${rmLow} raw material${rmLow > 1 ? "s" : ""} below threshold`}
          </p>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-[rgba(196,163,115,0.10)]">
        {([
          { key: "ledger",     label: "Stock Ledger" },
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

      {/* ── TAB: Stock Ledger ────────────────────────────────────────────── */}
      {tab === "ledger" && (
        <div className="flex flex-col gap-4">

          {/* Date range filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <p className="font-display text-[0.42rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.40)]">Period</p>
            <input
              type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="bg-[rgba(255,255,255,0.03)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-1.5 font-body font-light text-[0.82rem] text-ivory focus:outline-none focus:border-[rgba(196,163,115,0.40)]"
            />
            <span className="text-[rgba(245,237,224,0.25)] text-[0.80rem]">→</span>
            <input
              type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="bg-[rgba(255,255,255,0.03)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-1.5 font-body font-light text-[0.82rem] text-ivory focus:outline-none focus:border-[rgba(196,163,115,0.40)]"
            />
            <button
              onClick={loadLedger}
              className="font-display text-[0.42rem] tracking-[0.14em] uppercase px-3 py-1.5 border border-[rgba(196,163,115,0.25)] rounded-[3px] text-[rgba(196,163,115,0.65)] hover:text-brass hover:border-[rgba(196,163,115,0.45)] transition-colors"
            >
              Refresh
            </button>
          </div>

          {ledgerLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[6px] border border-[rgba(196,163,115,0.10)]">
              <table className="w-full border-collapse text-ivory" style={{ minWidth: "1100px" }}>

                {/* Group header */}
                <thead>
                  <tr className="bg-[#1e0c17] border-b border-[rgba(196,163,115,0.12)]">
                    <th className={TH_LEFT + " bg-[#1e0c17]"} rowSpan={2} style={{ minWidth: 180 }}>Product Name</th>
                    <th className={TH + " text-[rgba(196,163,115,0.45)]"} rowSpan={2}>Opening<br/>Stock</th>
                    <th className={TH + " text-[rgba(196,163,115,0.45)]"} rowSpan={2}>Stock In<br/>(Production)</th>
                    <th className={TH + " text-[rgba(196,163,115,0.45)] border-l border-[rgba(196,163,115,0.10)]"} colSpan={5}>
                      Stock Out (Sales / Usage)
                    </th>
                    <th className={TH + " text-[rgba(196,163,115,0.45)] border-l border-[rgba(196,163,115,0.10)]"} rowSpan={2}>Closing<br/>Stock</th>
                    <th className={TH + " text-[rgba(196,163,115,0.30)] border-l border-[rgba(196,163,115,0.08)]"} rowSpan={2} style={{ background: "rgba(196,163,115,0.04)" }}>WIP<br/>(Raw Stock)</th>
                    <th className={TH + " text-[rgba(196,163,115,0.45)]"} rowSpan={2}>Total<br/>Available</th>
                    <th className={TH + " text-[rgba(196,163,115,0.45)]"} rowSpan={2}>Reorder<br/>Level</th>
                    <th className={TH_LEFT + " text-[rgba(196,163,115,0.45)]"} rowSpan={2} style={{ minWidth: 160 }}>Remarks</th>
                  </tr>
                  <tr className="bg-[#1e0c17] border-b border-[rgba(196,163,115,0.12)]">
                    <th className={TH + " text-[rgba(196,163,115,0.30)] border-l border-[rgba(196,163,115,0.10)]"}>Amazon</th>
                    <th className={TH + " text-[rgba(196,163,115,0.30)]"}>Flipkart</th>
                    <th className={TH + " text-[rgba(196,163,115,0.30)]"}>Meesho</th>
                    <th className={TH + " text-[rgba(196,163,115,0.45)]"}>Website</th>
                    <th className={TH + " text-[rgba(196,163,115,0.45)]"}>Offline</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[rgba(196,163,115,0.05)]">
                  {ledger.map(row => {
                    const rowBg = row.low
                      ? "bg-[rgba(200,80,80,0.05)] hover:bg-[rgba(200,80,80,0.08)]"
                      : "bg-[#12060e] hover:bg-[rgba(196,163,115,0.03)]";
                    return (
                      <tr key={row.id} className={rowBg + " transition-colors"}>
                        <td className={TD_LEFT + " font-display text-ivory"} style={{ fontSize: "0.78rem", letterSpacing: "0.03em" }}>
                          {row.name}
                        </td>
                        <td className={TD + " text-[rgba(245,237,224,0.50)]"}>
                          <EditCell productId={row.id} field="opening" value={row.opening} className="text-[rgba(245,237,224,0.50)]" />
                        </td>
                        <td className={TD + " text-[rgba(100,210,130,0.75)]"}>
                          <EditCell productId={row.id} field="stock_in" value={row.stock_in} className="text-[rgba(100,210,130,0.75)]" />
                        </td>

                        {/* Stock out — Amazon / Flipkart / Meesho / Website: click to edit */}
                        <td className={TD + " border-l border-[rgba(196,163,115,0.06)]"} style={{ minWidth: 60 }}>
                          <EditCell productId={row.id} field="amazon"   value={row.out_amazon}   />
                        </td>
                        <td className={TD} style={{ minWidth: 60 }}>
                          <EditCell productId={row.id} field="flipkart" value={row.out_flipkart} />
                        </td>
                        <td className={TD} style={{ minWidth: 60 }}>
                          <EditCell productId={row.id} field="meesho"   value={row.out_meesho}   />
                        </td>
                        <td className={TD} style={{ minWidth: 60 }}>
                          <EditCell productId={row.id} field="website"  value={row.out_website}  />
                        </td>
                        <td className={TD + " text-[rgba(245,237,224,0.45)]"}>{row.out_offline > 0 ? fmt(row.out_offline) : "0"}</td>

                        {/* Closing stock — click to set directly */}
                        <td className={[TD + " border-l border-[rgba(196,163,115,0.08)]", row.low ? "text-[rgba(200,80,80,0.90)]" : "text-ivory"].join(" ")}
                          style={{ fontSize: "0.85rem" }}>
                          <EditCell productId={row.id} field="closing" value={row.closing}
                            className={row.low ? "text-[rgba(200,80,80,0.90)] hover:text-[rgba(200,80,80,1)]" : "text-ivory"} />
                          {row.low && <span className="block font-display text-[0.34rem] tracking-[0.12em] uppercase text-[rgba(200,80,80,0.65)] mt-0.5">low</span>}
                        </td>

                        {/* WIP — click to override */}
                        <td className={TD + " border-l border-[rgba(196,163,115,0.08)]"}
                          style={{ background: "rgba(196,163,115,0.03)" }}>
                          <EditCell productId={row.id} field="wip" value={row.wip}
                            className={row.wip > 0 ? "text-[rgba(196,163,115,0.75)]" : "text-[rgba(245,237,224,0.20)]"} />
                        </td>

                        {/* Total — auto (closing + wip), read-only */}
                        <td className={TD + " text-ivory"}>{fmt(row.total)}</td>

                        {/* Reorder level — click to edit */}
                        <td className={TD}>
                          <EditCell productId={row.id} field="reorder" value={row.reorder}
                            className="text-[rgba(196,163,115,0.60)]" />
                        </td>

                        {/* Remarks — click to edit text */}
                        <td className={TD_LEFT} style={{ minWidth: 160 }}>
                          <EditCell productId={row.id} field="remarks" value={row.remarks || ""}
                            numeric={false}
                            className="font-body font-light text-[0.72rem] text-[rgba(245,237,224,0.38)] italic" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Totals row */}
                <tfoot>
                  <tr className="bg-[#1e0c17] border-t border-[rgba(196,163,115,0.15)]">
                    <td className={TD_LEFT + " font-display text-[rgba(196,163,115,0.60)] text-[0.44rem] tracking-[0.16em] uppercase"}>Total</td>
                    <td className={TD + " font-display text-ivory"}>{fmt(totals.opening)}</td>
                    <td className={TD + " font-display text-[rgba(100,210,130,0.75)]"}>{totals.stock_in > 0 ? `+${fmt(totals.stock_in)}` : "0"}</td>
                    <td className={TD + " font-display text-ivory border-l border-[rgba(196,163,115,0.06)]"}>{fmt(totals.out_amazon)}</td>
                    <td className={TD + " font-display text-ivory"}>{fmt(totals.out_flipkart)}</td>
                    <td className={TD + " font-display text-ivory"}>{fmt(totals.out_meesho)}</td>
                    <td className={TD + " font-display text-ivory"}>{fmt(totals.out_website)}</td>
                    <td className={TD + " font-display text-ivory"}>{fmt(totals.out_offline)}</td>
                    <td className={TD + " font-display text-ivory border-l border-[rgba(196,163,115,0.08)]"} style={{ fontSize: "0.90rem" }}>{fmt(totals.closing)}</td>
                    <td className={TD + " font-display border-l border-[rgba(196,163,115,0.08)]"} style={{ background: "rgba(196,163,115,0.04)", color: "rgba(196,163,115,0.70)" }}>{fmt(totals.wip)}</td>
                    <td className={TD + " font-display text-ivory"}>{fmt(totals.total)}</td>
                    <td className={TD + " text-[rgba(245,237,224,0.30)]"}>—</td>
                    <td className={TD_LEFT + " text-[rgba(245,237,224,0.30)]"}>—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <p className="font-body font-light text-[0.72rem] text-[rgba(245,237,224,0.22)] italic">
            Click any number to edit it. Amazon / Flipkart / Meesho / Website are saved per period. Offline = admin-logged sales (edit via Offline Sales page). Opening Stock, WIP, and Total are calculated automatically.
          </p>
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
                <div className="py-12 text-center font-body font-light text-[0.82rem] text-[rgba(245,237,224,0.25)]">No raw materials yet.</div>
              ) : (
                <div className="divide-y divide-[rgba(196,163,115,0.06)]">
                  {rawMats.map(rm => {
                    const low   = rm.current_stock <= rm.low_stock_threshold;
                    const isAdj = adjustingRm === rm.id;
                    return (
                      <div key={rm.id} className="grid grid-cols-[1fr_120px_70px_90px_90px_180px] gap-4 items-center px-5 py-3.5">
                        <p className="font-display text-ivory truncate" style={{ fontSize: "0.78rem", letterSpacing: "0.04em" }}>{rm.name}</p>
                        <span className="font-display text-[0.42rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.42)]">{RM_CAT_LABELS[rm.category] ?? rm.category}</span>
                        <span className="font-body font-light text-[0.80rem] text-[rgba(245,237,224,0.55)]">{rm.unit}</span>
                        <span className={`font-display text-[0.88rem] tracking-wide ${low ? "text-[rgba(200,80,80,0.85)]" : "text-ivory"}`}>
                          {fmt(rm.current_stock)}
                          {low && <span className="ml-1 font-display text-[0.36rem] tracking-[0.10em] uppercase text-[rgba(200,80,80,0.65)]">low</span>}
                        </span>
                        <span className="font-body font-light text-[0.80rem] text-[rgba(245,237,224,0.40)]">{fmt(rm.low_stock_threshold)}</span>
                        <div className="flex items-center gap-2">
                          {isAdj ? (
                            <>
                              <input type="number" min={0} step="0.01" value={adjustValue}
                                onChange={e => setAdjustValue(e.target.value)}
                                className="w-20 bg-[rgba(255,255,255,0.04)] border border-[rgba(196,163,115,0.30)] rounded-[3px] px-2 py-1 font-body text-[0.80rem] text-ivory focus:outline-none"
                              />
                              <button onClick={() => submitAdjustRm(rm)} disabled={savingRmAdj}
                                className="font-display text-[0.38rem] tracking-[0.12em] uppercase px-2 py-1 rounded-[3px] border border-[rgba(196,163,115,0.30)] text-brass hover:bg-[rgba(196,163,115,0.08)] transition-colors disabled:opacity-30">
                                {savingRmAdj ? "…" : "Save"}
                              </button>
                              <button onClick={() => setAdjustingRm(null)} className="font-display text-[0.36rem] uppercase text-[rgba(245,237,224,0.30)] hover:text-[rgba(245,237,224,0.60)] transition-colors">Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => { setAdjustingRm(rm.id); setAdjustValue(String(rm.current_stock)); }}
                              className="font-display text-[0.38rem] tracking-[0.12em] uppercase px-2.5 py-1.5 rounded-[3px] border border-[rgba(196,163,115,0.22)] text-[rgba(196,163,115,0.60)] hover:text-brass hover:border-[rgba(196,163,115,0.45)] transition-colors">
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

          {!showAddMat ? (
            <button onClick={() => setShowAddMat(true)} className="self-start flex items-center gap-2 px-4 py-2.5 rounded-[4px] bg-[rgba(196,163,115,0.08)] border border-[rgba(196,163,115,0.18)] text-[rgba(196,163,115,0.65)] hover:text-brass transition-colors">
              <span className="text-[1rem]">+</span>
              <span className="font-display text-[0.46rem] tracking-[0.16em] uppercase">Add Raw Material</span>
            </button>
          ) : (
            <form onSubmit={submitNewMat} className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] p-6">
              <p className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.40)] mb-4">New Raw Material</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col gap-1.5"><label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Name</label>
                  <input type="text" required value={newMat.name} onChange={e => setNewMat(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Soy Wax" className={inputCls} /></div>
                <div className="flex flex-col gap-1.5"><label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Category</label>
                  <select value={newMat.category} onChange={e => setNewMat(p => ({ ...p, category: e.target.value as typeof RAW_CATEGORIES[number] }))} className={selectCls}>
                    {RAW_CATEGORIES.map(c => <option key={c} value={c} style={optStyle}>{RM_CAT_LABELS[c]}</option>)}</select></div>
                <div className="flex flex-col gap-1.5"><label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Unit</label>
                  <select value={newMat.unit} onChange={e => setNewMat(p => ({ ...p, unit: e.target.value as typeof RAW_UNITS[number] }))} className={selectCls}>
                    {RAW_UNITS.map(u => <option key={u} value={u} style={optStyle}>{u}</option>)}</select></div>
                <div className="flex flex-col gap-1.5"><label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Current Stock</label>
                  <input type="number" min={0} step="0.01" required value={newMat.current_stock} onChange={e => setNewMat(p => ({ ...p, current_stock: e.target.value }))} className={inputCls} /></div>
                <div className="flex flex-col gap-1.5"><label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Low-Stock Threshold</label>
                  <input type="number" min={0} step="0.01" value={newMat.low_stock_threshold} onChange={e => setNewMat(p => ({ ...p, low_stock_threshold: e.target.value }))} className={inputCls} /></div>
                <div className="flex flex-col gap-1.5"><label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Cost per Unit (optional)</label>
                  <input type="number" min={0} step="0.01" value={newMat.cost_per_unit} onChange={e => setNewMat(p => ({ ...p, cost_per_unit: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={savingMat} className="px-5 py-2 rounded-[4px] bg-[rgba(196,163,115,0.12)] border border-[rgba(196,163,115,0.28)] text-brass font-display text-[0.44rem] tracking-[0.16em] uppercase hover:bg-[rgba(196,163,115,0.18)] transition-colors disabled:opacity-40">{savingMat ? "Saving…" : "Save Material"}</button>
                <button type="button" onClick={() => setShowAddMat(false)} className="font-display text-[0.44rem] tracking-[0.14em] uppercase text-[rgba(245,237,224,0.30)] hover:text-[rgba(245,237,224,0.60)] transition-colors">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── TAB: Log Production ───────────────────────────────────────────── */}
      {tab === "production" && (
        <div className="flex flex-col gap-6 max-w-2xl">
          <form onSubmit={submitProduction} className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] p-6 flex flex-col gap-4">
            <p className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.40)]">Log a Production Batch</p>
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">Product</label>
                <select value={prodProduct} onChange={e => handleProductChange(e.target.value)} className={selectCls} required>
                  <option value="" style={optStyle}>Select product…</option>
                  {allProducts.map(p => <option key={p.id} value={p.id} style={optStyle}>{p.name} (stock: {p.stock})</option>)}
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
                {prodShortages.map((s, i) => (
                  <p key={i} className="font-body font-light text-[0.80rem] text-[rgba(245,237,224,0.55)]">
                    <span className="text-ivory">{s.name}</span> — need {fmt(s.required)} {s.unit}, have {fmt(s.available)}
                    <span className="text-[rgba(210,90,90,0.70)]"> (short {fmt(s.short_by)} {s.unit})</span>
                  </p>
                ))}
              </div>
            )}
            {prodSuccess && <p className="font-body font-light text-[0.82rem] text-[rgba(100,210,130,0.80)]">Batch logged. Stock updated.</p>}
            <button type="submit" disabled={prodSubmitting} className="self-start px-6 py-2.5 rounded-[4px] bg-[rgba(196,163,115,0.12)] border border-[rgba(196,163,115,0.28)] text-brass font-display text-[0.46rem] tracking-[0.16em] uppercase hover:bg-[rgba(196,163,115,0.18)] transition-colors disabled:opacity-40">
              {prodSubmitting ? "Processing…" : "Log Batch"}
            </button>
          </form>

          {/* Recipe editor */}
          {prodProduct && (
            <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.40)]">
                  Recipe — {allProducts.find(p => p.id === prodProduct)?.name}
                </p>
                {recipeEdited && (
                  <button onClick={saveRecipe} disabled={savingRecipe}
                    className="font-display text-[0.40rem] tracking-[0.14em] uppercase px-3 py-1.5 rounded-[3px] border border-[rgba(196,163,115,0.30)] text-brass hover:bg-[rgba(196,163,115,0.10)] transition-colors disabled:opacity-40">
                    {savingRecipe ? "Saving…" : "Save Recipe"}
                  </button>
                )}
              </div>
              {recipeLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
              ) : recipe.length === 0 ? (
                <p className="font-body font-light text-[0.80rem] text-[rgba(245,237,224,0.30)]">No recipe set. Add ingredients below.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="grid grid-cols-[1fr_100px_50px_40px] gap-3 pb-1.5 border-b border-[rgba(196,163,115,0.08)]">
                    {["Ingredient","Qty / unit","Unit",""].map(h => (
                      <span key={h} className="font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.30)]">{h}</span>
                    ))}
                  </div>
                  {recipe.map((row, idx) => (
                    <div key={row.id} className="grid grid-cols-[1fr_100px_50px_40px] gap-3 items-center py-1.5">
                      <span className="font-body font-light text-[0.82rem] text-ivory">{row.raw_materials?.name ?? row.raw_material_id}</span>
                      <input type="number" min={0.01} step="0.01" value={row.quantity_used}
                        onChange={e => { setRecipe(prev => prev.map((r, i) => i === idx ? { ...r, quantity_used: Number(e.target.value) } : r)); setRecipeEdited(true); }}
                        className="bg-[rgba(255,255,255,0.03)] border border-[rgba(196,163,115,0.15)] rounded-[3px] px-2 py-1 font-body text-[0.82rem] text-ivory focus:outline-none w-full"
                      />
                      <span className="font-body font-light text-[0.78rem] text-[rgba(245,237,224,0.40)]">{row.raw_materials?.unit}</span>
                      <button onClick={() => { setRecipe(prev => prev.filter((_, i) => i !== idx)); setRecipeEdited(true); }} className="text-[rgba(210,90,90,0.45)] hover:text-[rgba(210,90,90,0.80)] text-[0.85rem] transition-colors">×</button>
                    </div>
                  ))}
                </div>
              )}
              {rawMats.length > 0 && (
                <div className="flex items-end gap-3 pt-2 border-t border-[rgba(196,163,115,0.08)]">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.35)]">Raw Material</label>
                    <select value={newIng.raw_material_id} onChange={e => setNewIng(p => ({ ...p, raw_material_id: e.target.value }))} className={selectCls}>
                      <option value="" style={optStyle}>Select…</option>
                      {rawMats.filter(rm => !recipe.some(r => r.raw_material_id === rm.id)).map(rm =>
                        <option key={rm.id} value={rm.id} style={optStyle}>{rm.name} ({rm.unit})</option>
                      )}
                    </select>
                  </div>
                  <div className="w-28 flex flex-col gap-1.5">
                    <label className="font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.35)]">Qty per unit</label>
                    <input type="number" min={0.01} step="0.01" value={newIng.quantity_used} onChange={e => setNewIng(p => ({ ...p, quantity_used: e.target.value }))} className={inputCls} />
                  </div>
                  <button onClick={addIngredient} disabled={!newIng.raw_material_id}
                    className="font-display text-[0.42rem] tracking-[0.14em] uppercase px-3 py-2 rounded-[3px] border border-[rgba(196,163,115,0.25)] text-[rgba(196,163,115,0.60)] hover:text-brass hover:border-[rgba(196,163,115,0.45)] transition-colors disabled:opacity-30">
                    Add
                  </button>
                </div>
              )}
              {recipeEdited && (
                <button onClick={saveRecipe} disabled={savingRecipe}
                  className="self-start px-5 py-2 rounded-[4px] bg-[rgba(196,163,115,0.10)] border border-[rgba(196,163,115,0.28)] text-brass font-display text-[0.44rem] tracking-[0.14em] uppercase hover:bg-[rgba(196,163,115,0.16)] transition-colors disabled:opacity-40">
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
              <div className="flex items-center justify-center h-24"><div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" /></div>
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
                    <span className="font-body font-light text-[0.82rem] text-ivory truncate">{(b.products as { name: string } | null)?.name ?? b.product_id}</span>
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
