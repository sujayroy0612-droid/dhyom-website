"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface HamperLevel {
  id: string;
  level: string;
  name: string;
  min_spend: number;
  sort_order: number;
}

interface Props {
  category: string;
  subcategory: string;
}

const LEVEL_DESCS: Record<string, string> = {
  essential: "A thoughtful hamper to begin the celebration.",
  signature: "Curated with care for those who matter most.",
  heirloom:  "An extraordinary gift, assembled for lasting memory.",
};

export default function HamperLevelCards({ category, subcategory }: Props) {
  const [levels, setLevels] = useState<HamperLevel[]>([]);

  useEffect(() => {
    fetch("/api/hampers/builder-config")
      .then(r => r.json())
      .then((d: { levels?: HamperLevel[] }) => setLevels(d.levels ?? []))
      .catch(() => {});
  }, []);

  if (levels.length === 0) return null;

  return (
    <div className="mb-2">
      <p className="font-display text-[0.52rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.45)] mb-6 text-center">
        Build Your Own Hamper
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {levels.map(level => (
          <Link
            key={level.id}
            href={`/shop/${category}/${subcategory}/hamper?level=${encodeURIComponent(level.level)}`}
            className="group block border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.45)] rounded-[5px] px-5 py-6 bg-[rgba(196,163,115,0.02)] hover:bg-[rgba(196,163,115,0.06)] transition-all duration-200"
          >
            <p className="font-display text-[0.44rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.42)] mb-2">
              Hamper
            </p>
            <p className="font-display text-ivory mb-1" style={{ fontSize: "1.05rem", letterSpacing: "0.05em" }}>
              {level.name}
            </p>
            <p className="font-display text-brass mb-3" style={{ fontSize: "0.82rem", letterSpacing: "0.04em" }}>
              From ₹{level.min_spend.toLocaleString("en-IN")}
            </p>
            <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-[0.82rem] leading-relaxed mb-4">
              {LEVEL_DESCS[level.level] ?? "Curated with intention and care."}
            </p>
            <span className="inline-flex items-center gap-2 font-display text-[0.52rem] tracking-[0.18em] uppercase text-brass group-hover:text-ivory transition-colors duration-150">
              Build Hamper
              <svg width="11" height="9" viewBox="0 0 11 9" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 4.5h9M6 1l4 3.5L6 8" /></svg>
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-8 h-px bg-gradient-to-r from-transparent via-[rgba(196,163,115,0.18)] to-transparent" />
    </div>
  );
}
