"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const CATEGORY_LABELS: Record<string, string> = {
  candle:             "Candle",
  idol:               "Idol",
  bracelet:           "Bracelet",
  gift:               "Gift Set",
  "pooja-essentials": "Pooja Essential",
};

const CATEGORY_ORDER = ["candle", "idol", "bracelet", "gift", "pooja-essentials"];

interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  mrp: number | null;
  image_url: string | null;
  bullet_points: string | null;
}

async function uploadToCloudinary(file: File, publicId: string): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary not configured. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to Vercel environment variables."
    );
  }
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  fd.append("public_id", publicId);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST", body: fd,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message ?? "Cloudinary upload failed");
  }
  return (await res.json()).secure_url as string;
}

export default function AdminProductsPage() {
  const [products,    setProducts]    = useState<Product[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("all");
  const [uploading,   setUploading]   = useState<Record<string, boolean>>({});
  const [saving,      setSaving]      = useState<Record<string, Record<string, boolean>>>({});
  const [deltas,      setDeltas]      = useState<Record<string, number>>({});
  const [mrpDrafts,   setMrpDrafts]   = useState<Record<string, string>>({});
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [toast,        setToast]        = useState("");
  const [bulletDrafts, setBulletDrafts] = useState<Record<string, string>>({});
  const [expandedDesc, setExpandedDesc] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, category, stock, price, mrp, image_url, bullet_points")
      .order("category").order("name")
      .then(({ data }) => {
        const prods = (data ?? []) as Product[];
        setProducts(prods);
        const mrp:    Record<string, string> = {};
        const price:  Record<string, string> = {};
        const bullets: Record<string, string> = {};
        for (const p of prods) {
          mrp[p.id]    = p.mrp != null ? String(p.mrp) : "";
          price[p.id]  = String(p.price);
          bullets[p.id] = p.bullet_points ?? "";
        }
        setMrpDrafts(mrp);
        setPriceDrafts(price);
        setBulletDrafts(bullets);
        setLoading(false);
      });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 5000);
  }

  function markSaving(id: string, field: string, val: boolean) {
    setSaving(s => ({ ...s, [id]: { ...(s[id] ?? {}), [field]: val } }));
  }

  function isSaving(id: string, field: string) {
    return !!saving[id]?.[field];
  }

  /* ── MRP save ── */
  async function saveMrp(product: Product) {
    const raw = (mrpDrafts[product.id] ?? "").trim();
    const val = raw === "" ? null : Number(raw);
    if (raw !== "" && (isNaN(val as number) || (val as number) < 0)) {
      setMrpDrafts(d => ({ ...d, [product.id]: product.mrp != null ? String(product.mrp) : "" }));
      return;
    }
    if (val === product.mrp) return;
    markSaving(product.id, "mrp", true);
    const { error } = await supabase.from("products").update({ mrp: val }).eq("id", product.id);
    if (error) {
      showToast("Error saving MRP: " + error.message);
      setMrpDrafts(d => ({ ...d, [product.id]: product.mrp != null ? String(product.mrp) : "" }));
    } else {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, mrp: val } : p));
    }
    markSaving(product.id, "mrp", false);
  }

  /* ── Selling price save ── */
  async function savePrice(product: Product) {
    const raw = (priceDrafts[product.id] ?? "").trim();
    const val = Number(raw);
    if (isNaN(val) || val <= 0) {
      setPriceDrafts(d => ({ ...d, [product.id]: String(product.price) }));
      return;
    }
    if (val === product.price) return;
    markSaving(product.id, "price", true);
    const { error } = await supabase.from("products").update({ price: val }).eq("id", product.id);
    if (error) {
      showToast("Error saving price: " + error.message);
      setPriceDrafts(d => ({ ...d, [product.id]: String(product.price) }));
    } else {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, price: val } : p));
    }
    markSaving(product.id, "price", false);
  }

  /* ── Bullet points save ── */
  async function saveBullets(product: Product) {
    const val = (bulletDrafts[product.id] ?? "").trim() || null;
    if (val === (product.bullet_points ?? null)) return;
    markSaving(product.id, "bullets", true);
    const { error } = await supabase.from("products").update({ bullet_points: val }).eq("id", product.id);
    if (error) {
      showToast("Error saving description: " + error.message);
    } else {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, bullet_points: val } : p));
      showToast("Description saved.");
    }
    markSaving(product.id, "bullets", false);
  }

  /* ── Stock adjustment ── */
  async function applyDelta(product: Product) {
    const delta = deltas[product.id] ?? 0;
    if (delta === 0) return;
    const newStock = Math.max(0, product.stock + delta);
    markSaving(product.id, "stock", true);
    const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", product.id);
    if (!error) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStock } : p));
      setDeltas(d => ({ ...d, [product.id]: 0 }));
    }
    markSaving(product.id, "stock", false);
  }

  /* ── Primary image upload ── */
  async function handlePrimary(product: Product, file: File) {
    setUploading(u => ({ ...u, [product.id]: true }));
    try {
      const url = await uploadToCloudinary(file, `products/${product.id}_${Date.now()}`);
      await supabase.from("products").update({ image_url: url }).eq("id", product.id);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, image_url: url } : p));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(u => ({ ...u, [product.id]: false }));
    }
  }

  const lowCount = products.filter(p => p.stock < 10).length;
  const visible  = filter === "all" ? products : products.filter(p => p.category === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12060e] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
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
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="font-display text-[0.44rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.35)] mb-1">Management</p>
          <h1 className="font-display text-ivory" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>Products</h1>
        </div>
        {lowCount > 0 && (
          <span className="font-display text-[0.46rem] tracking-[0.14em] uppercase text-[rgba(200,80,80,0.75)] bg-[rgba(200,80,80,0.08)] border border-[rgba(200,80,80,0.20)] px-3 py-1.5 rounded-full">
            {lowCount} low stock
          </span>
        )}
      </div>

      {/* Cloudinary warning */}
      {(!CLOUD_NAME || !UPLOAD_PRESET) && (
        <div className="mb-5 bg-[rgba(200,140,40,0.10)] border border-[rgba(200,140,40,0.28)] rounded-[6px] px-5 py-3">
          <p className="font-body font-light text-[rgba(220,160,60,0.90)] text-sm">
            Image uploads require{" "}
            <code className="font-mono text-xs bg-[rgba(255,255,255,0.08)] px-1 py-0.5 rounded">NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code>{" "}
            and{" "}
            <code className="font-mono text-xs bg-[rgba(255,255,255,0.08)] px-1 py-0.5 rounded">NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET</code>{" "}
            in Vercel environment variables.
          </p>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-5">
        {["all", ...CATEGORY_ORDER].map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={[
              "font-display text-[0.44rem] tracking-[0.14em] uppercase px-3 py-1.5 rounded-full border transition-all duration-150",
              filter === c
                ? "border-brass text-brass bg-[rgba(196,163,115,0.08)]"
                : "border-[rgba(196,163,115,0.18)] text-[rgba(245,237,224,0.38)] hover:border-[rgba(196,163,115,0.35)] hover:text-[rgba(245,237,224,0.60)]",
            ].join(" ")}
          >
            {c === "all" ? "All" : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] overflow-hidden">

            {/* Header */}
            <div className="grid grid-cols-[56px_1fr_108px_108px_200px] gap-x-4 px-5 py-3 border-b border-[rgba(196,163,115,0.08)] items-center">
              {["", "Product", "MRP (₹)", "Price (₹)", "Stock"].map((h, i) => (
                <span key={i} className="font-display text-[0.42rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.35)]">{h}</span>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-[rgba(196,163,115,0.06)]">
              {visible.map(product => {
                const low   = product.stock < 10;
                const delta = deltas[product.id] ?? 0;

                return (
                  <React.Fragment key={product.id}>
                  <div className="grid grid-cols-[56px_1fr_108px_108px_200px] gap-x-4 px-5 py-4 items-center">

                    {/* Thumbnail */}
                    <div className="relative group/thumb flex-shrink-0">
                      <div className={[
                        "w-14 h-14 rounded-[4px] border overflow-hidden relative bg-[#270b1b] flex items-center justify-center",
                        product.image_url
                          ? "border-[rgba(196,163,115,0.22)]"
                          : "border-dashed border-[rgba(196,163,115,0.18)]",
                      ].join(" ")}>
                        {product.image_url ? (
                          <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="56px" />
                        ) : (
                          <span className="font-display text-[0.28rem] tracking-[0.08em] uppercase text-[rgba(196,163,115,0.22)]">img</span>
                        )}
                        {uploading[product.id] && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                            <div className="w-4 h-4 rounded-full border-2 border-[rgba(196,163,115,0.20)] border-t-brass animate-spin" />
                          </div>
                        )}
                        {!uploading[product.id] && (
                          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/thumb:opacity-100 transition-opacity z-10 flex items-center justify-center pointer-events-none">
                            <span className="font-display text-[0.30rem] tracking-[0.10em] uppercase text-ivory">Replace</span>
                          </div>
                        )}
                      </div>
                      {!uploading[product.id] && (
                        <input
                          type="file" accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                          style={{ fontSize: 0 }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handlePrimary(product, f); e.target.value = ""; }}
                        />
                      )}
                    </div>

                    {/* Name + category */}
                    <div className="min-w-0">
                      <p className="font-display text-ivory leading-snug truncate" style={{ fontSize: "0.80rem", letterSpacing: "0.04em" }}>
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="font-display text-[0.40rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.38)]">
                          {CATEGORY_LABELS[product.category] ?? product.category}
                        </p>
                        <button
                          onClick={() => setExpandedDesc(v => v === product.id ? null : product.id)}
                          className={`font-display text-[0.38rem] tracking-[0.10em] uppercase px-2 py-0.5 rounded border transition-colors duration-150 ${expandedDesc === product.id ? "border-brass text-brass bg-[rgba(196,163,115,0.08)]" : "border-[rgba(196,163,115,0.20)] text-[rgba(196,163,115,0.40)] hover:border-brass hover:text-brass"}`}
                        >
                          ✎ desc
                        </button>
                      </div>
                    </div>

                    {/* MRP */}
                    <div className="relative">
                      <input
                        type="number"
                        value={mrpDrafts[product.id] ?? ""}
                        onChange={e => setMrpDrafts(d => ({ ...d, [product.id]: e.target.value }))}
                        onBlur={() => saveMrp(product)}
                        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        placeholder="—"
                        className="w-full bg-transparent border border-[rgba(196,163,115,0.14)] hover:border-[rgba(196,163,115,0.30)] focus:border-[rgba(196,163,115,0.55)] rounded-[3px] px-2.5 py-2 font-display text-[rgba(245,237,224,0.65)] text-[0.75rem] tracking-wide focus:outline-none transition-colors duration-150 placeholder:text-[rgba(245,237,224,0.20)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      {isSaving(product.id, "mrp") && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgba(196,163,115,0.45)] text-xs">…</span>
                      )}
                    </div>

                    {/* Selling price */}
                    <div className="relative">
                      <input
                        type="number"
                        value={priceDrafts[product.id] ?? ""}
                        onChange={e => setPriceDrafts(d => ({ ...d, [product.id]: e.target.value }))}
                        onBlur={() => savePrice(product)}
                        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        className="w-full bg-transparent border border-[rgba(196,163,115,0.14)] hover:border-[rgba(196,163,115,0.30)] focus:border-[rgba(196,163,115,0.55)] rounded-[3px] px-2.5 py-2 font-display text-brass text-[0.75rem] tracking-wide focus:outline-none transition-colors duration-150 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      {isSaving(product.id, "price") && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgba(196,163,115,0.45)] text-xs">…</span>
                      )}
                    </div>

                    {/* Stock */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDeltas(d => ({ ...d, [product.id]: (d[product.id] ?? 0) - 1 }))}
                        className="w-7 h-7 rounded-[3px] border border-[rgba(196,163,115,0.20)] text-[rgba(245,237,224,0.50)] hover:border-[rgba(196,163,115,0.40)] hover:text-ivory flex items-center justify-center text-sm leading-none transition-colors flex-shrink-0"
                      >−</button>

                      <div className="flex flex-col items-center w-9 flex-shrink-0">
                        <span className={`font-display text-[0.85rem] leading-none tracking-wide ${low ? "text-[rgba(200,80,80,0.85)]" : "text-ivory"}`}>
                          {product.stock}
                        </span>
                        {delta !== 0 && (
                          <span className="font-display text-[0.38rem] tracking-wide text-brass mt-0.5">
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setDeltas(d => ({ ...d, [product.id]: (d[product.id] ?? 0) + 1 }))}
                        className="w-7 h-7 rounded-[3px] border border-[rgba(196,163,115,0.20)] text-[rgba(245,237,224,0.50)] hover:border-[rgba(196,163,115,0.40)] hover:text-ivory flex items-center justify-center text-sm leading-none transition-colors flex-shrink-0"
                      >+</button>

                      <button
                        disabled={delta === 0 || isSaving(product.id, "stock")}
                        onClick={() => applyDelta(product)}
                        className="font-display text-[0.42rem] tracking-[0.12em] uppercase px-2 py-1.5 border rounded-[3px] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed border-[rgba(196,163,115,0.30)] text-brass hover:bg-[rgba(196,163,115,0.08)] flex-shrink-0"
                      >
                        {isSaving(product.id, "stock") ? "…" : "Save"}
                      </button>

                      {low && delta === 0 && !isSaving(product.id, "stock") && (
                        <span className="font-display text-[0.38rem] tracking-[0.08em] uppercase text-[rgba(200,80,80,0.60)] flex-shrink-0">low</span>
                      )}
                    </div>

                  </div>

                  {/* Expandable bullet-points editor */}
                  {expandedDesc === product.id && (
                    <div className="col-span-5 px-1 pb-4 pt-1">
                      <p className="font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.40)] mb-2">
                        Bullet Points — one per line (shown on product page)
                      </p>
                      <textarea
                        rows={6}
                        value={bulletDrafts[product.id] ?? ""}
                        onChange={e => setBulletDrafts(d => ({ ...d, [product.id]: e.target.value }))}
                        onBlur={() => saveBullets(product)}
                        placeholder={"100% natural soy wax\nBurns for up to 40 hours\nHand-poured in small batches\nFree from synthetic dyes"}
                        className="w-full bg-[rgba(245,237,224,0.03)] border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.32)] focus:border-[rgba(196,163,115,0.55)] rounded-[4px] px-4 py-3 font-body font-light text-[rgba(245,237,224,0.75)] text-sm leading-[1.75] placeholder:text-[rgba(245,237,224,0.18)] focus:outline-none resize-none transition-colors duration-150"
                      />
                      <p className="mt-1.5 font-display text-[0.36rem] tracking-[0.10em] uppercase text-[rgba(196,163,115,0.30)]">
                        Auto-saves on blur · {isSaving(product.id, "bullets") ? "Saving…" : "Saved"}
                      </p>
                    </div>
                  )}
                  </React.Fragment>
                );
              })}
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
