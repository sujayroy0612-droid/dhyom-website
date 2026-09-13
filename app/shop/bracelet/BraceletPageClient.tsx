"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import type { DbProduct } from "@/lib/supabase/types";

/* ── Mulank ─────────────────────────────────────────────────── */
function getMulank(day: number): number {
  let n = day;
  while (n > 9) n = String(n).split("").reduce((a, d) => a + Number(d), 0);
  return n;
}

/* ── Graha data ─────────────────────────────────────────────── */
const GRAHA: Record<number, { name: string; planet: string; stone: string; slug: string }> = {
  1: { name: "Surya",  planet: "Sun",     stone: "Red Garnet",        slug: "red-garnet-bracelet" },
  2: { name: "Chandra",planet: "Moon",    stone: "Rainbow Moonstone", slug: "rainbow-moonstone-bracelet" },
  3: { name: "Guru",   planet: "Jupiter", stone: "Citrine",           slug: "citrine-bracelet" },
  4: { name: "Rahu",   planet: "",        stone: "Smoky Quartz",      slug: "smoky-quartz-bracelet" },
  5: { name: "Budh",   planet: "Mercury", stone: "Green Aventurine",  slug: "green-aventurine-bracelet" },
  6: { name: "Shukra", planet: "Venus",   stone: "Clear Quartz",      slug: "clear-quartz-bracelet" },
  7: { name: "Ketu",   planet: "",        stone: "Labradorite",       slug: "labradorite-bracelet" },
  8: { name: "Shani",  planet: "Saturn",  stone: "Amethyst",          slug: "amethyst-bracelet" },
  9: { name: "Mangal", planet: "Mars",    stone: "Carnelian",         slug: "carnelian-bracelet" },
};

/* Derive graha label from product slug — shown as card subtitle */
const SLUG_LABEL: Record<string, string> = {
  "red-garnet-bracelet":        "Surya · Sun",
  "rainbow-moonstone-bracelet": "Chandra · Moon",
  "citrine-bracelet":           "Guru · Jupiter",
  "smoky-quartz-bracelet":      "Rahu",
  "green-aventurine-bracelet":  "Budh · Mercury",
  "clear-quartz-bracelet":      "Shukra · Venus",
  "labradorite-bracelet":       "Ketu",
  "amethyst-bracelet":          "Shani · Saturn",
  "carnelian-bracelet":         "Mangal · Mars",
};

function getSubcategorySlug(p: DbProduct): string {
  return p.collection ?? p.subcategory ?? "";
}

type Match = { mulank: number; graha: typeof GRAHA[1] };

