"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";

interface SiteAssetRow {
  key: string;
  image_url: string | null;
  updated_at: string;
}

const ASSET_META: { key: string; label: string; description: string }[] = [
  { key: "logo",                      label: "Logo",                                description: "Shown in the site header. Replaces the text 'DHYOM' wordmark." },
  { key: "hero_background",           label: "Homepage Hero Background",            description: "Full-bleed background image behind the hero headline." },
  { key: "seasonal_banner",           label: "Seasonal Spotlight Banner",           description: "Left-side image in the Seasonal Spotlight split section." },
  { key: "category_candle",           label: "Category Card — Candles",             description: "Image tile for the Candles category on homepage & /shop." },
  { key: "category_idol",             label: "Category Card — Idols",               description: "Image tile for the Idols category." },
  { key: "category_bracelet",         label: "Category Card — Spiritual Bracelets", description: "Image tile for the Bracelets category." },
  { key: "category_gift",             label: "Category Card — Gift Sets",           description: "Image tile for the Gift Sets category." },
  { key: "category_pooja_essentials", label: "Category Card — Pooja Essentials",   description: "Image tile for the Pooja Essentials category." },
];

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

type Status = "idle" | "uploading" | "done" | "error";

export default function UploadBrandImagesPage() {
  const [rows,     setRows]     = useState<Record<string, SiteAssetRow>>({});
  const [loading,  setLoading]  = useState(true);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    supabase
      .from("site_assets")
      .select("key, image_url, updated_at")
      .then(({ data }) => {
        const map: Record<string, SiteAssetRow> = {};
        for (const row of data ?? []) map[row.key] = row as SiteAssetRow;
        setRows(map);
        setLoading(false);
      });
  }, []);

  function setStatus(key: string, s: Status) {
    setStatuses((prev) => ({ ...prev, [key]: s }));
  }

  async function handleFile(key: string, file: File) {
    setStatus(key, "uploading");
    setErrors((prev) => ({ ...prev, [key]: "" }));

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      fd.append("public_id", `brand/${key}`);

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

      const { error: sbErr } = await supabase
        .from("site_assets")
        .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq("key", key);

      if (sbErr) throw new Error(`Supabase: ${sbErr.message}`);

      setRows((prev) => ({
        ...prev,
        [key]: { ...prev[key], image_url: imageUrl },
      }));
      setStatus(key, "done");
      setTimeout(() => setStatus(key, "idle"), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setErrors((prev) => ({ ...prev, [key]: msg }));
      setStatus(key, "error");
      setTimeout(() => setStatus(key, "idle"), 4000);
    }
  }

  const uploaded = ASSET_META.filter((a) => rows[a.key]?.image_url).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12060e] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12060e] pt-8 pb-16 px-8">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-10">
          <p className="font-display text-[0.52rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.40)] mb-3">
            Admin · Internal Tool
          </p>
          <h1
            className="font-display text-ivory mb-2"
            style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", letterSpacing: "0.05em" }}
          >
            Brand Image Management
          </h1>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-sm leading-relaxed max-w-lg">
            Upload site-wide images — hero, logo, seasonal banner, category cards. Changes appear on the site immediately.
          </p>
          <div className="mt-6 w-10 h-px bg-[rgba(196,163,115,0.22)]" />
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Assets",    value: ASSET_META.length, color: "text-ivory" },
            { label: "Uploaded",        value: uploaded,           color: "text-brass" },
            { label: "Missing",         value: ASSET_META.length - uploaded,
              color: ASSET_META.length - uploaded === 0 ? "text-[rgba(100,210,100,0.75)]" : "text-[rgba(210,90,90,0.75)]" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-damson border border-[rgba(196,163,115,0.14)] rounded-[5px] px-4 py-3.5">
              <p className="font-display text-[0.44rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.40)] mb-1.5">{label}</p>
              <p className={`font-display ${color}`} style={{ fontSize: "1.4rem", letterSpacing: "0.04em" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Asset cards ── */}
        <div className="flex flex-col gap-4">
          {ASSET_META.map(({ key, label, description }) => {
            const row    = rows[key];
            const imgUrl = row?.image_url ?? null;
            const status = statuses[key] ?? "idle";
            const errMsg = errors[key];

            return (
              <div
                key={key}
                className="bg-damson border border-[rgba(196,163,115,0.14)] rounded-[6px] overflow-hidden flex flex-col sm:flex-row"
              >
                {/* Thumbnail */}
                <div className="w-full sm:w-40 h-32 sm:h-auto flex-shrink-0 bg-[#270b1b] relative flex items-center justify-center">
                  {imgUrl ? (
                    <Image
                      src={imgUrl}
                      alt={label}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 160px"
                    />
                  ) : (
                    <span className="font-display text-[0.38rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.18)]">
                      Not set
                    </span>
                  )}
                </div>

                {/* Info + action */}
                <div className="flex-1 flex flex-col justify-between px-6 py-5 min-w-0 gap-4">
                  <div className="min-w-0">
                    <p
                      className="font-display text-ivory"
                      style={{ fontSize: "0.84rem", letterSpacing: "0.05em" }}
                    >
                      {label}
                    </p>
                    <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-[0.80rem] mt-0.5 leading-relaxed">
                      {description}
                    </p>
                    {imgUrl && (
                      <p className="font-body text-[rgba(245,237,224,0.22)] text-[0.67rem] mt-1.5 truncate">
                        {imgUrl.replace("https://res.cloudinary.com/", "cld/")}
                      </p>
                    )}
                    {errMsg && (
                      <p className="font-body font-light text-[rgba(210,90,90,0.70)] text-[0.72rem] mt-1.5 leading-snug">
                        {errMsg}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      ref={(el) => { fileRefs.current[key] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(key, file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      disabled={status === "uploading"}
                      onClick={() => fileRefs.current[key]?.click()}
                      className={[
                        "font-display text-[0.52rem] tracking-[0.18em] uppercase rounded-[3px] px-5 py-2.5 border transition-all duration-200 active:scale-[0.98]",
                        status === "done"
                          ? "border-[rgba(100,200,100,0.40)] text-[rgba(100,215,100,0.80)] bg-[rgba(100,200,100,0.06)]"
                          : status === "error"
                          ? "border-[rgba(200,80,80,0.40)] text-[rgba(200,80,80,0.75)]"
                          : status === "uploading"
                          ? "border-[rgba(196,163,115,0.18)] text-[rgba(196,163,115,0.35)] cursor-not-allowed"
                          : imgUrl
                          ? "border-[rgba(196,163,115,0.28)] text-[rgba(196,163,115,0.55)] hover:border-[rgba(196,163,115,0.55)] hover:text-brass"
                          : "border-[rgba(196,163,115,0.42)] text-brass hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.65)]",
                      ].join(" ")}
                    >
                      {status === "uploading" ? "Uploading…"
                        : status === "done"    ? "Saved ✓"
                        : status === "error"   ? "Failed — retry"
                        : imgUrl              ? "Replace"
                        : "Upload Image"}
                    </button>

                    <span className="font-display text-[0.44rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.30)]">
                      {key}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer note ── */}
        <p className="font-body font-light italic text-[rgba(245,237,224,0.20)] text-[0.76rem] text-center mt-10 leading-relaxed">
          Uploads go to Cloudinary under the{" "}
          <span className="text-[rgba(196,163,115,0.35)]">brand/</span> folder.
          If Supabase UPDATE fails, ensure the{" "}
          <span className="text-[rgba(196,163,115,0.35)]">admin write</span> policy exists on the{" "}
          <span className="text-[rgba(196,163,115,0.35)]">site_assets</span> table.
        </p>

      </div>
    </div>
  );
}
