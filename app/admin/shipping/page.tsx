"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-display text-[0.48rem] tracking-[0.20em] uppercase text-[rgba(196,163,115,0.55)]">{label}</label>
      {children}
      {hint && <p className="font-body font-light text-[0.68rem] text-[rgba(245,237,224,0.30)]">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-4 py-2.5 font-body font-light text-[0.88rem] text-ivory placeholder:text-[rgba(245,237,224,0.22)] focus:outline-none focus:border-[rgba(196,163,115,0.50)] transition-colors";

// ── Shipping Rate interfaces ───────────────────────────────────────────────────

interface ShippingZone { id: string; pincode_prefix: string; zone_name: string; }
interface ShippingRate { id: string; zone_name: string; min_weight_grams: number; max_weight_grams: number | null; rate: number; }

function fmtWeight(min: number, max: number | null) {
  const lo = min >= 1000 ? `${min / 1000}kg` : `${min}g`;
  if (max == null) return `${lo}+`;
  const hi = max >= 1000 ? `${max / 1000}kg` : `${max}g`;
  return `${lo} – ${hi}`;
}

function RateCell({ rate, onSave }: { rate: ShippingRate | undefined; onSave(r: number): void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  if (!rate) return <td className="px-4 py-3 text-center text-[rgba(245,237,224,0.18)] text-[0.82rem]">—</td>;
  if (editing) {
    return (
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <span className="text-[rgba(196,163,115,0.60)] text-[0.78rem]">₹</span>
          <input
            autoFocus type="number" value={val} onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { onSave(Number(val)); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
            className="w-16 bg-[rgba(245,237,224,0.06)] border border-[rgba(196,163,115,0.40)] rounded-[3px] px-2 py-1 text-ivory text-[0.82rem] text-center focus:outline-none"
          />
          <button onClick={() => { onSave(Number(val)); setEditing(false); }} className="text-[rgba(196,163,115,0.70)] hover:text-brass text-[0.70rem] px-1">✓</button>
          <button onClick={() => setEditing(false)} className="text-[rgba(245,237,224,0.25)] hover:text-[rgba(245,237,224,0.55)] text-[0.70rem] px-1">✕</button>
        </div>
      </td>
    );
  }
  return (
    <td className="px-4 py-3 text-center cursor-pointer group" onClick={() => { setVal(String(rate.rate)); setEditing(true); }}>
      <span className="font-display text-ivory group-hover:text-brass transition-colors duration-150" style={{ fontSize: "0.87rem", letterSpacing: "0.04em" }}>₹{rate.rate}</span>
      <span className="ml-1 opacity-0 group-hover:opacity-40 transition-opacity duration-150 text-[0.60rem]">✎</span>
    </td>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ShippingSettingsPage() {

  // ── Store settings state ──────────────────────────────────────────────────
  const [shippingFee,           setShippingFee]           = useState("");
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [settingsError, setSettingsError] = useState("");

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/store-settings", {
      headers: { authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    if (res.ok) {
      const d = await res.json() as Record<string, string>;
      setShippingFee(d.shipping_fee ?? "99");
      setFreeShippingThreshold(d.free_shipping_threshold ?? "1500");
    }
    setSettingsLoading(false);
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  async function handleSave() {
    const fee       = Number(shippingFee);
    const threshold = Number(freeShippingThreshold);
    if (isNaN(fee) || fee < 0)             return setSettingsError("Shipping fee must be 0 or more.");
    if (isNaN(threshold) || threshold < 0) return setSettingsError("Free shipping threshold must be 0 or more.");
    setSaving(true); setSettingsError(""); setSaved(false);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/store-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ shipping_fee: fee, free_shipping_threshold: threshold }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else { const j = await res.json().catch(() => ({})) as { error?: string }; setSettingsError(j.error ?? "Save failed"); }
  }

  // ── Rate table state ──────────────────────────────────────────────────────
  const [zones,      setZones]      = useState<ShippingZone[]>([]);
  const [rates,      setRates]      = useState<ShippingRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError,   setRatesError]   = useState<string | null>(null);
  const [newPrefix,    setNewPrefix]    = useState("");
  const [newZoneName,  setNewZoneName]  = useState("");
  const [prefixSaving, setPrefixSaving] = useState(false);

  const loadRates = useCallback(async () => {
    setRatesLoading(true);
    const res = await fetch("/api/admin/shipping-config");
    const data = await res.json();
    if (!res.ok) { setRatesError(data.error); setRatesLoading(false); return; }
    setZones(data.zones ?? []);
    setRates(data.rates ?? []);
    setRatesError(null);
    setRatesLoading(false);
  }, []);

  useEffect(() => { loadRates(); }, [loadRates]);

  const zoneNames = Array.from(new Set(rates.map(r => r.zone_name))).sort();
  const tiers = Array.from(
    new Map(rates.map(r => [`${r.min_weight_grams}:${r.max_weight_grams}`, r])).values()
  ).sort((a, b) => a.min_weight_grams - b.min_weight_grams);

  function getRate(zone: string, tier: ShippingRate) {
    return rates.find(r => r.zone_name === zone && r.min_weight_grams === tier.min_weight_grams && r.max_weight_grams === tier.max_weight_grams);
  }

  async function saveRate(id: string, rate: number) {
    setRates(prev => prev.map(r => r.id === id ? { ...r, rate } : r));
    await fetch("/api/admin/shipping-config", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_rate", id, rate }),
    });
  }

  async function deleteZonePrefix(id: string) {
    setZones(prev => prev.filter(z => z.id !== id));
    await fetch("/api/admin/shipping-config", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_zone_prefix", id }),
    });
  }

  async function addZonePrefix() {
    const prefix = newPrefix.trim();
    const zoneName = newZoneName.trim();
    if (!/^\d{2}$/.test(prefix) || !zoneName) return;
    setPrefixSaving(true);
    const res = await fetch("/api/admin/shipping-config", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_zone_prefix", pincode_prefix: prefix, zone_name: zoneName }),
    });
    if (res.ok) { setNewPrefix(""); setNewZoneName(""); await loadRates(); }
    setPrefixSaving(false);
  }

  const zonesByName = zones.reduce<Record<string, ShippingZone[]>>((acc, z) => {
    (acc[z.zone_name] ??= []).push(z); return acc;
  }, {});
  const allZoneNames = Array.from(new Set([...zoneNames, ...Object.keys(zonesByName)])).sort();

  return (
    <div className="min-h-screen bg-[#12060e] pt-8 pb-16 px-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-10">

        {/* ── Header ── */}
        <div>
          <p className="font-display text-[0.50rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.38)] mb-2">Admin · Store Settings</p>
          <h1 className="font-display text-ivory" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", letterSpacing: "0.05em" }}>Shipping</h1>
          <div className="mt-4 w-10 h-px bg-[rgba(196,163,115,0.22)]" />
        </div>

        {/* ── Store settings ── */}
        {settingsLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
          </div>
        ) : (
          <div className="bg-[#1f0b17] border border-[rgba(196,163,115,0.10)] rounded-[6px] p-7 flex flex-col gap-6">
            <p className="font-display text-[0.50rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.45)]">Fallback &amp; Threshold</p>

            <Field label="Fallback Shipping Fee (₹)" hint="Shown when pincode has no zone match. Set to 0 for always-free.">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body text-[rgba(196,163,115,0.55)] text-[0.88rem]">₹</span>
                <input type="number" min="0" step="1" value={shippingFee} onChange={e => setShippingFee(e.target.value)} className={inputCls + " pl-8"} />
              </div>
            </Field>

            <Field label="Free Shipping Above (₹)" hint="Orders at or above this amount get free shipping. Set to 0 to disable.">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body text-[rgba(196,163,115,0.55)] text-[0.88rem]">₹</span>
                <input type="number" min="0" step="1" value={freeShippingThreshold} onChange={e => setFreeShippingThreshold(e.target.value)} className={inputCls + " pl-8"} />
              </div>
            </Field>

            {settingsError && <p className="font-body font-light text-[rgba(210,90,90,0.75)] text-[0.75rem]">{settingsError}</p>}

            <button onClick={handleSave} disabled={saving}
              className="self-start font-display text-[0.50rem] tracking-[0.18em] uppercase rounded-[3px] px-8 py-3 border transition-all active:scale-[0.98] disabled:opacity-40 border-[rgba(196,163,115,0.42)] text-brass hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.65)]">
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
            </button>
          </div>
        )}

        {/* ── Rate Table ── */}
        <div className="bg-[#1f0b17] border border-[rgba(196,163,115,0.10)] rounded-[6px] p-7 flex flex-col gap-6">
          <div>
            <p className="font-display text-[0.50rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.45)] mb-1">Rate Table</p>
            <p className="font-body font-light text-[rgba(245,237,224,0.30)] text-[0.76rem]">
              Click any cell to edit. Zone is matched by the first 2 digits of the customer&apos;s pincode. Unmatched pincodes use the fallback fee above.
            </p>
          </div>

          {ratesLoading && (
            <div className="flex items-center gap-3 text-[rgba(245,237,224,0.35)] text-[0.85rem]">
              <div className="w-4 h-4 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" /> Loading…
            </div>
          )}
          {ratesError && <p className="text-[rgba(210,80,80,0.70)] text-[0.85rem]">{ratesError}</p>}

          {!ratesLoading && !ratesError && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-[rgba(196,163,115,0.10)] rounded-[4px] overflow-hidden">
                  <thead>
                    <tr className="bg-[rgba(196,163,115,0.06)]">
                      <th className="px-4 py-3 text-left font-display text-[0.44rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.50)] border-b border-[rgba(196,163,115,0.10)]">Weight</th>
                      {zoneNames.map(z => (
                        <th key={z} className="px-4 py-3 text-center font-display text-[0.44rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.50)] border-b border-[rgba(196,163,115,0.10)] border-l border-l-[rgba(196,163,115,0.07)]">{z}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((tier, i) => (
                      <tr key={`${tier.min_weight_grams}-${tier.max_weight_grams}`} className={i % 2 === 0 ? "" : "bg-[rgba(196,163,115,0.02)]"}>
                        <td className="px-4 py-3 font-body font-light text-[rgba(245,237,224,0.50)] text-[0.82rem] whitespace-nowrap">
                          {fmtWeight(tier.min_weight_grams, tier.max_weight_grams)}
                        </td>
                        {zoneNames.map(z => {
                          const r = getRate(z, tier);
                          return <RateCell key={z} rate={r} onSave={newRate => r && saveRate(r.id, newRate)} />;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Pincode prefix mappings ── */}
              <div className="mt-2 flex flex-col gap-4">
                <p className="font-display text-[0.44rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.40)]">Pincode Prefix Mappings</p>
                <div className="flex flex-col gap-3">
                  {allZoneNames.map(zoneName => (
                    <div key={zoneName} className="flex items-center gap-3 flex-wrap">
                      <span className="font-display text-[0.46rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.45)] w-20 flex-shrink-0">{zoneName}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(zonesByName[zoneName] ?? []).map(z => (
                          <span key={z.id} className="flex items-center gap-1 px-2.5 py-1 bg-[rgba(196,163,115,0.06)] border border-[rgba(196,163,115,0.15)] rounded-[3px] font-display text-ivory" style={{ fontSize: "0.76rem", letterSpacing: "0.06em" }}>
                            {z.pincode_prefix}
                            <button onClick={() => deleteZonePrefix(z.id)} className="ml-0.5 text-[rgba(245,237,224,0.25)] hover:text-[rgba(210,80,80,0.65)] transition-colors text-[0.60rem]">×</button>
                          </span>
                        ))}
                        {(zonesByName[zoneName] ?? []).length === 0 && (
                          <span className="font-body font-light text-[rgba(245,237,224,0.20)] text-[0.78rem] italic">none</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add prefix form */}
                <div className="flex items-end gap-3 flex-wrap pt-2 border-t border-[rgba(196,163,115,0.08)]">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-display text-[0.42rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.40)]">Prefix (2 digits)</label>
                    <input type="text" value={newPrefix} onChange={e => setNewPrefix(e.target.value.replace(/\D/g, "").slice(0, 2))}
                      placeholder="80" maxLength={2}
                      className="w-20 bg-[rgba(245,237,224,0.03)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-display text-ivory text-[0.82rem] tracking-[0.06em] focus:outline-none focus:border-[rgba(196,163,115,0.45)] placeholder:text-[rgba(245,237,224,0.15)]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-display text-[0.42rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.40)]">Zone</label>
                    <select value={newZoneName} onChange={e => setNewZoneName(e.target.value)}
                      className="bg-[rgba(245,237,224,0.03)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-display text-ivory text-[0.78rem] tracking-[0.06em] focus:outline-none focus:border-[rgba(196,163,115,0.45)] appearance-none cursor-pointer">
                      <option value="" disabled className="bg-damson">Select…</option>
                      {allZoneNames.map(z => <option key={z} value={z} className="bg-damson">{z}</option>)}
                    </select>
                  </div>
                  <button onClick={addZonePrefix} disabled={prefixSaving || !/^\d{2}$/.test(newPrefix) || !newZoneName}
                    className="px-5 py-2 font-display text-[0.48rem] tracking-[0.16em] uppercase text-brass border border-[rgba(196,163,115,0.38)] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.55)] rounded-[3px] transition-all duration-150 disabled:opacity-35 disabled:cursor-not-allowed">
                    {prefixSaving ? "···" : "+ Add"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Info ── */}
        <div className="rounded-[4px] border border-[rgba(196,163,115,0.08)] bg-[rgba(196,163,115,0.03)] px-5 py-4">
          <p className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.35)] mb-2">Note</p>
          <p className="font-body font-light text-[0.73rem] text-[rgba(245,237,224,0.35)] leading-relaxed">
            Changes to rates take effect immediately at checkout. Pincode prefix matches the first 2 digits — e.g. prefix &quot;80&quot; covers all 800xxx–809xxx pincodes.
          </p>
        </div>

      </div>
    </div>
  );
}
