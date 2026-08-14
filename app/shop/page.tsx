export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { fetchSiteAssets } from "@/lib/supabase/site-assets";
import { createServerClient } from "@/lib/supabase/server";
import CardGrid from "@/components/CardGrid";

export const metadata = { title: "Shop — Dhyom" };

const CATEGORIES = [
  {
    slug:        "candle",
    assetKey:    "category_candle",
    title:       "Candles",
    description: "Two collections of scented wax — Nakshatra in glass, Mandala in tin.",
  },
  {
    slug:        "idol",
    assetKey:    "category_idol",
    title:       "Idols",
    description: "Ganesha and Lakshmi, cast for the home altar.",
  },
  {
    slug:        "bracelet",
    assetKey:    "category_bracelet",
    title:       "Spiritual Bracelets",
    description: "Rudraksh and rose quartz, hand-knotted for daily practice.",
  },
  {
    slug:        "gift",
    assetKey:    "category_gift",
    title:       "Gift Sets",
    description: "Curated boxes for the festivals and occasions that mark a sacred year.",
  },
  {
    slug:        "pooja-essentials",
    assetKey:    "category_pooja_essentials",
    title:       "Pooja Essentials",
    description: "Incense, ghee batti, camphor — the foundational items of daily ritual.",
  },
];

export default async function ShopPage() {
  const supabase = createServerClient();
  const [assets, catVisRes] = await Promise.all([
    fetchSiteAssets().catch(() => ({})),
    supabase.from("category_visibility").select("category").eq("is_visible", true),
  ]);
  const visibleCatSlugs = new Set((catVisRes.data ?? []).map((r) => r.category as string));
  const visibleCategories = CATEGORIES.filter((c) => visibleCatSlugs.has(c.slug));

  return (
    <div className="min-h-screen bg-black-plum">

      {/* Header */}
      <section className="bg-damson pt-28 pb-14 px-6 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(107,42,72,0.28) 0%, transparent 70%)",
          }}
        />
        <div className="max-w-4xl mx-auto relative text-center">
          <p className="font-display text-[0.58rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.50)] mb-4">
            Browse by Category
          </p>
          <h1
            className="font-display text-ivory"
            style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "0.05em" }}
          >
            The Collection
          </h1>
          <div className="w-10 h-px bg-[rgba(196,163,115,0.35)] mt-5 mx-auto" />
        </div>
      </section>

      {/* Category tiles */}
      <section className="px-6 py-16">
        <CardGrid gridClassName="grid-cols-2 lg:grid-cols-3 gap-5" className="max-w-4xl mx-auto">
          {visibleCategories.map((cat) => {
            const imgUrl = (assets as Record<string, string | null>)[cat.assetKey] ?? null;
            return (
              <Link
                key={cat.slug}
                href={`/shop/${cat.slug}`}
                className="group bg-damson border border-[rgba(196,163,115,0.14)] rounded-[6px] overflow-hidden flex flex-col hover:border-[rgba(196,163,115,0.50)] hover:shadow-[0_12px_40px_rgba(15,5,8,0.40)] hover:-translate-y-0.5 transition-all duration-300 h-full"
              >
                {/* Image — shown when asset exists, placeholder otherwise */}
                <div className="aspect-[3/2] bg-[#270b1b] relative overflow-hidden flex items-center justify-center">
                  {imgUrl ? (
                    <Image
                      src={imgUrl}
                      alt={cat.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="font-display text-[0.50rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.18)]"
                    >
                      Image coming soon
                    </span>
                  )}
                </div>

                {/* Text */}
                <div className="flex flex-col gap-3 p-7 flex-1">
                  <div className="flex flex-col gap-2">
                    <h2
                      className="font-display text-ivory leading-tight"
                      style={{ fontSize: "1.05rem", letterSpacing: "0.05em" }}
                    >
                      {cat.title}
                    </h2>
                    <p className="font-body font-light italic text-[rgba(245,237,224,0.48)] text-sm leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-[rgba(196,163,115,0.10)] font-display text-[0.58rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.45)] group-hover:text-brass transition-colors duration-200">
                    Browse
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <path d="M1 5h10M7 1l4 4-4 4" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </CardGrid>
      </section>

    </div>
  );
}
