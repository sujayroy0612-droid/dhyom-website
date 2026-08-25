"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { DbCategory } from "@/lib/supabase/types";

const INPUT_CLS =
  "w-full bg-transparent border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.32)] focus:border-[rgba(196,163,115,0.55)] rounded-[3px] px-3 py-2 font-body font-light text-[rgba(245,237,224,0.80)] text-sm focus:outline-none transition-colors duration-150 placeholder:text-[rgba(245,237,224,0.18)]";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface NewCatForm {
  name: string;
  slug: string;
  display_order: string;
  parent_id: string;
}

const EMPTY_FORM: NewCatForm = { name: "", slug: "", display_order: "0", parent_id: "" };

export default function AdminCategoriesPage() {
  const [cats, setCats] = useState<DbCategory[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<DbCategory>>({});
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState<NewCatForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [catRes, prodRes] = await Promise.all([
      supabase.from("categories").select("*").order("display_order").order("name"),
      supabase.from("products").select("category"),
    ]);
    if (catRes.error) {
      showToast("Error loading categories: " + catRes.error.message);
    } else {
      setCats(catRes.data as DbCategory[]);
      const c: Record<string, number> = {};
      for (const p of (prodRes.data ?? [])) {
        c[p.category] = (c[p.category] ?? 0) + 1;
      }
      setCounts(c);
    }
    setLoading(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 5000);
  }

  /* ── Edit ── */
  function startEdit(cat: DbCategory) {
    setEditId(cat.id);
    setEditDraft({ name: cat.name, slug: cat.slug, display_order: cat.display_order, parent_id: cat.parent_id });
  }

  function cancelEdit() { setEditId(null); setEditDraft({}); }

  async function saveEdit(cat: DbCategory) {
    if (!editDraft.name?.trim() || !editDraft.slug?.trim()) {
      showToast("Name and slug are required.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("categories").update({
      name: editDraft.name.trim(),
      slug: editDraft.slug.trim(),
      display_order: Number(editDraft.display_order ?? 0),
      parent_id: editDraft.parent_id || null,
    }).eq("id", cat.id);
    setBusy(false);
    if (error) {
      showToast("Error: " + error.message);
    } else {
      setCats(prev => prev.map(c => c.id === cat.id
        ? { ...c, name: editDraft.name!, slug: editDraft.slug!, display_order: Number(editDraft.display_order ?? 0), parent_id: editDraft.parent_id || null }
        : c
      ).sort((a, b) => a.display_order - b.display_order));
      setEditId(null);
      setEditDraft({});
      showToast("Category saved.");
    }
  }

  /* ── Delete ── */
  async function deleteCategory(cat: DbCategory) {
    if ((counts[cat.slug] ?? 0) > 0) {
      showToast(`Cannot delete: ${counts[cat.slug]} products use this category.`);
      return;
    }
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;
    setBusy(true);
    const { error } = await supabase.from("categories").delete().eq("id", cat.id);
    setBusy(false);
    if (error) {
      showToast("Error: " + error.message);
    } else {
      setCats(prev => prev.filter(c => c.id !== cat.id));
      showToast("Deleted.");
    }
  }

  /* ── Add ── */
  function handleNewNameChange(val: string) {
    setNewForm(f => ({ ...f, name: val, slug: slugify(val) }));
  }

  async function addCategory() {
    if (!newForm.name.trim() || !newForm.slug.trim()) {
      showToast("Name and slug are required.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.from("categories").insert({
      name: newForm.name.trim(),
      slug: newForm.slug.trim(),
      display_order: Number(newForm.display_order) || 0,
      parent_id: newForm.parent_id || null,
    }).select().single();
    setBusy(false);
    if (error) {
      showToast("Error: " + error.message);
    } else {
      setCats(prev => [...prev, data as DbCategory].sort((a, b) => a.display_order - b.display_order));
      setNewForm(EMPTY_FORM);
      setAdding(false);
      showToast("Category added.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12060e] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
      </div>
    );
  }

  const topLevel = cats.filter(c => !c.parent_id);
  const children  = cats.filter(c =>  c.parent_id);

  function renderRow(cat: DbCategory, isChild = false) {
    const isEditing = editId === cat.id;
    const count = counts[cat.slug] ?? 0;

    return (
      <div
        key={cat.id}
        className={[
          "border-b border-[rgba(196,163,115,0.07)] transition-colors duration-150",
          isChild ? "bg-[rgba(196,163,115,0.015)]" : "",
          isEditing ? "bg-[rgba(196,163,115,0.04)]" : "hover:bg-[rgba(196,163,115,0.025)]",
        ].join(" ")}
      >
        {isEditing ? (
          /* ── Edit row ── */
          <div className="px-5 py-3 flex flex-col gap-3">
            <div className="grid grid-cols-[1fr_1fr_72px] gap-3">
              <div>
                <label className="block font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.40)] mb-1">Name</label>
                <input
                  className={INPUT_CLS}
                  value={editDraft.name ?? ""}
                  onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="block font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.40)] mb-1">Slug</label>
                <input
                  className={INPUT_CLS}
                  value={editDraft.slug ?? ""}
                  onChange={e => setEditDraft(d => ({ ...d, slug: e.target.value }))}
                />
              </div>
              <div>
                <label className="block font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.40)] mb-1">Order</label>
                <input
                  type="number"
                  className={INPUT_CLS + " [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"}
                  value={editDraft.display_order ?? 0}
                  onChange={e => setEditDraft(d => ({ ...d, display_order: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div>
              <label className="block font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.40)] mb-1">Parent Category (optional)</label>
              <select
                className={INPUT_CLS + " bg-[#1a0a12]"}
                value={editDraft.parent_id ?? ""}
                onChange={e => setEditDraft(d => ({ ...d, parent_id: e.target.value || null }))}
              >
                <option value="">— None (top level) —</option>
                {topLevel.filter(c => c.id !== cat.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => saveEdit(cat)}
                disabled={busy}
                className="font-display text-[0.42rem] tracking-[0.14em] uppercase px-4 py-2 border border-brass text-brass bg-[rgba(196,163,115,0.06)] rounded-[3px] hover:bg-[rgba(196,163,115,0.14)] disabled:opacity-40 transition-colors duration-150"
              >
                {busy ? "Saving…" : "Save"}
              </button>
              <button
                onClick={cancelEdit}
                className="font-display text-[0.42rem] tracking-[0.14em] uppercase px-4 py-2 border border-[rgba(196,163,115,0.20)] text-[rgba(245,237,224,0.40)] rounded-[3px] hover:border-[rgba(196,163,115,0.40)] hover:text-[rgba(245,237,224,0.65)] transition-colors duration-150"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ── Display row ── */
          <div className={`grid grid-cols-[1fr_160px_60px_80px_100px] gap-x-4 px-5 py-3.5 items-center ${isChild ? "pl-10" : ""}`}>
            <div>
              {isChild && <span className="text-[rgba(196,163,115,0.28)] mr-2 text-xs">└</span>}
              <span className="font-display text-ivory text-[0.80rem] tracking-wide">{cat.name}</span>
            </div>
            <span className="font-mono text-[rgba(245,237,224,0.38)] text-xs">{cat.slug}</span>
            <span className="font-display text-[rgba(245,237,224,0.30)] text-xs text-center">{cat.display_order}</span>
            <span className={`font-display text-xs text-center ${count > 0 ? "text-brass" : "text-[rgba(245,237,224,0.22)]"}`}>
              {count} {count === 1 ? "product" : "products"}
            </span>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => startEdit(cat)}
                className="font-display text-[0.40rem] tracking-[0.12em] uppercase px-2.5 py-1.5 border border-[rgba(196,163,115,0.22)] text-[rgba(245,237,224,0.45)] rounded-[3px] hover:border-brass hover:text-brass transition-colors duration-150"
              >
                Edit
              </button>
              <button
                onClick={() => deleteCategory(cat)}
                disabled={count > 0 || busy}
                className="font-display text-[0.40rem] tracking-[0.12em] uppercase px-2.5 py-1.5 border border-[rgba(200,80,80,0.20)] text-[rgba(200,80,80,0.40)] rounded-[3px] hover:border-[rgba(200,80,80,0.55)] hover:text-[rgba(200,80,80,0.80)] disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-8 pt-8 pb-20">

      {/* Toast */}
      {toast && (
        <div className="mb-5 bg-[rgba(200,60,60,0.12)] border border-[rgba(200,60,60,0.28)] rounded-[6px] px-5 py-3 flex items-center justify-between">
          <p className="font-body font-light text-[rgba(220,80,80,0.90)] text-sm">{toast}</p>
          <button onClick={() => setToast("")} className="text-[rgba(220,80,80,0.55)] hover:text-[rgba(220,80,80,0.90)] text-lg leading-none ml-4">×</button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="font-display text-[0.44rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.35)] mb-1">Management</p>
          <h1 className="font-display text-ivory" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>Categories</h1>
        </div>
        <button
          onClick={() => { setAdding(true); setEditId(null); }}
          className="font-display text-[0.44rem] tracking-[0.16em] uppercase px-4 py-2.5 border border-brass text-brass bg-[rgba(196,163,115,0.05)] rounded-[4px] hover:bg-[rgba(196,163,115,0.12)] transition-colors duration-150"
        >
          + New Category
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="mb-5 bg-[#1e0c17] border border-[rgba(196,163,115,0.18)] rounded-[6px] p-5">
          <p className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-brass mb-4">New Category</p>
          <div className="grid grid-cols-[1fr_1fr_72px] gap-3 mb-3">
            <div>
              <label className="block font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.40)] mb-1">Name *</label>
              <input
                className={INPUT_CLS}
                placeholder="Candles"
                value={newForm.name}
                onChange={e => handleNewNameChange(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.40)] mb-1">Slug *</label>
              <input
                className={INPUT_CLS}
                placeholder="candles"
                value={newForm.slug}
                onChange={e => setNewForm(f => ({ ...f, slug: e.target.value }))}
              />
            </div>
            <div>
              <label className="block font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.40)] mb-1">Order</label>
              <input
                type="number"
                className={INPUT_CLS + " [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"}
                value={newForm.display_order}
                onChange={e => setNewForm(f => ({ ...f, display_order: e.target.value }))}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.40)] mb-1">Parent Category (optional)</label>
            <select
              className={INPUT_CLS + " bg-[#1a0a12]"}
              value={newForm.parent_id}
              onChange={e => setNewForm(f => ({ ...f, parent_id: e.target.value }))}
            >
              <option value="">— None (top level) —</option>
              {topLevel.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addCategory}
              disabled={busy}
              className="font-display text-[0.42rem] tracking-[0.14em] uppercase px-5 py-2.5 border border-brass text-brass bg-[rgba(196,163,115,0.06)] rounded-[3px] hover:bg-[rgba(196,163,115,0.14)] disabled:opacity-40 transition-colors duration-150"
            >
              {busy ? "Adding…" : "Add Category"}
            </button>
            <button
              onClick={() => { setAdding(false); setNewForm(EMPTY_FORM); }}
              className="font-display text-[0.42rem] tracking-[0.14em] uppercase px-4 py-2.5 border border-[rgba(196,163,115,0.20)] text-[rgba(245,237,224,0.40)] rounded-[3px] hover:border-[rgba(196,163,115,0.40)] hover:text-[rgba(245,237,224,0.65)] transition-colors duration-150"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] overflow-hidden">

        {/* Table header */}
        <div className="grid grid-cols-[1fr_160px_60px_80px_100px] gap-x-4 px-5 py-3 border-b border-[rgba(196,163,115,0.10)] items-center">
          {["Name", "Slug", "Order", "Products", ""].map((h, i) => (
            <span key={i} className={`font-display text-[0.40rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.35)] ${i === 4 ? "text-right" : ""}`}>{h}</span>
          ))}
        </div>

        {cats.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="font-display text-[0.44rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.25)]">No categories yet</p>
          </div>
        ) : (
          <div>
            {topLevel.map(cat => (
              <div key={cat.id}>
                {renderRow(cat)}
                {children.filter(c => c.parent_id === cat.id).map(child => renderRow(child, true))}
              </div>
            ))}
            {/* Orphaned children (parent missing) */}
            {children.filter(c => !cats.find(p => p.id === c.parent_id)).map(cat => renderRow(cat))}
          </div>
        )}
      </div>

      <p className="mt-4 font-display text-[0.38rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.25)]">
        Categories with products cannot be deleted — reassign or remove products first.
      </p>
    </div>
  );
}
