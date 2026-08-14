"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";

interface Product {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  image_urls: string[];
}

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

const CATEGORY_LABELS: Record<string, string> = {
  candle: "Candle",
  idol: "Idol",
  bracelet: "Bracelet",
  gift: "Gift Set",
  "pooja-essentials": "Pooja Essential",
};

async function uploadToCloudinary(file: File, publicId: string): Promise<string> {
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
  const data = await res.json();
  return data.secure_url as string;
}

export default function UploadImagesPage() {
  const [products,  setProducts]  = useState<Product[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState<Record<string, string>>({}); // id → "primary"|"gallery"
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, category, image_url, image_urls")
      .order("category").order("name")
      .then(({ data }) => {
        setProducts((data ?? []).map(p => ({
          ...p,
          image_urls: Array.isArray(p.image_urls) ? p.image_urls : [],
        })) as Product[]);
        setLoading(false);
      });
  }, []);

  function setErr(id: string, msg: string) {
    setErrors(p => ({ ...p, [id]: msg }));
    setTimeout(() => setErrors(p => ({ ...p, [id]: "" })), 5000);
  }

  /* ── Upload primary image ── */
  async function handlePrimary(product: Product, file: File) {
    setUploading(p => ({ ...p, [product.id]: "primary" }));
    try {
      const url = await uploadToCloudinary(file, `products/${product.id}`);
      await supabase.from("products").update({ image_url: url }).eq("id", product.id);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, image_url: url } : p));
    } catch (err) {
      setErr(product.id, err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(p => ({ ...p, [product.id]: "" }));
    }
  }

  /* ── Add a gallery image ── */
  async function handleGallery(product: Product, file: File) {
    setUploading(p => ({ ...p, [product.id]: "gallery" }));
    try {
      const idx = (product.image_urls?.length ?? 0) + 1;
      const url = await uploadToCloudinary(file, `products/${product.id}_gallery_${idx}`);
      const newUrls = [...(product.image_urls ?? []), url];
      await supabase.from("products").update({ image_urls: newUrls }).eq("id", product.id);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, image_urls: newUrls } : p));
    } catch (err) {
      setErr(product.id, err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(p => ({ ...p, [product.id]: "" }));
    }
  }

  /* ── Remove a gallery image ── */
  async function removeGallery(product: Product, urlToRemove: string) {
    const newUrls = (product.image_urls ?? []).filter(u => u !== urlToRemove);
    await supabase.from("products").update({ image_urls: newUrls }).eq("id", product.id);
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, image_urls: newUrls } : p));
  }

  const totalImages = products.reduce((s, p) => s + (p.image_url ? 1 : 0) + (p.image_urls?.length ?? 0), 0);
  const withPrimary = products.filter(p => p.image_url).length;

  if (loading) return (
    <div className="min-h-screen bg-[#12060e] flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#12060e] pt-8 pb-16 px-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="font-display text-[0.44rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.35)] mb-1">Admin · Internal Tool</p>
          <h1 className="font-display text-ivory mb-1" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>Product Images</h1>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.35)] text-sm">
            Each product can have one primary image plus multiple gallery images.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Products",        value: products.length,  color: "text-ivory" },
            { label: "Have Primary",    value: withPrimary,      color: "text-brass" },
            { label: "Total Images",    value: totalImages,      color: "text-[rgba(80,200,120,0.80)]" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] px-4 py-4">
              <p className="font-display text-[0.42rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.38)] mb-1.5">{label}</p>
              <p className={`font-display ${color}`} style={{ fontSize: "1.5rem", letterSpacing: "0.04em" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Product list */}
        <div className="flex flex-col gap-3">
          {products.map(product => {
            const busy = uploading[product.id];
            const errMsg = errors[product.id];
            const allImages = [product.image_url, ...(product.image_urls ?? [])].filter(Boolean) as string[];

            return (
              <div key={product.id} className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">

                  {/* Product info */}
                  <div className="sm:w-44 flex-shrink-0">
                    <p className="font-display text-ivory text-[0.80rem] tracking-wide leading-snug">{product.name}</p>
                    <p className="font-display text-[0.42rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.40)] mt-0.5">
                      {CATEGORY_LABELS[product.category] ?? product.category}
                    </p>
                    {errMsg && (
                      <p className="font-body font-light text-[rgba(200,80,80,0.75)] text-[0.68rem] mt-1.5 leading-snug">{errMsg}</p>
                    )}
                  </div>

                  {/* Image strip */}
                  <div className="flex-1 flex items-start gap-2 flex-wrap">

                    {/* Primary image */}
                    <div className="flex flex-col items-center gap-1">
                      <div className={[
                        "w-20 h-20 rounded-[4px] border-[1.5px] overflow-hidden relative bg-[#270b1b] flex items-center justify-center",
                        product.image_url ? "border-brass" : "border-[rgba(196,163,115,0.20)] border-dashed",
                      ].join(" ")}>
                        {product.image_url ? (
                          <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="80px" />
                        ) : (
                          <span className="font-display text-[0.36rem] tracking-[0.10em] uppercase text-[rgba(196,163,115,0.22)]">No image</span>
                        )}
                        <span className="absolute top-1 left-1 bg-brass text-ink font-display text-[0.36rem] tracking-[0.08em] uppercase px-1 py-0.5 rounded-[2px] leading-none">P</span>
                      </div>
                      {/* Always-visible replace/set label */}
                      <label
                        htmlFor={`primary-${product.id}`}
                        className={[
                          "font-display text-[0.38rem] tracking-[0.10em] uppercase text-brass hover:text-ivory transition-colors duration-150",
                          busy ? "opacity-40 pointer-events-none" : "cursor-pointer",
                        ].join(" ")}
                      >
                        {busy === "primary" ? "Uploading…" : product.image_url ? "Replace" : "Set Image"}
                      </label>
                      <input
                        id={`primary-${product.id}`}
                        type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handlePrimary(product, f); e.target.value = ""; }}
                      />
                    </div>

                    {/* Gallery images */}
                    {(product.image_urls ?? []).map((url, i) => (
                      <div key={url} className="relative group">
                        <div className="w-20 h-20 rounded-[4px] border border-[rgba(196,163,115,0.20)] overflow-hidden relative bg-[#270b1b]">
                          <Image src={url} alt={`${product.name} gallery ${i + 1}`} fill className="object-cover" sizes="80px" />
                        </div>
                        {/* Remove button */}
                        <button
                          onClick={() => removeGallery(product, url)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[rgba(200,60,60,0.85)] text-white text-xs leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[rgba(220,50,50,1)]"
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    {/* Add gallery image label */}
                    <label
                      htmlFor={`gallery-${product.id}`}
                      className={[
                        "w-20 h-20 rounded-[4px] border border-dashed border-[rgba(196,163,115,0.22)] hover:border-[rgba(196,163,115,0.45)] flex flex-col items-center justify-center gap-1 transition-colors",
                        busy ? "opacity-40 pointer-events-none" : "cursor-pointer",
                      ].join(" ")}
                    >
                      {busy === "gallery" ? (
                        <div className="w-4 h-4 rounded-full border-2 border-[rgba(196,163,115,0.20)] border-t-brass animate-spin" />
                      ) : (
                        <>
                          <span className="text-[rgba(196,163,115,0.45)] text-lg leading-none">+</span>
                          <span className="font-display text-[0.36rem] tracking-[0.10em] uppercase text-[rgba(196,163,115,0.35)]">Add</span>
                        </>
                      )}
                    </label>
                    <input
                      id={`gallery-${product.id}`}
                      type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleGallery(product, f); e.target.value = ""; }}
                    />

                    {/* Image count */}
                    <div className="self-end mb-1 ml-1">
                      <span className="font-body font-light text-[rgba(245,237,224,0.22)] text-xs">
                        {allImages.length} image{allImages.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
