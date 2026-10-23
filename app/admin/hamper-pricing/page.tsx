"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

interface Product {
  id: string; name: string; category: string; price: number;
  cogs: number | null; hamper_price: number | null;
}

interface HamperBox { id: string; name: string; price: number; }

interface HamperSettings {
  min_total: number; max_total: number;
  gst_rate: number; shipping_allowance: number;
  payment_gateway_fee: number; box_cost: number;
  minimum_margin_floor: number; order_by_banner_text: string | null;
}

const FIELD  = "w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.32)] focus:border-[rgba(196,163,115,0.55)] rounded-[3px] px-3 py-2 font-body font-light text-[rgba(245,237,224,0.75)] text-sm focus:outline-none transition-colors duration-150 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const LABEL  = "block font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.45)] mb-1";

const CATEGORY_ORDER = ["candle", "idol", "bracelet", "pooja-essentials"];

function marginPct(revenue: number, cogs: number, fees: number): number {
  if (revenue <= 0) return 0;
  return Math.round(((revenue - cogs - fees) / revenue) * 100);
}

export default function HamperPricingPage() {
  const [products,      setProducts]      = useState<Product[]>([]);
  const [settings,      setSettings]      = useState<HamperSettings | null>(null);
  const [drafts,        setDrafts]        = useState<Record<string, { cogs: string; hamper_price: string }>>({});
  const [settingDraft,  setSettingDraft]  = useState<HamperSettings | null>(null);
  const [saving,        setSaving]        = useState<Record<string, boolean>>({});
  const [savingSettings,setSavingSettings]= useState(false);
  const [boxes,         setBoxes]         = useState<HamperBox[]>([]);
  const [boxPriceDrafts,setBoxPriceDrafts]= useState<Record<string, string>>({});
  const [savingBox,     setSavingBox]     = useState<Record<string, boolean>>({});
  const [toast,         setToast]         = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 4000); }

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  }

  const load = useCallback(async () => {
    const token = await getToken();
    const [prodRes, settRes, boxRes] = await Promise.all([
      fetch("/api/admin/hamper-pricing/products", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/hampers/settings").then(r => r.json()),
      fetch("/api/hampers/builder-config").then(r => r.json()),
    ]);
    const prods: Product[] = prodRes.products ?? [];
    setProducts(prods);
    const d: Record<string, { cogs: string; hamper_price: string }> = {};
    for (const p of prods) d[p.id] = { cogs: p.cogs != null ? String(p.cogs) : "", hamper_price: p.hamper_price != null ? String(p.hamper_price) : "" };
    setDrafts(d);
    const s: HamperSettings = settRes.settings ?? null;
    setSettings(s);
    setSettingDraft(s ? { ...s } : null);
    const bxList: HamperBox[] = boxRes.boxes ?? [];
    setBoxes(bxList);
    const bxDrafts: Record<string, string> = {};
    for (const b of bxList) bxDrafts[b.id] = String(b.price);
    setBoxPriceDrafts(bxDrafts);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveProduct(p: Product) {
    const draft = drafts[p.id];
    if (!draft) return;
    setSaving(s => ({ ...s, [p.id]: true }));
    const token = await getToken();
    const res = await fetch(`/api/admin/hamper-pricing/products?id=${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        cogs: draft.cogs !== "" ? Number(draft.cogs) : null,
        hamper_price: draft.hamper_price !== "" ? Number(draft.hamper_price) : null,
      }),
    });
    if (res.ok) {
      setProducts(prev => prev.map(pr => pr.id === p.id ? {
        ...pr,
        cogs:         draft.cogs !== "" ? Number(draft.cogs) : null,
        hamper_price: draft.hamper_price !== "" ? Number(draft.hamper_price) : null,
      } : pr));
      showToast("Saved");
    } else showToast("Save failed");
    setSaving(s => ({ ...s, [p.id]: false }));
  }

  async function saveBoxPrice(box: HamperBox) {
    setSavingBox(s => ({ ...s, [box.id]: true }));
    const token = await getToken();
    const res = await fetch(`/api/admin/hampers/boxes?id=${box.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: box.name, price: Number(boxPriceDrafts[box.id] ?? 0) }),
    });
    if (res.ok) {
      setBoxes(prev => prev.map(b => b.id === box.id ? { ...b, price: Number(boxPriceDrafts[box.id] ?? 0) } : b));
      showToast("Box price saved");
    } else showToast("Save failed");
    setSavingBox(s => ({ ...s, [box.id]: false }));
  }

  async function saveSettings() {
    if (!settingDraft) return;
    setSavingSettings(true);
    const token = await getToken();
    const res = await fetch("/api/admin/hamper-pricing/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(settingDraft),
    });
    if (res.ok) { setSettings({ ...settingDraft }); showToast("Settings saved"); }
    else showToast("Save failed");
    setSavingSettings(false);
  }

  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    items: products.filter(p => p.category === cat),
  })).filter(g => g.items.length > 0);

  const BTN = "font-display text-[0.44rem] tracking-[0.12em] uppercase text-brass border border-[rgba(196,163,115,0.28)] hover:border-[rgba(196,163,115,0.50)] px-3 py-1.5 rounded-[3px] transition-all duration-150 disabled:opacity-40";

  return (
    <div className="min-h-screen bg-[#12060e] p-8">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <p className="font-display text-[0.44rem] tracking-[0.20em] uppercase text-[rgba(196,163,115,0.38)] mb-1">Admin</p>
          <h1 className="font-display text-ivory" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>Hamper Pricing</h1>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.35)] text-sm mt-1">Set COGS and hamper price per product, then check your margins below.</p>
        </div>

        {/* Global settings */}
        {settingDraft && (
          <section className="mb-10">
            <h2 className="font-display text-[0.58rem] tracking-[0.18em] uppercase text-brass mb-4">Global Settings</h2>
            <div className="bg-[#1a0a12] border border-[rgba(196,163,115,0.12)] rounded-[5px] p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                {(
                  [
                    ["min_total",            "Min Hamper Total (₹)"],
                    ["max_total",            "Max Hamper Total (₹)"],
                    ["gst_rate",             "GST Rate (%)"],
                    ["shipping_allowance",   "Shipping Allowance (₹)"],
                    ["payment_gateway_fee",  "Payment Gateway Fee (%)"],
                    ["box_cost",             "Box Cost (₹)"],
                    ["minimum_margin_floor", "Min Margin Floor (%)"],
                  ] as [keyof HamperSettings, string][]
                ).map(([key, lbl]) => (
                  <div key={key}>
                    <label className={LABEL}>{lbl}</label>
                    <input
                      type="number"
                      className={FIELD}
                      value={String(settingDraft[key] ?? "")}
                      onChange={e => setSettingDraft(d => d ? { ...d, [key]: Number(e.target.value) } : d)}
                    />
                  </div>
                ))}
              </div>
              <div className="mb-4">
                <label className={LABEL}>Order Banner Text (optional)</label>
                <input
                  className={FIELD}
                  value={settingDraft.order_by_banner_text ?? ""}
                  onChange={e => setSettingDraft(d => d ? { ...d, order_by_banner_text: e.target.value || null } : d)}
                  placeholder="e.g. Order by Dec 20 for delivery before Christmas"
                />
              </div>
              <button onClick={saveSettings} disabled={savingSettings} className={BTN}>
                {savingSettings ? "Saving…" : "Save Settings"}
              </button>
            </div>
          </section>
        )}

        {/* Gift Box Prices */}
        {boxes.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-[0.58rem] tracking-[0.18em] uppercase text-brass mb-4">Gift Box Prices</h2>
            <p className="font-body font-light italic text-[rgba(245,237,224,0.35)] text-sm mb-4">Set to 0 to include the box free. A non-zero price adds to the customer&apos;s hamper total.</p>
            <div className="flex flex-col gap-2">
              {boxes.map(box => (
                <div key={box.id} className="bg-[#1a0a12] border border-[rgba(196,163,115,0.10)] rounded-[5px] p-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-ivory text-[0.78rem]" style={{ letterSpacing: "0.03em" }}>{box.name}</p>
                  </div>
                  <div className="w-36">
                    <label className={LABEL}>Price (₹, 0 = Included)</label>
                    <input
                      type="number"
                      className={FIELD}
                      value={boxPriceDrafts[box.id] ?? "0"}
                      onChange={e => setBoxPriceDrafts(d => ({ ...d, [box.id]: e.target.value }))}
                    />
                  </div>
                  <button onClick={() => saveBoxPrice(box)} disabled={savingBox[box.id]} className={BTN}>
                    {savingBox[box.id] ? "…" : "Save"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Product pricing table */}
        {grouped.map(({ cat, items }) => (
          <section key={cat} className="mb-10">
            <h2 className="font-display text-[0.58rem] tracking-[0.18em] uppercase text-brass mb-4 capitalize">{cat.replace("-", " ")}</h2>
            <div className="flex flex-col gap-2">
              {items.map(p => {
                const draft = drafts[p.id] ?? { cogs: "", hamper_price: "" };
                const hp   = draft.hamper_price !== "" ? Number(draft.hamper_price) : null;
                const cogs = draft.cogs !== "" ? Number(draft.cogs) : null;

                let margin: number | null = null;
                if (hp != null && cogs != null && settings) {
                  const gstAmount = hp * (settings.gst_rate / 100);
                  const pgFee     = hp * (settings.payment_gateway_fee / 100);
                  const shippingShare = settings.shipping_allowance / 3;
                  margin = marginPct(hp, cogs + gstAmount + pgFee + shippingShare, 0);
                }

                const marginColor = margin == null
                  ? "text-[rgba(245,237,224,0.28)]"
                  : margin >= (settings?.minimum_margin_floor ?? 30)
                    ? "text-[rgba(100,215,100,0.75)]"
                    : "text-[rgba(220,100,80,0.80)]";

                return (
                  <div key={p.id} className="bg-[#1a0a12] border border-[rgba(196,163,115,0.10)] rounded-[5px] p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-ivory text-[0.78rem]" style={{ letterSpacing: "0.03em" }}>{p.name}</p>
                        <p className="font-display text-[0.38rem] tracking-[0.10em] uppercase text-[rgba(196,163,115,0.35)] mt-0.5">Retail ₹{p.price.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:w-60">
                        <div>
                          <label className={LABEL}>COGS (₹)</label>
                          <input
                            type="number"
                            className={FIELD}
                            value={draft.cogs}
                            onChange={e => setDrafts(d => ({ ...d, [p.id]: { ...draft, cogs: e.target.value } }))}
                            placeholder="—"
                          />
                        </div>
                        <div>
                          <label className={LABEL}>Hamper Price (₹)</label>
                          <input
                            type="number"
                            className={FIELD}
                            value={draft.hamper_price}
                            onChange={e => setDrafts(d => ({ ...d, [p.id]: { ...draft, hamper_price: e.target.value } }))}
                            placeholder="—"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="font-display text-[0.35rem] tracking-[0.10em] uppercase text-[rgba(196,163,115,0.38)]">Margin</p>
                          <p className={`font-display text-[0.80rem] ${marginColor}`}>
                            {margin != null ? `${margin}%` : "—"}
                          </p>
                        </div>
                        <button onClick={() => saveProduct(p)} disabled={saving[p.id]} className={BTN}>
                          {saving[p.id] ? "…" : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a0a12] border border-[rgba(196,163,115,0.30)] px-5 py-3 rounded-[4px]">
          <p className="font-display text-[0.52rem] tracking-[0.14em] uppercase text-brass">{toast}</p>
        </div>
      )}
    </div>
  );
}
