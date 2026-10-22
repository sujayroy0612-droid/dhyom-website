"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

/* ── Types ─────────────────────────────────────────────── */
interface Tier {
  id: string; name: string; price: number; description: string;
  is_active: boolean; sort_order: number;
}
interface Box {
  id: string; name: string; image_url: string; is_active: boolean;
}
interface Slot {
  id: string; tier_id: string; label: string;
  allowed_categories: string[]; quantity: number; sort_order: number;
}

type Tab = "tiers" | "boxes" | "slots";

/* ── Helpers ────────────────────────────────────────────── */
async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return data.session ? `Bearer ${data.session.access_token}` : "";
}

async function apiFetch(method: string, url: string, body?: unknown) {
  const auth = await authHeader();
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json();
}

/* ── Tier form ─────────────────────────────────────────── */
const BLANK_TIER = { name: "", price: "", description: "", sort_order: "0", is_active: true };

function TierForm({ initial, onSave, onCancel }: {
  initial?: Partial<Tier>;
  onSave: (data: Omit<Tier, "id">) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    name:        initial?.name        ?? BLANK_TIER.name,
    price:       String(initial?.price ?? BLANK_TIER.price),
    description: initial?.description ?? BLANK_TIER.description,
    sort_order:  String(initial?.sort_order ?? BLANK_TIER.sort_order),
    is_active:   initial?.is_active   ?? BLANK_TIER.is_active,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ name: f.name, price: Number(f.price), description: f.description, sort_order: Number(f.sort_order), is_active: f.is_active });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 p-4 bg-[#1a0a12] border border-[rgba(196,163,115,0.14)] rounded-[4px]">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-display text-[0.48rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.45)] mb-1">Name</label>
          <input required value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body text-ivory text-sm focus:outline-none focus:border-[rgba(196,163,115,0.45)]" />
        </div>
        <div>
          <label className="block font-display text-[0.48rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.45)] mb-1">Price (₹)</label>
          <input required type="number" min="0" value={f.price} onChange={e => setF(p => ({ ...p, price: e.target.value }))} className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body text-ivory text-sm focus:outline-none focus:border-[rgba(196,163,115,0.45)]" />
        </div>
      </div>
      <div>
        <label className="block font-display text-[0.48rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.45)] mb-1">Description</label>
        <input value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))} className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body text-ivory text-sm focus:outline-none focus:border-[rgba(196,163,115,0.45)]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-display text-[0.48rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.45)] mb-1">Sort Order</label>
          <input type="number" value={f.sort_order} onChange={e => setF(p => ({ ...p, sort_order: e.target.value }))} className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body text-ivory text-sm focus:outline-none focus:border-[rgba(196,163,115,0.45)]" />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={f.is_active} onChange={e => setF(p => ({ ...p, is_active: e.target.checked }))} className="w-3.5 h-3.5 accent-brass" />
            <span className="font-display text-[0.48rem] tracking-[0.14em] uppercase text-[rgba(245,237,224,0.55)]">Active</span>
          </label>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="px-4 py-2 font-display text-[0.50rem] tracking-[0.16em] uppercase text-brass border border-[rgba(196,163,115,0.35)] hover:bg-[rgba(196,163,115,0.07)] rounded-[3px] transition-all duration-150">Save</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 font-display text-[0.50rem] tracking-[0.16em] uppercase text-[rgba(245,237,224,0.35)] border border-[rgba(196,163,115,0.12)] hover:border-[rgba(196,163,115,0.28)] rounded-[3px] transition-all duration-150">Cancel</button>
      </div>
    </form>
  );
}

/* ── Box form ───────────────────────────────────────────── */
function BoxForm({ initial, onSave, onCancel }: {
  initial?: Partial<Box>;
  onSave: (data: Omit<Box, "id">) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    name:      initial?.name      ?? "",
    image_url: initial?.image_url ?? "",
    is_active: initial?.is_active ?? true,
  });

  function submit(e: React.FormEvent) { e.preventDefault(); onSave(f); }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 p-4 bg-[#1a0a12] border border-[rgba(196,163,115,0.14)] rounded-[4px]">
      <div>
        <label className="block font-display text-[0.48rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.45)] mb-1">Name</label>
        <input required value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body text-ivory text-sm focus:outline-none focus:border-[rgba(196,163,115,0.45)]" />
      </div>
      <div>
        <label className="block font-display text-[0.48rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.45)] mb-1">Image URL</label>
        <input value={f.image_url} onChange={e => setF(p => ({ ...p, image_url: e.target.value }))} className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body text-ivory text-sm focus:outline-none focus:border-[rgba(196,163,115,0.45)]" placeholder="https://res.cloudinary.com/..." />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={f.is_active} onChange={e => setF(p => ({ ...p, is_active: e.target.checked }))} className="w-3.5 h-3.5 accent-brass" />
        <span className="font-display text-[0.48rem] tracking-[0.14em] uppercase text-[rgba(245,237,224,0.55)]">Active</span>
      </label>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="px-4 py-2 font-display text-[0.50rem] tracking-[0.16em] uppercase text-brass border border-[rgba(196,163,115,0.35)] hover:bg-[rgba(196,163,115,0.07)] rounded-[3px] transition-all duration-150">Save</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 font-display text-[0.50rem] tracking-[0.16em] uppercase text-[rgba(245,237,224,0.35)] border border-[rgba(196,163,115,0.12)] hover:border-[rgba(196,163,115,0.28)] rounded-[3px] transition-all duration-150">Cancel</button>
      </div>
    </form>
  );
}

