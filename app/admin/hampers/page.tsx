"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";

interface HamperLevel { id: string; level: string; name: string; min_spend: number; sort_order: number; }
interface HamperBox   { id: string; name: string; image_url: string | null; price: number; }

const FIELD  = "w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.32)] focus:border-[rgba(196,163,115,0.55)] rounded-[3px] px-3 py-2 font-body font-light text-[rgba(245,237,224,0.75)] text-sm focus:outline-none transition-colors duration-150 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const LABEL  = "block font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.45)] mb-1";
const CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("upload_preset", PRESET);
  fd.append("file", file);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: fd });
  const json = await res.json();
  return json.secure_url as string;
}

export default function AdminHampersPage() {
  const [levels,      setLevels]      = useState<HamperLevel[]>([]);
  const [boxes,       setBoxes]       = useState<HamperBox[]>([]);
  const [levelDrafts, setLevelDrafts] = useState<Record<string, { name: string; min_spend: string }>>({});
  const [boxDrafts,   setBoxDrafts]   = useState<Record<string, { name: string; price: string }>>({});
  const [saving,      setSaving]      = useState<Record<string, boolean>>({});
  const [toast,       setToast]       = useState("");

  // New box form
  const [newBoxName,  setNewBoxName]  = useState("");
  const [newBoxPrice, setNewBoxPrice] = useState("0");
  const [newBoxImg,   setNewBoxImg]   = useState("");
  const [imgFile,     setImgFile]     = useState<File | null>(null);
  const [addingBox,   setAddingBox]   = useState(false);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 4000); }

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  }

  useEffect(() => {
    fetch("/api/hampers/builder-config")
      .then(r => r.json())
      .then((d: { levels?: HamperLevel[]; boxes?: HamperBox[] }) => {
        const lvls = d.levels ?? [];
        setLevels(lvls);
        setBoxes(d.boxes ?? []);
        const drafts: Record<string, { name: string; min_spend: string }> = {};
        for (const l of lvls) drafts[l.id] = { name: l.name, min_spend: String(l.min_spend) };
        setLevelDrafts(drafts);
        const bxDrafts: Record<string, { name: string; price: string }> = {};
        for (const b of (d.boxes ?? [])) bxDrafts[b.id] = { name: b.name, price: String(b.price) };
        setBoxDrafts(bxDrafts);
      });
  }, []);

  async function saveLevel(level: HamperLevel) {
    const draft = levelDrafts[level.id];
    if (!draft) return;
    setSaving(s => ({ ...s, [level.id]: true }));
    const token = await getToken();
    const res = await fetch(`/api/admin/hampers/config?id=${level.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: draft.name.trim(), min_spend: Number(draft.min_spend) }),
    });
    if (res.ok) {
      setLevels(prev => prev.map(l => l.id === level.id ? { ...l, name: draft.name.trim(), min_spend: Number(draft.min_spend) } : l));
      showToast("Saved");
    } else {
      showToast("Save failed");
    }
    setSaving(s => ({ ...s, [level.id]: false }));
  }

  async function addBox() {
    if (!newBoxName.trim()) return;
    setAddingBox(true);
    try {
      let imgUrl = newBoxImg;
      if (imgFile) imgUrl = await uploadImage(imgFile);

      const token = await getToken();
      const res = await fetch("/api/admin/hampers/boxes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newBoxName.trim(), price: Number(newBoxPrice) || 0, image_url: imgUrl || null }),
      });
      if (res.ok) {
        const { box } = await res.json();
        setBoxes(prev => [...prev, box]);
        setNewBoxName(""); setNewBoxPrice("0"); setNewBoxImg(""); setImgFile(null);
        showToast("Box added");
      } else showToast("Failed to add box");
    } catch { showToast("Upload error"); }
    setAddingBox(false);
  }

  async function saveBox(box: HamperBox) {
    const draft = boxDrafts[box.id];
    if (!draft) return;
    setSaving(s => ({ ...s, [box.id]: true }));
    const token = await getToken();
    const res = await fetch(`/api/admin/hampers/boxes?id=${box.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: draft.name.trim(), price: Number(draft.price) || 0 }),
    });
    if (res.ok) {
      setBoxes(prev => prev.map(b => b.id === box.id ? { ...b, name: draft.name.trim(), price: Number(draft.price) || 0 } : b));
      showToast("Box saved");
    } else showToast("Save failed");
    setSaving(s => ({ ...s, [box.id]: false }));
  }

  async function deleteBox(id: string) {
    setSaving(s => ({ ...s, [id]: true }));
    const token = await getToken();
    const res = await fetch(`/api/admin/hampers/boxes?id=${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setBoxes(prev => prev.filter(b => b.id !== id));
    else showToast("Delete failed");
    setSaving(s => ({ ...s, [id]: false }));
  }

  return (
    <div className="min-h-screen bg-[#12060e] p-8">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <p className="font-display text-[0.44rem] tracking-[0.20em] uppercase text-[rgba(196,163,115,0.38)] mb-1">Admin</p>
          <h1 className="font-display text-ivory" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>Hamper Settings</h1>
        </div>

        {/* Hamper levels */}
        <section className="mb-10">
          <h2 className="font-display text-[0.58rem] tracking-[0.18em] uppercase text-brass mb-4">Hamper Levels</h2>
          <div className="flex flex-col gap-4">
            {levels.map(level => {
              const draft = levelDrafts[level.id] ?? { name: level.name, min_spend: String(level.min_spend) };
              return (
                <div key={level.id} className="bg-[#1a0a12] border border-[rgba(196,163,115,0.12)] rounded-[5px] p-4">
                  <p className="font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.35)] mb-3">{level.level}</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className={LABEL}>Display Name</label>
                      <input
                        className={FIELD}
                        value={draft.name}
                        onChange={e => setLevelDrafts(d => ({ ...d, [level.id]: { ...draft, name: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Minimum Spend (₹)</label>
                      <input
                        type="number"
                        className={FIELD}
                        value={draft.min_spend}
                        onChange={e => setLevelDrafts(d => ({ ...d, [level.id]: { ...draft, min_spend: e.target.value } }))}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => saveLevel(level)}
                    disabled={saving[level.id]}
                    className="font-display text-[0.48rem] tracking-[0.14em] uppercase text-brass border border-[rgba(196,163,115,0.28)] hover:border-[rgba(196,163,115,0.50)] px-4 py-2 rounded-[3px] transition-all duration-150 disabled:opacity-40"
                  >
                    {saving[level.id] ? "Saving…" : "Save"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Box options */}
        <section>
          <h2 className="font-display text-[0.58rem] tracking-[0.18em] uppercase text-brass mb-4">Gift Box Options</h2>

          {/* Existing boxes */}
          <div className="flex flex-col gap-3 mb-6">
            {boxes.length === 0 && (
              <p className="font-body font-light text-[rgba(245,237,224,0.30)] text-sm">No boxes yet. Add one below.</p>
            )}
            {boxes.map(box => {
              const draft = boxDrafts[box.id] ?? { name: box.name, price: String(box.price) };
              return (
                <div key={box.id} className="bg-[#1a0a12] border border-[rgba(196,163,115,0.12)] rounded-[5px] p-3 flex items-center gap-4">
                  {box.image_url && (
                    <div className="w-12 h-12 flex-shrink-0 relative rounded-[3px] overflow-hidden bg-[#270b1b]">
                      <Image src={box.image_url} alt={box.name} fill className="object-cover" sizes="48px" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                    <div>
                      <label className={LABEL}>Name</label>
                      <input
                        className={FIELD}
                        value={draft.name}
                        onChange={e => setBoxDrafts(d => ({ ...d, [box.id]: { ...draft, name: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Price (₹)</label>
                      <input
                        type="number"
                        className={FIELD}
                        value={draft.price}
                        onChange={e => setBoxDrafts(d => ({ ...d, [box.id]: { ...draft, price: e.target.value } }))}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => saveBox(box)}
                      disabled={saving[box.id]}
                      className="font-display text-[0.44rem] tracking-[0.12em] uppercase text-brass border border-[rgba(196,163,115,0.28)] hover:border-[rgba(196,163,115,0.50)] px-3 py-1.5 rounded-[3px] transition-all duration-150 disabled:opacity-40"
                    >
                      {saving[box.id] ? "…" : "Save"}
                    </button>
                    <button
                      onClick={() => deleteBox(box.id)}
                      disabled={saving[box.id]}
                      className="font-display text-[0.44rem] tracking-[0.12em] uppercase text-[rgba(200,80,80,0.60)] hover:text-[rgba(200,80,80,0.85)] border border-[rgba(200,80,80,0.20)] hover:border-[rgba(200,80,80,0.45)] px-3 py-1.5 rounded-[3px] transition-all duration-150 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add new box */}
          <div className="bg-[#1a0a12] border border-[rgba(196,163,115,0.12)] rounded-[5px] p-4">
            <p className="font-display text-[0.44rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.38)] mb-3">Add New Box</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={LABEL}>Box Name</label>
                <input className={FIELD} value={newBoxName} onChange={e => setNewBoxName(e.target.value)} placeholder="Box A" />
              </div>
              <div>
                <label className={LABEL}>Price (₹, 0 = included)</label>
                <input type="number" className={FIELD} value={newBoxPrice} onChange={e => setNewBoxPrice(e.target.value)} />
              </div>
            </div>
            <div className="mb-3">
              <label className={LABEL}>Box Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => { const f = e.target.files?.[0]; if (f) setImgFile(f); }}
                className="font-body font-light text-[rgba(245,237,224,0.55)] text-sm"
              />
            </div>
            <button
              onClick={addBox}
              disabled={!newBoxName.trim() || addingBox}
              className="font-display text-[0.50rem] tracking-[0.16em] uppercase text-brass border border-[rgba(196,163,115,0.30)] hover:border-[rgba(196,163,115,0.55)] hover:bg-[rgba(196,163,115,0.06)] px-5 py-2 rounded-[3px] transition-all duration-150 disabled:opacity-40"
            >
              {addingBox ? "Adding…" : "Add Box"}
            </button>
          </div>
        </section>

      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a0a12] border border-[rgba(196,163,115,0.30)] px-5 py-3 rounded-[4px]">
          <p className="font-display text-[0.52rem] tracking-[0.14em] uppercase text-brass">{toast}</p>
        </div>
      )}
    </div>
  );
}
