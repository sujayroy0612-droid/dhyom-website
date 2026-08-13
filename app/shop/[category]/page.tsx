import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { DbProduct } from "@/lib/supabase/types";
import ProductCard from "@/components/ProductCard";

/* ─── Category metadata ───────────────────────────────── */
const categoryMeta: Record<
  string,
  { name: string; description: string; dbValue: string }
> = {
  candle: {
    name: "Candles",
    description:
      "Two collections — Nakshatra in glass, Mandala in tin. Each fragrance chosen for the quality of its stillness.",
    dbValue: "candle",
  },
  idol: {
    name: "Idols",
    description:
      "Sacred figures for the home altar. Cast with reverence for the deities they represent.",
    dbValue: "idol",
  },
  bracelet: {
    name: "Spiritual Bracelets",
    description:
      "Traditional stones and seeds, strung for the wrist. Worn in daily practice.",
    dbValue: "bracelet",
  },
  gift: {
    name: "Gift Sets",
    description:
      "Curated boxes for every sacred occasion — festivals, weddings, and the rituals that mark a year.",
    dbValue: "gift",
  },
  "pooja-essentials": {
    name: "Pooja Essentials",
    description:
      "The foundational items of daily ritual — incense, ghee batti, camphor — in their purest forms.",
    dbValue: "pooja-essentials",
  },
};

/* ─── Helpers ─────────────────────────────────────────── */
function buildLabel(product: DbProduct): string {
  const parts: (string | null)[] = [
    product.collection
      ? product.collection.charAt(0).toUpperCase() + product.collection.slice(1)
      : product.type.charAt(0).toUpperCase() + product.type.slice(1),
    product.fragrance ?? null,
  ];
  return parts.filter(Boolean).join(" · ");
}

/* ─── Page ────────────────────────────────────────────── */
interface PageProps {
  params: { category: string };
}

export function generateStaticParams() {
  return Object.keys(categoryMeta).map((category) => ({ category }));
}

export default async function CategoryPage({ params }: PageProps) {
  const meta = categoryMeta[params.category];
  if (!meta) notFound();

  /* ── Fetch from Supabase ── */
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, type, fragrance, price, description, image_url")
    .eq("category", meta.dbValue)
    .order("created_at", { ascending: true });

  // Surface fetch errors in development; fail gracefully in production
  if (error) {
    console.error("[Supabase] products fetch error:", error.message);
  }

  const products: DbProduct[] = data ?? [];

  /* ── Render ── */
  return (
    <div className="min-h-screen">

      {/* ── Page header — Damson (30%) ── */}
      <section className="bg-damson pt-28 pb-16 px-6 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(107,42,72,0.30) 0%, transparent 70%)",
          }}
        />

        <div className="max-w-6xl mx-auto relative">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-8">
            <Link
              href="/"
              className="font-display text-[0.55rem] tracking-[0.2em] uppercase text-[rgba(245,237,224,0.32)] hover:text-[rgba(245,237,224,0.65)] transition-colors duration-200"
            >
              Home
            </Link>
            <span className="text-[rgba(196,163,115,0.30)] text-xs">›</span>
            <Link
              href="/shop"
              className="font-display text-[0.55rem] tracking-[0.2em] uppercase text-[rgba(245,237,224,0.32)] hover:text-[rgba(245,237,224,0.65)] transition-colors duration-200"
            >
              Shop
            </Link>
            <span className="text-[rgba(196,163,115,0.30)] text-xs">›</span>
            <span className="font-display text-[0.55rem] tracking-[0.2em] uppercase text-brass">
              {meta.name}
            </span>
          </nav>

          <h1
            className="font-display text-ivory mb-4"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              letterSpacing: "0.05em",
              lineHeight: 1.1,
            }}
          >
            {meta.name}
          </h1>

          <div className="w-10 h-px bg-[rgba(196,163,115,0.35)] mb-5" />

          <p className="font-body font-light italic text-[rgba(245,237,224,0.55)] text-lg max-w-xl leading-relaxed">
            {meta.description}
          </p>

          {!error && (
            <p className="font-display text-[0.55rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.40)] mt-6">
              {products.length === 1
                ? "1 piece"
                : `${products.length} pieces`}
            </p>
          )}
        </div>
      </section>

      {/* Brass divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[rgba(196,163,115,0.28)] to-transparent" />
      </div>

      {/* ── Product grid — Black Plum ── */}
      <section className="bg-black-plum py-20 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Error state */}
          {error && (
            <div className="text-center py-20">
              <p className="font-display text-[0.65rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.45)] mb-4">
                Something went wrong
              </p>
              <p className="font-body font-light italic text-[rgba(245,237,224,0.35)] text-base">
                We could not load this collection. Please try again shortly.
              </p>
            </div>
          )}

          {/* Empty state */}
          {!error && products.length === 0 && (
            <div className="text-center py-24">
              <p className="font-display text-[0.65rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.45)] mb-5">
                Nothing here yet
              </p>
              <p className="font-body font-light italic text-[rgba(245,237,224,0.35)] text-lg max-w-sm mx-auto leading-relaxed">
                This collection is being curated. Return soon — something
                sacred is on its way.
              </p>
            </div>
          )}

          {/* Product grid */}
          {!error && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  label={buildLabel(product)}
                  price={product.price}
                  description={product.description || undefined}
                  imageUrl={product.image_url || undefined}
                />
              ))}
            </div>
          )}

        </div>
      </section>

    </div>
  );
}