export default function BraceletPageClient({ products }: { products: DbProduct[] }) {
  const [day, setDay]   = useState("");
  const [error, setError] = useState("");
  const [match, setMatch] = useState<Match | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const CARD_W = 288 + 20; // w-72 (288px) + gap-5 (20px)

  function scrollStrip(dir: -1 | 1) {
    scrollRef.current?.scrollBy({ left: dir * CARD_W, behavior: "smooth" });
  }

  function scrollToCard(idx: number) {
    scrollRef.current?.scrollTo({ left: idx * CARD_W, behavior: "smooth" });
  }

  function onScroll() {
    if (!scrollRef.current) return;
    setActiveIdx(Math.round(scrollRef.current.scrollLeft / CARD_W));
  }

  // Drag-to-scroll state
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0 });
  function onMouseDown(e: React.MouseEvent) {
    const el = scrollRef.current;
    if (!el) return;
    drag.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
    el.style.cursor = "grabbing";
  }
  function onMouseUp() {
    drag.current.active = false;
    if (scrollRef.current) scrollRef.current.style.cursor = "grab";
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current.active || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = drag.current.scrollLeft - (x - drag.current.startX);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const dayNum = parseInt(day, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      setError("Please enter a day between 1 and 31.");
      return;
    }

    const m = getMulank(dayNum);
    const graha = GRAHA[m];
    setMatch({ mulank: m, graha });

    // Scroll matched card into view
    setTimeout(() => {
      const el = document.getElementById(`bracelet-${graha.slug}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }, 80);

    // Fire-and-forget lead capture (day only)
    fetch("/api/graha-finder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day: dayNum, mulank: m, graha: graha.name, stone: graha.stone }),
    }).catch(() => {});
  }

  return (
    <section className="px-6 py-14">
      <div className="max-w-6xl mx-auto flex flex-col gap-12">

        {/* ── Finder widget ───────────────────────────────── */}
        <div className="flex flex-col gap-5 max-w-xl">
          <div>
            <p className="font-display text-[0.54rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.50)] mb-1">
              Find Your Stone
            </p>
            <p className="font-body font-light italic text-[rgba(245,237,224,0.42)] text-sm leading-relaxed">
              Enter the day of the month you were born to find your Graha and the bracelet aligned to it.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <form onSubmit={handleSubmit} className="flex items-start gap-3">
              <input
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={e => { setDay(e.target.value); setMatch(null); setError(""); }}
                placeholder="Day"
                aria-label="Day of birth (1–31)"
                className="w-24 bg-transparent border border-[rgba(196,163,115,0.22)] px-3 py-2.5 font-display text-ivory text-xl tracking-widest text-center placeholder:text-[rgba(245,237,224,0.18)] focus:outline-none focus:border-[rgba(196,163,115,0.55)] transition-colors duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="submit"
                className="border border-[rgba(196,163,115,0.40)] bg-[rgba(196,163,115,0.06)] text-brass font-display text-[0.62rem] tracking-[0.24em] uppercase px-6 py-3 hover:bg-[rgba(196,163,115,0.12)] hover:border-[rgba(196,163,115,0.65)] transition-colors duration-200"
              >
                Find My Stone
              </button>
            </form>
            {/* Example hint */}
            <p className="font-body font-light italic text-[rgba(245,237,224,0.28)] text-[0.72rem] leading-relaxed">
              Only the day matters — not month or year.{" "}
              <span className="text-[rgba(196,163,115,0.38)]">e.g. born on the 23rd: 2+3 = Mulank 5</span>
            </p>
          </div>

          {error && (
            <p className="font-body font-light italic text-[0.82rem]" style={{ color: "rgba(220,100,80,0.82)" }}>
              {error}
            </p>
          )}

          {match && (
            <div className="border-l-2 border-[rgba(196,163,115,0.35)] pl-4 flex flex-col gap-1">
              <p className="font-display text-[0.52rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.50)]">
                Mulank {match.mulank}
                {" · "}
                {match.graha.name}
                {match.graha.planet && ` · ${match.graha.planet}`}
              </p>
              <p className="font-body font-light text-ivory text-base">
                Your stone is{" "}
                <span className="text-brass italic">{match.graha.stone}</span>.
              </p>
              <Link
                href={`/shop/bracelet/navagraha/${match.graha.slug}`}
                className="mt-1 font-display text-[0.54rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.45)] hover:text-brass transition-colors duration-200"
              >
                View this bracelet →
              </Link>
            </div>
          )}
        </div>

        {/* ── Product grid ────────────────────────────────── */}
        {products.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-display text-[0.64rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.38)] mb-3">
              Coming soon
            </p>
            <p className="font-body font-light italic text-[rgba(245,237,224,0.32)] text-sm">
              The Navagraha collection is being prepared.
            </p>
          </div>
        ) : (
          <>
            {/* divider before grid */}
            <div className="h-px bg-gradient-to-r from-transparent via-[rgba(196,163,115,0.12)] to-transparent -mx-6" />

            {/* Scrollable strip */}
            <div
              ref={scrollRef}
              className="flex gap-5 overflow-x-auto pb-2 -mx-6 px-6 min-w-0"
              style={{ scrollbarWidth: "none", cursor: "grab", userSelect: "none" }}
              onScroll={onScroll}
              onMouseDown={onMouseDown}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onMouseMove={onMouseMove}
            >
              {products.map((product) => {
                const isMatch = match !== null && product.slug === match.graha.slug;
                return (
                  <div
                    key={product.id}
                    id={`bracelet-${product.slug ?? product.id}`}
                    className="flex-shrink-0 w-64 md:w-72 relative"
                    style={
                      isMatch
                        ? { outline: "1.5px solid rgba(196,163,115,0.60)", outlineOffset: "5px" }
                        : undefined
                    }
                  >
                    {isMatch && (
                      <div
                        aria-label="Your Graha match"
                        className="absolute top-0 left-0 z-10 bg-brass text-[#1A0A14] font-display text-[0.46rem] tracking-[0.22em] uppercase px-2 py-[3px] pointer-events-none"
                      >
                        Your Match
                      </div>
                    )}
                    <ProductCard
                      id={product.id}
                      slug={product.slug}
                      name={product.name}
                      category={product.category}
                      subcategorySlug={getSubcategorySlug(product)}
                      label={SLUG_LABEL[product.slug ?? ""] ?? "Navagraha"}
                      price={product.price}
                      description={product.short_description || product.description || undefined}
                      imageUrl={product.image_url || undefined}
                    />
                  </div>
                );
              })}
            </div>

            {/* Dots + arrows below strip */}
            <div className="flex items-center justify-center gap-5 pt-1">
              <button
                onClick={() => scrollStrip(-1)}
                aria-label="Previous"
                className="text-[rgba(196,163,115,0.45)] hover:text-brass transition-colors duration-200"
              >
                <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M17 7H1M7 1L1 7l6 6" />
                </svg>
              </button>

              <div className="flex items-center gap-[7px]">
                {products.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => scrollToCard(i)}
                    aria-label={`Go to item ${i + 1}`}
                    className="transition-all duration-300"
                    style={{
                      width:  i === activeIdx ? "18px" : "6px",
                      height: "2px",
                      borderRadius: "1px",
                      background: i === activeIdx
                        ? "rgba(196,163,115,0.80)"
                        : "rgba(196,163,115,0.22)",
                    }}
                  />
                ))}
              </div>

              <button
                onClick={() => scrollStrip(1)}
                aria-label="Next"
                className="text-[rgba(196,163,115,0.45)] hover:text-brass transition-colors duration-200"
              >
                <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M1 7h16M11 1l6 6-6 6" />
                </svg>
              </button>
            </div>
          </>
        )}

      </div>
    </section>
  );
}
