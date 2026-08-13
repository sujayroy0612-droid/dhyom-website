"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  images: string[];
  alt: string;
}

export default function ProductGallery({ images, alt }: Props) {
  const [active, setActive] = useState(0);
  const hasMultiple = images.length > 1;

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-[#270b1b] rounded-[6px] border border-[rgba(196,163,115,0.12)] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-px bg-[rgba(196,163,115,0.18)]" />
        <span className="font-display text-[0.55rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.20)]">
          Image Coming Soon
        </span>
        <div className="w-10 h-px bg-[rgba(196,163,115,0.18)]" />
      </div>
    );
  }

  const MainImage = ({ sizes }: { sizes: string }) => (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={active}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        className="absolute inset-0"
      >
        <Image
          src={images[active]}
          alt={alt}
          fill
          priority
          className="object-cover"
          sizes={sizes}
        />
      </motion.div>
    </AnimatePresence>
  );

  return (
    <>
      {/* ── Desktop: [vertical thumbs] + [main image] side by side ── */}
      <div className="hidden lg:flex gap-3 items-start">
        {hasMultiple && (
          <div className="flex flex-col gap-2 w-[76px] flex-shrink-0">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={[
                  "relative w-[76px] h-[76px] rounded-[4px] overflow-hidden border-[1.5px] transition-all duration-150 flex-shrink-0",
                  active === i
                    ? "border-brass shadow-[0_0_0_1px_rgba(196,163,115,0.30)]"
                    : "border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.45)] opacity-70 hover:opacity-100",
                ].join(" ")}
              >
                <Image
                  src={url}
                  alt={`${alt} — view ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="76px"
                />
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 aspect-square bg-[#270b1b] rounded-[6px] border border-[rgba(196,163,115,0.12)] overflow-hidden relative">
          <MainImage sizes="(max-width: 1280px) 50vw, 560px" />
        </div>
      </div>

      {/* ── Mobile: [main image] then [horizontal thumb strip] ── */}
      <div className="flex flex-col gap-3 lg:hidden">
        <div className="aspect-square bg-[#270b1b] rounded-[6px] border border-[rgba(196,163,115,0.12)] overflow-hidden relative">
          <MainImage sizes="100vw" />
        </div>

        {hasMultiple && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={[
                  "relative w-16 h-16 flex-shrink-0 rounded-[4px] overflow-hidden border-[1.5px] transition-all duration-150",
                  active === i
                    ? "border-brass shadow-[0_0_0_1px_rgba(196,163,115,0.25)]"
                    : "border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.40)] opacity-70 hover:opacity-100",
                ].join(" ")}
              >
                <Image
                  src={url}
                  alt={`${alt} — view ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
