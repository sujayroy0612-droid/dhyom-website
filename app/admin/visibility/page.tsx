"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { SHOP_NAV } from "@/lib/nav";

/* ─── Types ───────────────────────────────────────────── */
interface CategoryRow   { category: string; is_visible: boolean; }
interface CollectionRow { category: string; subcategory: string; is_visible: boolean; }
interface ProductRow    { id: string; name: string; category: string; is_visible: boolean; is_featured: boolean; }

const CATEGORY_LABELS: Record<string, string> = {
  candle:             "Candles",
  idol:               "Idols",
  bracelet:           "Spiritual Bracelets",
  gift:               "Gift Sets",
  "pooja-essentials": "Pooja Essentials",
};

const CATEGORY_ORDER = ["candle", "idol", "bracelet", "gift", "pooja-essentials"];

/* Build subcategory title lookup from shared nav data */
const SUBCATEGORY_LABELS: Record<string, string> = {};
for (const cat of SHOP_NAV) {
  for (const sub of cat.subcategories) {
    SUBCATEGORY_LABELS[`${cat.category}/${sub.slug}`] = sub.title;
  }
}

/* ─── Toggle switch ───────────────────────────────────── */
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        "relative flex-shrink-0 w-10 h-[22px] rounded-full transition-colors duration-200",
        checked ? "bg-brass" : "bg-[rgba(245,237,224,0.10)]",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:opacity-90",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-[3px] w-4 h-4 rounded-full shadow-sm transition-all duration-200",
          checked ? "left-[22px] bg-ink" : "left-[3px] bg-[rgba(245,237,224,0.28)]",
        ].join(" ")}
      />
    </button>
  );
}

