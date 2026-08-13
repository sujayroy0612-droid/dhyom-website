"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";

interface Product {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
}

type UploadStatus = "idle" | "uploading" | "done" | "error";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

const CATEGORY_LABELS: Record<string, string> = {
  candle: "Candle",
  idol: "Idol",
  bracelet: "Bracelet",
  gift: "Gift Set",
  "pooja-essentials": "Pooja Essential",
};

export default function UploadImagesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<Record<string, UploadStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, category, image_url")
      .order("category")
      .order("name")
      .then(({ data }) => {
        setProducts((data as Product[]) ?? []);
        setLoading(false);
      });
  }, []);

  function setStatus(id: string, status: UploadStatus) {
    setStatuses((prev) => ({ ...prev, [id]: status }));
  }

  async function handleFile(product: Product, file: File) {
    setStatus(product.id, "uploading");
    setErrors((prev) => ({ ...prev, [product.id]: "" }));

    try {
      // 1 — Upload to Cloudinary (unsigned)
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      // Use product id as the public_id so overwriting replaces the old image
      fd.append("public_id", `products/${product.id}`);

      const czRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: fd }
      );
      if (!czRes.ok) {
        const body = await czRes.json().catch(() => ({}));
        throw new Error(body.error?.message ?? "Cloudinary upload failed");
      }
      const czData = await czRes.json();
      const imageUrl: string = czData.secure_url;

      // 2 — Save URL back to Supabase
      const { error: sbErr } = await supabase
        .from("products")
        .update({ image_url: imageUrl })
        .eq("id", product.id);

      if (sbErr) throw new Error(`Supabase: ${sbErr.message}`);

      // 3 — Update local state so thumbnail appears immediately
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, image_url: imageUrl } : p))
      );
      setStatus(product.id, "done");
      setTimeout(() => setStatus(product.id, "idle"), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setErrors((prev) => ({ ...prev, [product.id]: msg }));
      setStatus(product.id, "error");
      setTimeout(() => setStatus(product.id, "idle"), 4000);
    }
  }

  const uploaded = products.filter((p) => p.image_url).length;
  const missing = products.length - uploaded;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12060e] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12060e] pt-8 pb-16 px-8">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-10">
          <p className="font-display text-[0.52rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.40)] mb-3">
            Admin · Internal Tool
          </p>
          <h1
            className="font-display text-ivory mb-2"
            style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", letterSpacing: "0.05em" }}
          >
            Product Image Upload
          </h1>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-sm leading-relaxed max-w-lg">
            Upload product images to Cloudinary. The URL is saved to Supabase instantly — no rebuild needed.
          </p>
          <div className="mt-6 w-10 h-px bg-[rgba(196,163,115,0.22)]" />
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Products", value: products.length, color: "text-ivory" },
            { label: "Images Uploaded", value: uploaded, color: "text-brass" },
            { label: "Missing Images", value: missing, color: missing === 0 ? "text-[rgba(100,210,100,0.75)]" : "text-[rgba(210,90,90,0.75)]" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-damson border border-[rgba(196,163,115,0.14)] rounded-[5px] px-4 py-3.5">
              <p className="font-display text-[0.44rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.40)] mb-1.5">
                {label}
              </p>
              <p className={`font-display ${color}`} style={{ fontSize: "1.4rem", letterSpacing: "0.04em" }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="bg-damson border border-[rgba(196,163,115,0.14)] rounded-[6px] overflow-hidden">

          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-[64px_1fr_130px_170px] gap-4 px-5 py-3 border-b border-[rgba(196,163,115,0.10)]">
            {["Image", "Product", "Category", "Action"].map((h) => (
              <span key={h} className="font-display text-[0.44rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.38)]">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-[rgba(196,163,115,0.07)]">
            {products.map((product) => {
              const status = statuses[product.id] ?? "idle";
              const errMsg = errors[product.id];

              return (
                <div key={product.id} className="flex flex-col sm:grid sm:grid-cols-[64px_1fr_130px_170px] gap-3 sm:gap-4 items-start sm:items-center px-5 py-4">

                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-[4px] border border-[rgba(196,163,115,0.12)] bg-[#270b1b] overflow-hidden relative flex-shrink-0">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-display text-[0.34rem] tracking-[0.08em] uppercase text-[rgba(196,163,115,0.18)]">
                          None
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name + URL */}
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-display text-ivory leading-snug"
                      style={{ fontSize: "0.82rem", letterSpacing: "0.04em" }}
                    >
                      {product.name}
                    </p>
                    <p className="font-body font-light text-[rgba(245,237,224,0.28)] text-[0.68rem] mt-0.5 truncate">
                      {product.image_url
                        ? product.image_url.replace("https://res.cloudinary.com/", "cld/")
                        : "No image yet"}
                    </p>
                    {errMsg && (
                      <p className="font-body font-light text-[rgba(210,90,90,0.70)] text-[0.70rem] mt-1 leading-snug">
                        {errMsg}
                      </p>
                    )}
                  </div>

                  {/* Category */}
                  <span className="font-display text-[0.50rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.42)]">
                    {CATEGORY_LABELS[product.category] ?? product.category}
                  </span>

                  {/* Upload button */}
                  <div className="w-full sm:w-auto">
                    <input
                      ref={(el) => { fileRefs.current[product.id] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(product, file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      disabled={status === "uploading"}
                      onClick={() => fileRefs.current[product.id]?.click()}
                      className={[
                        "w-full font-display text-[0.52rem] tracking-[0.18em] uppercase rounded-[3px] px-4 py-2.5 border transition-all duration-200 active:scale-[0.98]",
                        status === "done"
                          ? "border-[rgba(100,200,100,0.40)] text-[rgba(100,215,100,0.80)] bg-[rgba(100,200,100,0.06)]"
                          : status === "error"
                          ? "border-[rgba(200,80,80,0.40)] text-[rgba(200,80,80,0.75)]"
                          : status === "uploading"
                          ? "border-[rgba(196,163,115,0.18)] text-[rgba(196,163,115,0.35)] cursor-not-allowed"
                          : product.image_url
                          ? "border-[rgba(196,163,115,0.28)] text-[rgba(196,163,115,0.55)] hover:border-[rgba(196,163,115,0.55)] hover:text-brass"
                          : "border-[rgba(196,163,115,0.42)] text-brass hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.65)]",
                      ].join(" ")}
                    >
                      {status === "uploading" ? "Uploading…"
                        : status === "done" ? "Saved ✓"
                        : status === "error" ? "Failed — retry"
                        : product.image_url ? "Replace"
                        : "Upload Image"}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer note ── */}
        <p className="font-body font-light italic text-[rgba(245,237,224,0.20)] text-[0.76rem] text-center mt-8 leading-relaxed">
          Images upload to Cloudinary (preset: <span className="text-[rgba(196,163,115,0.35)]">dhyom-products</span>).
          If the Supabase update fails, add an UPDATE policy on the products table:{" "}
          <span className="text-[rgba(196,163,115,0.35)]">create policy &quot;admin update&quot; on products for update using (true);</span>
        </p>

      </div>
    </div>
  );
}
