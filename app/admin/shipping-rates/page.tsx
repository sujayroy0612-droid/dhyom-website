"use client";

import { useEffect, useState, useCallback } from "react";

interface ShippingZone { id: string; pincode_prefix: string; zone_name: string; }
interface ShippingRate { id: string; zone_name: string; min_weight_g: number; max_weight_g: number | null; rate: number; }

function fmt(g: number, max: number | null) {
  const lo = g >= 1000 ? `${g / 1000}kg` : `${g}g`;
  if (max == null) return `${lo}+`;
  const hi = max >= 1000 ? `${max / 1000}kg` : `${max}g`;
  return `${lo} – ${hi}`;
}

function Cell({ rate, onSave }: { rate: ShippingRate | undefined; onSave(r: number): void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");

  if (!rate) return <td className="px-4 py-3 text-center text-[rgba(245,237,224,0.18)] text-[0.82rem]">—</td>;

  if (editing) {
    return (
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <span className="text-[rgba(196,163,115,0.60)] text-[0.78rem]">₹</span>
          <input
            autoFocus
            type="number"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { onSave(Number(val)); setEditing(false); }
              if (e.key === "Escape") setEditing(false);
            }}
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
      <span className="ml-1.5 opacity-0 group-hover:opacity-40 transition-opacity duration-150 text-[0.60rem]">✎</span>
    </td>
  );
}