/* ── Slot form ─────────────────────────────────────────── */
function SlotForm({ tiers, initial, onSave, onCancel }: {
  tiers: Tier[];
  initial?: Partial<Slot>;
  onSave: (data: Omit<Slot, "id">) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    tier_id:            initial?.tier_id            ?? (tiers[0]?.id ?? ""),
    label:              initial?.label              ?? "",
    allowed_categories: (initial?.allowed_categories ?? []).join(", "),
    quantity:           String(initial?.quantity    ?? 1),
    sort_order:         String(initial?.sort_order  ?? 0),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      tier_id:            f.tier_id,
      label:              f.label,
      allowed_categories: f.allowed_categories.split(",").map(s => s.trim()).filter(Boolean),
      quantity:           Number(f.quantity),
      sort_order:         Number(f.sort_order),
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 p-4 bg-[#1a0a12] border border-[rgba(196,163,115,0.14)] rounded-[4px]">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-display text-[0.48rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.45)] mb-1">Tier</label>
          <select required value={f.tier_id} onChange={e => setF(p => ({ ...p, tier_id: e.target.value }))} className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body text-ivory text-sm focus:outline-none focus:border-[rgba(196,163,115,0.45)]">
            {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-display text-[0.48rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.45)] mb-1">Label</label>
          <input required value={f.label} onChange={e => setF(p => ({ ...p, label: e.target.value }))} className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body text-ivory text-sm focus:outline-none focus:border-[rgba(196,163,115,0.45)]" placeholder="e.g. Candle" />
        </div>
      </div>
      <div>
        <label className="block font-display text-[0.48rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.45)] mb-1">Allowed Categories (comma-separated)</label>
        <input required value={f.allowed_categories} onChange={e => setF(p => ({ ...p, allowed_categories: e.target.value }))} className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body text-ivory text-sm focus:outline-none focus:border-[rgba(196,163,115,0.45)]" placeholder="candle, idol, bracelet" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-display text-[0.48rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.45)] mb-1">Quantity</label>
          <input type="number" min="1" value={f.quantity} onChange={e => setF(p => ({ ...p, quantity: e.target.value }))} className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body text-ivory text-sm focus:outline-none focus:border-[rgba(196,163,115,0.45)]" />
        </div>
        <div>
          <label className="block font-display text-[0.48rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.45)] mb-1">Sort Order</label>
          <input type="number" value={f.sort_order} onChange={e => setF(p => ({ ...p, sort_order: e.target.value }))} className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body text-ivory text-sm focus:outline-none focus:border-[rgba(196,163,115,0.45)]" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="px-4 py-2 font-display text-[0.50rem] tracking-[0.16em] uppercase text-brass border border-[rgba(196,163,115,0.35)] hover:bg-[rgba(196,163,115,0.07)] rounded-[3px] transition-all duration-150">Save</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 font-display text-[0.50rem] tracking-[0.16em] uppercase text-[rgba(245,237,224,0.35)] border border-[rgba(196,163,115,0.12)] hover:border-[rgba(196,163,115,0.28)] rounded-[3px] transition-all duration-150">Cancel</button>
      </div>
    </form>
  );
}

/* ── Main page ──────────────────────────────────────────── */
export default function AdminHampersPage() {
  const [tab,     setTab]     = useState<Tab>("tiers");
  const [tiers,   setTiers]   = useState<Tier[]>([]);
  const [boxes,   setBoxes]   = useState<Box[]>([]);
  const [slots,   setSlots]   = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState<string | null>(null);

  const [newTier, setNewTier] = useState(false);
  const [newBox,  setNewBox]  = useState(false);
  const [newSlot, setNewSlot] = useState(false);
  const [editing, setEditing] = useState<{ resource: string; id: string } | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const auth = await authHeader();
      const [tr, br, sr] = await Promise.all([
        fetch("/api/admin/hampers?resource=tiers",  { headers: { Authorization: auth } }).then(r => r.json()),
        fetch("/api/admin/hampers?resource=boxes",  { headers: { Authorization: auth } }).then(r => r.json()),
        fetch("/api/admin/hampers?resource=slots",  { headers: { Authorization: auth } }).then(r => r.json()),
      ]);
      setTiers(tr.data ?? []);
      setBoxes(br.data ?? []);
      setSlots(sr.data ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createTier(data: Omit<Tier, "id">) {
    try { await apiFetch("POST", "/api/admin/hampers", { resource: "tiers", payload: data }); setNewTier(false); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Error"); }
  }
  async function updateTier(id: string, data: Omit<Tier, "id">) {
    try { await apiFetch("PATCH", "/api/admin/hampers", { resource: "tiers", id, payload: data }); setEditing(null); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Error"); }
  }
  async function deleteTier(id: string) {
    if (!confirm("Delete this tier? Its slots will also be removed.")) return;
    try { await apiFetch("DELETE", `/api/admin/hampers?resource=tiers&id=${id}`); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Error"); }
  }

  async function createBox(data: Omit<Box, "id">) {
    try { await apiFetch("POST", "/api/admin/hampers", { resource: "boxes", payload: data }); setNewBox(false); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Error"); }
  }
  async function updateBox(id: string, data: Omit<Box, "id">) {
    try { await apiFetch("PATCH", "/api/admin/hampers", { resource: "boxes", id, payload: data }); setEditing(null); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Error"); }
  }
  async function deleteBox(id: string) {
    if (!confirm("Delete this box?")) return;
    try { await apiFetch("DELETE", `/api/admin/hampers?resource=boxes&id=${id}`); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Error"); }
  }

  async function createSlot(data: Omit<Slot, "id">) {
    try { await apiFetch("POST", "/api/admin/hampers", { resource: "slots", payload: data }); setNewSlot(false); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Error"); }
  }
  async function updateSlot(id: string, data: Omit<Slot, "id">) {
    try { await apiFetch("PATCH", "/api/admin/hampers", { resource: "slots", id, payload: data }); setEditing(null); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Error"); }
  }
  async function deleteSlot(id: string) {
    if (!confirm("Delete this slot?")) return;
    try { await apiFetch("DELETE", `/api/admin/hampers?resource=slots&id=${id}`); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Error"); }
  }

  const tabClass = (t: Tab) => [
    "px-4 py-2.5 font-display text-[0.50rem] tracking-[0.16em] uppercase transition-all duration-150 border-b-2",
    tab === t
      ? "border-brass text-brass"
      : "border-transparent text-[rgba(245,237,224,0.35)] hover:text-[rgba(245,237,224,0.65)]",
  ].join(" ");

  return (
    <div className="min-h-screen bg-[#12060e] p-8">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <p className="font-display text-[0.46rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.35)] mb-1">Admin</p>
          <h1 className="font-display text-ivory" style={{ fontSize: "1.4rem", letterSpacing: "0.06em" }}>Gift Hampers</h1>
        </div>

        {err && <p className="mb-4 font-body text-[rgba(210,80,80,0.75)] text-sm">{err}</p>}

        {/* Tabs */}
        <div className="flex border-b border-[rgba(196,163,115,0.12)] mb-6">
          <button type="button" className={tabClass("tiers")} onClick={() => setTab("tiers")}>Tiers ({tiers.length})</button>
          <button type="button" className={tabClass("boxes")} onClick={() => setTab("boxes")}>Boxes ({boxes.length})</button>
          <button type="button" className={tabClass("slots")} onClick={() => setTab("slots")}>Slots ({slots.length})</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Tiers ── */}
            {tab === "tiers" && (
              <div className="flex flex-col gap-3">
                {tiers.map(t => (
                  <div key={t.id}>
                    {editing?.resource === "tiers" && editing.id === t.id ? (
                      <TierForm initial={t} onSave={d => updateTier(t.id, d)} onCancel={() => setEditing(null)} />
                    ) : (
                      <div className="flex items-center justify-between px-4 py-3 bg-[#1a0a12] border border-[rgba(196,163,115,0.12)] rounded-[4px]">
                        <div>
                          <p className="font-display text-ivory text-[0.76rem]" style={{ letterSpacing: "0.06em" }}>{t.name}</p>
                          <p className="font-body font-light text-[rgba(245,237,224,0.38)] text-[0.74rem] mt-0.5">
                            ₹{t.price.toLocaleString("en-IN")} · Order {t.sort_order} · {t.is_active ? "Active" : "Hidden"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditing({ resource: "tiers", id: t.id })} className="px-3 py-1.5 font-display text-[0.46rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.55)] border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.40)] rounded-[3px] transition-all duration-150">Edit</button>
                          <button type="button" onClick={() => deleteTier(t.id)} className="px-3 py-1.5 font-display text-[0.46rem] tracking-[0.14em] uppercase text-[rgba(210,80,80,0.45)] border border-[rgba(210,80,80,0.15)] hover:border-[rgba(210,80,80,0.40)] rounded-[3px] transition-all duration-150">Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {newTier ? (
                  <TierForm onSave={createTier} onCancel={() => setNewTier(false)} />
                ) : (
                  <button type="button" onClick={() => setNewTier(true)} className="mt-1 px-4 py-2.5 font-display text-[0.50rem] tracking-[0.18em] uppercase text-brass border border-dashed border-[rgba(196,163,115,0.28)] hover:border-[rgba(196,163,115,0.50)] hover:bg-[rgba(196,163,115,0.04)] rounded-[4px] transition-all duration-150 w-full text-left">
                    + Add Tier
                  </button>
                )}
              </div>
            )}

            {/* ── Boxes ── */}
            {tab === "boxes" && (
              <div className="flex flex-col gap-3">
                {boxes.map(b => (
                  <div key={b.id}>
                    {editing?.resource === "boxes" && editing.id === b.id ? (
                      <BoxForm initial={b} onSave={d => updateBox(b.id, d)} onCancel={() => setEditing(null)} />
                    ) : (
                      <div className="flex items-center justify-between px-4 py-3 bg-[#1a0a12] border border-[rgba(196,163,115,0.12)] rounded-[4px]">
                        <div>
                          <p className="font-display text-ivory text-[0.76rem]" style={{ letterSpacing: "0.06em" }}>{b.name}</p>
                          <p className="font-body font-light text-[rgba(245,237,224,0.38)] text-[0.74rem] mt-0.5">{b.is_active ? "Active" : "Hidden"}</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditing({ resource: "boxes", id: b.id })} className="px-3 py-1.5 font-display text-[0.46rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.55)] border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.40)] rounded-[3px] transition-all duration-150">Edit</button>
                          <button type="button" onClick={() => deleteBox(b.id)} className="px-3 py-1.5 font-display text-[0.46rem] tracking-[0.14em] uppercase text-[rgba(210,80,80,0.45)] border border-[rgba(210,80,80,0.15)] hover:border-[rgba(210,80,80,0.40)] rounded-[3px] transition-all duration-150">Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {newBox ? (
                  <BoxForm onSave={createBox} onCancel={() => setNewBox(false)} />
                ) : (
                  <button type="button" onClick={() => setNewBox(true)} className="mt-1 px-4 py-2.5 font-display text-[0.50rem] tracking-[0.18em] uppercase text-brass border border-dashed border-[rgba(196,163,115,0.28)] hover:border-[rgba(196,163,115,0.50)] hover:bg-[rgba(196,163,115,0.04)] rounded-[4px] transition-all duration-150 w-full text-left">
                    + Add Box
                  </button>
                )}
              </div>
            )}

            {/* ── Slots ── */}
            {tab === "slots" && (
              <div className="flex flex-col gap-3">
                {slots.map(s => {
                  const tierName = tiers.find(t => t.id === s.tier_id)?.name ?? s.tier_id;
                  return (
                    <div key={s.id}>
                      {editing?.resource === "slots" && editing.id === s.id ? (
                        <SlotForm tiers={tiers} initial={s} onSave={d => updateSlot(s.id, d)} onCancel={() => setEditing(null)} />
                      ) : (
                        <div className="flex items-center justify-between px-4 py-3 bg-[#1a0a12] border border-[rgba(196,163,115,0.12)] rounded-[4px]">
                          <div>
                            <p className="font-display text-ivory text-[0.76rem]" style={{ letterSpacing: "0.06em" }}>{s.label}</p>
                            <p className="font-body font-light text-[rgba(245,237,224,0.38)] text-[0.74rem] mt-0.5">
                              {tierName} · qty {s.quantity} · [{s.allowed_categories.join(", ")}]
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setEditing({ resource: "slots", id: s.id })} className="px-3 py-1.5 font-display text-[0.46rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.55)] border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.40)] rounded-[3px] transition-all duration-150">Edit</button>
                            <button type="button" onClick={() => deleteSlot(s.id)} className="px-3 py-1.5 font-display text-[0.46rem] tracking-[0.14em] uppercase text-[rgba(210,80,80,0.45)] border border-[rgba(210,80,80,0.15)] hover:border-[rgba(210,80,80,0.40)] rounded-[3px] transition-all duration-150">Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {newSlot ? (
                  <SlotForm tiers={tiers} onSave={createSlot} onCancel={() => setNewSlot(false)} />
                ) : (
                  <button type="button" onClick={() => setNewSlot(true)} className="mt-1 px-4 py-2.5 font-display text-[0.50rem] tracking-[0.18em] uppercase text-brass border border-dashed border-[rgba(196,163,115,0.28)] hover:border-[rgba(196,163,115,0.50)] hover:bg-[rgba(196,163,115,0.04)] rounded-[4px] transition-all duration-150 w-full text-left">
                    + Add Slot
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