/* ─── Section header ──────────────────────────────────── */
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="font-display text-[0.52rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.50)]">
        {label}
      </p>
      <div className="flex-1 h-px bg-[rgba(196,163,115,0.10)]" />
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────── */
export default function VisibilityPage() {
  const [categories,  setCategories]  = useState<CategoryRow[]>([]);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [products,    setProducts]    = useState<ProductRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState<Record<string, boolean>>({});
  const [toast,       setToast]       = useState<string>("");

  useEffect(() => {
    Promise.all([
      supabase.from("category_visibility").select("category, is_visible").order("category"),
      supabase.from("collection_visibility").select("category, subcategory, is_visible").order("category").order("subcategory"),
      supabase.from("products").select("id, name, category, is_visible, is_featured").order("category").order("name"),
    ]).then(([catRes, collRes, prodRes]) => {
      const cats = (catRes.data ?? []) as CategoryRow[];
      cats.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
      setCategories(cats);
      setCollections((collRes.data ?? []) as CollectionRow[]);
      setProducts((prodRes.data ?? []) as ProductRow[]);
      setLoading(false);
    });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function toggleCategory(cat: string, val: boolean) {
    setSaving((p) => ({ ...p, [`cat-${cat}`]: true }));
    const { error } = await supabase
      .from("category_visibility").update({ is_visible: val }).eq("category", cat);
    if (error) { showToast("Error: " + error.message); }
    else {
      setCategories((prev) => prev.map((c) => c.category === cat ? { ...c, is_visible: val } : c));
      showToast(`${CATEGORY_LABELS[cat] ?? cat} ${val ? "visible" : "hidden"}`);
    }
    setSaving((p) => ({ ...p, [`cat-${cat}`]: false }));
  }

  async function toggleCollection(cat: string, sub: string, val: boolean) {
    const key = `coll-${cat}-${sub}`;
    setSaving((p) => ({ ...p, [key]: true }));
    const { error } = await supabase
      .from("collection_visibility").update({ is_visible: val }).eq("category", cat).eq("subcategory", sub);
    if (error) { showToast("Error: " + error.message); }
    else {
      setCollections((prev) =>
        prev.map((c) => c.category === cat && c.subcategory === sub ? { ...c, is_visible: val } : c)
      );
      const label = SUBCATEGORY_LABELS[`${cat}/${sub}`] ?? sub;
      showToast(`${label} ${val ? "visible" : "hidden"}`);
    }
    setSaving((p) => ({ ...p, [key]: false }));
  }

  async function toggleProduct(id: string, val: boolean) {
    setSaving((p) => ({ ...p, [`prod-${id}`]: true }));
    const { error } = await supabase
      .from("products").update({ is_visible: val }).eq("id", id);
    if (error) { showToast("Error: " + error.message); }
    else { setProducts((prev) => prev.map((p) => p.id === id ? { ...p, is_visible: val } : p)); }
    setSaving((p) => ({ ...p, [`prod-${id}`]: false }));
  }

  async function toggleFeatured(id: string, val: boolean) {
    setSaving((p) => ({ ...p, [`feat-${id}`]: true }));
    const { error } = await supabase
      .from("products").update({ is_featured: val }).eq("id", id);
    if (error) { showToast("Error: " + error.message); }
    else { setProducts((prev) => prev.map((p) => p.id === id ? { ...p, is_featured: val } : p)); }
    setSaving((p) => ({ ...p, [`feat-${id}`]: false }));
  }

  /* Grouping helpers */
  const productsByCategory: Record<string, ProductRow[]> = {};
  for (const p of products) {
    if (!productsByCategory[p.category]) productsByCategory[p.category] = [];
    productsByCategory[p.category].push(p);
  }

  const collectionsByCategory: Record<string, CollectionRow[]> = {};
  for (const c of collections) {
    if (!collectionsByCategory[c.category]) collectionsByCategory[c.category] = [];
    collectionsByCategory[c.category].push(c);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12060e] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12060e] pt-8 pb-20 px-8">
      <div className="max-w-3xl mx-auto">

        {/* Page header */}
        <div className="mb-8">
          <p className="font-display text-[0.44rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.35)] mb-1">
            Admin · Visibility
          </p>
          <h1 className="font-display text-ivory mb-1" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>
            Visibility Controls
          </h1>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.35)] text-sm">
            Hidden items remain in the database but do not appear on the live site.
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-6 bg-[rgba(196,163,115,0.08)] border border-[rgba(196,163,115,0.22)] rounded-[4px] px-4 py-3">
            <p className="font-display text-[0.52rem] tracking-[0.12em] uppercase text-brass">{toast}</p>
          </div>
        )}

        {/* ── 1. Categories ── */}
        <div className="mb-10">
          <SectionHeader label="Categories" />
          <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] divide-y divide-[rgba(196,163,115,0.08)]">
            {categories.length === 0 ? (
              <p className="px-5 py-4 font-body font-light italic text-[rgba(245,237,224,0.30)] text-sm">
                No rows found — run the category_visibility SQL seed first.
              </p>
            ) : categories.map((cat) => {
              const total   = (productsByCategory[cat.category] ?? []).length;
              const visible = (productsByCategory[cat.category] ?? []).filter((p) => p.is_visible).length;
              return (
                <div key={cat.category} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-display text-ivory text-[0.78rem] tracking-[0.06em]">
                      {CATEGORY_LABELS[cat.category] ?? cat.category}
                    </p>
                    <p className="font-display text-[0.40rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.35)] mt-0.5">
                      {visible} / {total} products visible
                    </p>
                  </div>
                  <Toggle
                    checked={cat.is_visible}
                    onChange={(v) => toggleCategory(cat.category, v)}
                    disabled={saving[`cat-${cat.category}`]}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 2. Collections ── */}
        <div className="mb-10">
          <SectionHeader label="Collections" />
          {collections.length === 0 ? (
            <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] px-5 py-4">
              <p className="font-body font-light italic text-[rgba(245,237,224,0.30)] text-sm">
                No rows found — run the collection_visibility SQL seed first.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {CATEGORY_ORDER.map((catSlug) => {
                const colls = collectionsByCategory[catSlug];
                if (!colls?.length) return null;
                return (
                  <div key={catSlug} className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] overflow-hidden">
                    <div className="px-5 py-3 bg-[rgba(196,163,115,0.04)] border-b border-[rgba(196,163,115,0.08)]">
                      <p className="font-display text-[0.48rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.55)]">
                        {CATEGORY_LABELS[catSlug] ?? catSlug}
                      </p>
                    </div>
                    <div className="divide-y divide-[rgba(196,163,115,0.06)]">
                      {colls.map((coll) => (
                        <div key={coll.subcategory} className="flex items-center justify-between px-5 py-3.5">
                          <p className={[
                            "font-display text-[0.72rem] tracking-wide leading-snug",
                            coll.is_visible
                              ? "text-[rgba(245,237,224,0.72)]"
                              : "text-[rgba(245,237,224,0.28)] line-through",
                          ].join(" ")}>
                            {SUBCATEGORY_LABELS[`${coll.category}/${coll.subcategory}`] ?? coll.subcategory}
                          </p>
                          <Toggle
                            checked={coll.is_visible}
                            onChange={(v) => toggleCollection(coll.category, coll.subcategory, v)}
                            disabled={saving[`coll-${coll.category}-${coll.subcategory}`]}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 3. Best Seller ── */}
        <div className="mb-10">
          <SectionHeader label="Best Seller" />
          <p className="font-body font-light italic text-[rgba(245,237,224,0.30)] text-sm mb-4 -mt-1">
            Toggle on to feature a product in the homepage Best Seller section. Only visible products are shown here.
          </p>
          <div className="flex flex-col gap-4">
            {CATEGORY_ORDER.map((catSlug) => {
              const prods = (productsByCategory[catSlug] ?? []).filter((p) => p.is_visible);
              if (!prods.length) return null;
              return (
                <div key={catSlug} className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] overflow-hidden">
                  <div className="px-5 py-3 bg-[rgba(196,163,115,0.04)] border-b border-[rgba(196,163,115,0.08)]">
                    <p className="font-display text-[0.48rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.55)]">
                      {CATEGORY_LABELS[catSlug] ?? catSlug}
                    </p>
                  </div>
                  <div className="divide-y divide-[rgba(196,163,115,0.06)]">
                    {prods.map((prod) => (
                      <div key={prod.id} className="flex items-center justify-between px-5 py-3.5">
                        <p className={[
                          "font-display text-[0.72rem] tracking-wide leading-snug",
                          prod.is_featured
                            ? "text-brass"
                            : "text-[rgba(245,237,224,0.72)]",
                        ].join(" ")}>
                          {prod.name}
                          {prod.is_featured && (
                            <span className="ml-2 font-display text-[0.38rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">
                              Featured
                            </span>
                          )}
                        </p>
                        <Toggle
                          checked={prod.is_featured}
                          onChange={(v) => toggleFeatured(prod.id, v)}
                          disabled={saving[`feat-${prod.id}`]}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. Products ── */}
        <div>
          <SectionHeader label="Products" />
          <div className="flex flex-col gap-4">
            {CATEGORY_ORDER.map((catSlug) => {
              const prods = productsByCategory[catSlug];
              if (!prods?.length) return null;
              return (
                <div key={catSlug} className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] overflow-hidden">
                  <div className="px-5 py-3 bg-[rgba(196,163,115,0.04)] border-b border-[rgba(196,163,115,0.08)]">
                    <p className="font-display text-[0.48rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.55)]">
                      {CATEGORY_LABELS[catSlug] ?? catSlug}
                    </p>
                  </div>
                  <div className="divide-y divide-[rgba(196,163,115,0.06)]">
                    {prods.map((prod) => (
                      <div key={prod.id} className="flex items-center justify-between px-5 py-3.5">
                        <p className={[
                          "font-display text-[0.72rem] tracking-wide leading-snug",
                          prod.is_visible
                            ? "text-[rgba(245,237,224,0.72)]"
                            : "text-[rgba(245,237,224,0.28)] line-through",
                        ].join(" ")}>
                          {prod.name}
                        </p>
                        <Toggle
                          checked={prod.is_visible}
                          onChange={(v) => toggleProduct(prod.id, v)}
                          disabled={saving[`prod-${prod.id}`]}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
