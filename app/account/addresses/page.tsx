"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh",
];

type Address = {
  id: string; label?: string; customer_name: string; phone?: string;
  street: string; city: string; state: string; pincode: string; is_default: boolean;
};

const BLANK = { label: "", customer_name: "", phone: "", street: "", city: "", state: "", pincode: "" };

export default function AddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState<Address | null>(null);
  const [form,      setForm]      = useState(BLANK);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("saved_addresses")
      .select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at");
    setAddresses((data ?? []) as Address[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  function openAdd() { setEditing(null); setForm(BLANK); setError(""); setShowForm(true); }
  function openEdit(a: Address) {
    setEditing(a);
    setForm({ label: a.label ?? "", customer_name: a.customer_name, phone: a.phone ?? "", street: a.street, city: a.city, state: a.state, pincode: a.pincode });
    setError("");
    setShowForm(true);
  }
  function cancelForm() { setShowForm(false); setEditing(null); }

  async function saveForm(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { customer_name, street, city, state, pincode } = form;
    if (!customer_name.trim() || !street.trim() || !city.trim() || !state || !pincode.trim()) {
      setError("Please fill in all required fields."); return;
    }
    setSaving(true); setError("");
    const payload = { ...form, user_id: user.id, label: form.label || null, phone: form.phone || null };
    if (editing) {
      await supabase.from("saved_addresses").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("saved_addresses").insert(payload);
    }
    setSaving(false); setShowForm(false); setEditing(null);
    load();
  }

  async function deleteAddress(id: string) {
    await supabase.from("saved_addresses").delete().eq("id", id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  async function setDefault(id: string) {
    if (!user) return;
    await supabase.from("saved_addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("saved_addresses").update({ is_default: true }).eq("id", id);
    load();
  }

  const inp = "w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.20)] focus:border-[rgba(196,163,115,0.48)] rounded-[3px] px-3 py-2.5 font-body font-light text-ivory text-[0.90rem] placeholder:text-[rgba(245,237,224,0.20)] focus:outline-none transition-colors";

  if (loading) return <p className="font-body font-light text-[rgba(245,237,224,0.38)] text-[0.95rem]">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      {/* Address list */}
      {addresses.length === 0 && !showForm && (
        <p className="font-body font-light italic text-[rgba(245,237,224,0.42)] text-[0.95rem]">
          No saved addresses yet. Add one to speed up checkout.
        </p>
      )}

      {addresses.map((a) => (
        <div key={a.id} className={`bg-damson border rounded-[6px] px-5 py-4 ${a.is_default ? "border-[rgba(196,163,115,0.40)]" : "border-[rgba(196,163,115,0.13)]"}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              {a.is_default && (
                <span className="font-display text-[0.46rem] tracking-[0.20em] uppercase text-brass mb-0.5">Default</span>
              )}
              {a.label && <p className="font-display text-[0.58rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.55)]">{a.label}</p>}
              <p className="font-body font-light text-ivory text-[0.90rem]">{a.customer_name}</p>
              {a.phone && <p className="font-body font-light text-[rgba(245,237,224,0.45)] text-[0.85rem]">{a.phone}</p>}
              <p className="font-body font-light text-[rgba(245,237,224,0.55)] text-[0.85rem] leading-snug">
                {a.street}, {a.city}, {a.state} — {a.pincode}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button onClick={() => openEdit(a)} className="font-display text-[0.50rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.50)] hover:text-brass transition-colors">Edit</button>
              {!a.is_default && (
                <button onClick={() => setDefault(a.id)} className="font-display text-[0.50rem] tracking-[0.14em] uppercase text-[rgba(245,237,224,0.30)] hover:text-brass transition-colors">Set Default</button>
              )}
              <button onClick={() => deleteAddress(a.id)} className="font-display text-[0.50rem] tracking-[0.14em] uppercase text-[rgba(210,80,80,0.45)] hover:text-[rgba(210,80,80,0.80)] transition-colors">Remove</button>
            </div>
          </div>
        </div>
      ))}

      {/* Add button */}
      {!showForm && (
        <button
          onClick={openAdd}
          className="self-start inline-flex items-center gap-2 font-display text-[0.58rem] tracking-[0.18em] uppercase text-brass border border-[rgba(196,163,115,0.35)] rounded-full px-6 py-2.5 hover:bg-[rgba(196,163,115,0.07)] transition-all duration-200"
        >
          + Add Address
        </button>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={saveForm} className="bg-damson border border-[rgba(196,163,115,0.18)] rounded-[6px] p-5 flex flex-col gap-4">
          <p className="font-display text-[0.58rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.55)]">
            {editing ? "Edit Address" : "New Address"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input className={inp} placeholder="Label (e.g. Home)" value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} />
            <input className={inp} placeholder="Full name *" required value={form.customer_name} onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))} />
            <input className={inp} placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            <input className={inp} placeholder="Pincode *" required value={form.pincode} onChange={(e) => setForm((p) => ({ ...p, pincode: e.target.value }))} />
          </div>
          <input className={inp} placeholder="Street address *" required value={form.street} onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input className={inp} placeholder="City *" required value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
            <select className={`${inp} text-[rgba(245,237,224,0.60)]`} style={{ backgroundColor: "#1e0716" }} required value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}>
              <option value="" style={{ backgroundColor: "#1e0716", color: "rgba(245,237,224,0.60)" }}>State *</option>
              {STATES.map((s) => <option key={s} value={s} style={{ backgroundColor: "#1e0716", color: "#f5ede0" }}>{s}</option>)}
            </select>
          </div>
          {error && <p className="font-body text-[0.82rem] text-[rgba(210,80,80,0.80)]">{error}</p>}
          <div className="flex gap-3 flex-wrap">
            <button type="submit" disabled={saving} className="font-display text-[0.58rem] tracking-[0.18em] uppercase text-brass border border-[rgba(196,163,115,0.38)] rounded-full px-6 py-2.5 hover:bg-[rgba(196,163,115,0.07)] transition-all duration-200 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={cancelForm} className="font-display text-[0.58rem] tracking-[0.18em] uppercase text-[rgba(245,237,224,0.32)] border border-[rgba(245,237,224,0.10)] rounded-full px-6 py-2.5 hover:border-[rgba(245,237,224,0.25)] transition-all duration-200">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