export default function ShippingRatesPage() {
  const [zones, setZones]   = useState<ShippingZone[]>([]);
  const [rates, setRates]   = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  // Zone prefix add form
  const [newPrefix, setNewPrefix] = useState("");
  const [newZoneName, setNewZoneName] = useState("");
  const [prefixSaving, setPrefixSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/shipping-config");
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    setZones(data.zones ?? []);
    setRates(data.rates ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Unique zone names (columns) and weight tiers (rows) derived from rates
  const zoneNames = Array.from(new Set(rates.map(r => r.zone_name))).sort();
  const tiers = Array.from(
    new Map(rates.map(r => [`${r.min_weight_g}:${r.max_weight_g}`, r])).values()
  ).sort((a, b) => a.min_weight_g - b.min_weight_g);

  function getRate(zone: string, tier: ShippingRate) {
    return rates.find(r => r.zone_name === zone && r.min_weight_g === tier.min_weight_g && r.max_weight_g === tier.max_weight_g);
  }

  async function saveRate(id: string, rate: number) {
    await fetch("/api/admin/shipping-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_rate", id, rate }),
    });
    setRates(prev => prev.map(r => r.id === id ? { ...r, rate } : r));
  }

  async function deleteZonePrefix(id: string) {
    await fetch("/api/admin/shipping-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_zone_prefix", id }),
    });
    setZones(prev => prev.filter(z => z.id !== id));
  }

  async function addZonePrefix() {
    const prefix = newPrefix.trim();
    const zoneName = newZoneName.trim();
    if (!/^\d{2}$/.test(prefix) || !zoneName) return;
    setPrefixSaving(true);
    const res = await fetch("/api/admin/shipping-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_zone_prefix", pincode_prefix: prefix, zone_name: zoneName }),
    });
    if (res.ok) { setNewPrefix(""); setNewZoneName(""); await load(); }
    setPrefixSaving(false);
  }

  // Group zones by zone_name for the prefix section
  const zonesByName = zones.reduce<Record<string, ShippingZone[]>>((acc, z) => {
    (acc[z.zone_name] ??= []).push(z);
    return acc;
  }, {});
  const allZoneNames = Array.from(new Set([...zoneNames, ...Object.keys(zonesByName)])).sort();

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <p className="font-display text-[0.44rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.38)] mb-2">Admin</p>
        <h1 className="font-display text-ivory" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>Shipping Rates</h1>
        <p className="font-body font-light text-[rgba(245,237,224,0.38)] text-[0.88rem] mt-2">
          Click any rate to edit it inline. Zone assignment is by the first 2 digits of the customer&apos;s pincode.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-[rgba(245,237,224,0.35)] text-[0.88rem]">
          <div className="w-4 h-4 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
          Loading…
        </div>
      )}

      {error && <p className="text-[rgba(210,80,80,0.70)] text-[0.88rem]">{error}</p>}

      {!loading && !error && (
        <>
          {/* ── Rate Matrix ────────────────────────────────────────────────── */}
          <div className="mb-10">
            <h2 className="font-display text-[0.54rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)] mb-4">Rate Table</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-[rgba(196,163,115,0.12)] rounded-[4px] overflow-hidden">
                <thead>
                  <tr className="bg-[rgba(196,163,115,0.07)]">
                    <th className="px-4 py-3 text-left font-display text-[0.48rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.55)] border-b border-[rgba(196,163,115,0.10)]">
                      Weight Tier
                    </th>
                    {zoneNames.map(z => (
                      <th key={z} className="px-4 py-3 text-center font-display text-[0.48rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.55)] border-b border-[rgba(196,163,115,0.10)] border-l border-l-[rgba(196,163,115,0.08)]">
                        {z}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((tier, i) => (
                    <tr key={`${tier.min_weight_g}-${tier.max_weight_g}`} className={i % 2 === 0 ? "bg-transparent" : "bg-[rgba(196,163,115,0.03)]"}>
                      <td className="px-4 py-3 font-body font-light text-[rgba(245,237,224,0.55)] text-[0.85rem] whitespace-nowrap border-[rgba(196,163,115,0.08)]">
                        {fmt(tier.min_weight_g, tier.max_weight_g)}
                      </td>
                      {zoneNames.map(z => {
                        const r = getRate(z, tier);
                        return (
                          <Cell
                            key={z}
                            rate={r}
                            onSave={newRate => r && saveRate(r.id, newRate)}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 font-body font-light text-[rgba(245,237,224,0.25)] text-[0.76rem]">
              Click any cell to edit the rate for that zone × weight combination.
            </p>
          </div>

          {/* ── Pincode Prefix Mappings ────────────────────────────────────── */}
          <div>
            <h2 className="font-display text-[0.54rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)] mb-4">Pincode Prefix Mappings</h2>
            <p className="font-body font-light text-[rgba(245,237,224,0.35)] text-[0.82rem] mb-5">
              The first 2 digits of a customer&apos;s pincode determine their zone. Unmatched pincodes default to <span className="text-[rgba(245,237,224,0.55)]">National</span>.
            </p>

            <div className="flex flex-col gap-6">
              {allZoneNames.map(zoneName => (
                <div key={zoneName}>
                  <p className="font-display text-[0.50rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.55)] mb-2">{zoneName}</p>
                  <div className="flex flex-wrap gap-2">
                    {(zonesByName[zoneName] ?? []).map(z => (
                      <span key={z.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(196,163,115,0.07)] border border-[rgba(196,163,115,0.18)] rounded-[3px] font-display text-ivory" style={{ fontSize: "0.78rem", letterSpacing: "0.08em" }}>
                        {z.pincode_prefix}
                        <button
                          onClick={() => deleteZonePrefix(z.id)}
                          className="ml-0.5 text-[rgba(245,237,224,0.28)] hover:text-[rgba(210,80,80,0.65)] transition-colors duration-150 text-[0.65rem]"
                          title="Remove this prefix"
                        >×</button>
                      </span>
                    ))}
                    {(zonesByName[zoneName] ?? []).length === 0 && (
                      <span className="font-body font-light text-[rgba(245,237,224,0.22)] text-[0.82rem] italic">No prefixes mapped</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add prefix form */}
            <div className="mt-8 flex items-end gap-3 flex-wrap">
              <div className="flex flex-col gap-1.5">
                <label className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.45)]">Pincode Prefix (2 digits)</label>
                <input
                  type="text"
                  value={newPrefix}
                  onChange={e => setNewPrefix(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  placeholder="e.g. 80"
                  maxLength={2}
                  className="w-24 bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.20)] rounded-[3px] px-3 py-2 font-display text-ivory text-[0.85rem] tracking-[0.06em] focus:outline-none focus:border-[rgba(196,163,115,0.48)] placeholder:text-[rgba(245,237,224,0.18)]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.45)]">Zone</label>
                <select
                  value={newZoneName}
                  onChange={e => setNewZoneName(e.target.value)}
                  className="bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.20)] rounded-[3px] px-3 py-2 font-display text-ivory text-[0.82rem] tracking-[0.06em] focus:outline-none focus:border-[rgba(196,163,115,0.48)] appearance-none cursor-pointer"
                >
                  <option value="" disabled className="bg-damson">Select zone…</option>
                  {allZoneNames.map(z => <option key={z} value={z} className="bg-damson">{z}</option>)}
                </select>
              </div>
              <button
                onClick={addZonePrefix}
                disabled={prefixSaving || !/^\d{2}$/.test(newPrefix) || !newZoneName}
                className="px-5 py-2 font-display text-[0.52rem] tracking-[0.18em] uppercase text-brass border border-[rgba(196,163,115,0.40)] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.60)] rounded-[3px] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {prefixSaving ? "···" : "+ Add"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
