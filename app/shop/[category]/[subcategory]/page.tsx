export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { DbProduct } from "@/lib/supabase/types";
import ProductCard from "@/components/ProductCard";
import FadeInView from "@/components/FadeInView";

/* ─── Static metadata ─────────────────────────────────── */
const CATEGORY_NAMES: Record<string, string> = {
  candle: "Candles",
  idol: "Idols",
  bracelet: "Spiritual Bracelets",
  gift: "Gift Sets",
  "pooja-essentials": "Pooja Essentials",
};

const SUBCATEGORY_NAMES: Record<string, string> = {
  nakshatra: "Nakshatra Collection",
  mandala: "Mandala Collection",
  ganesha: "Ganesha",
  lakshmi: "Lakshmi",
  rudraksh: "Rudraksh Mala",
  "rose-quartz": "Rose Quartz",
  diwali: "Diwali",
  rakhi: "Rakhi",
  chhath: "Chhath Puja",
  "ganesh-chaturthi": "Ganesh Chaturthi",
  dussehra: "Dussehra",
  corporate: "Corporate Gifting",
  wedding: "Wedding",
  "incense-sticks": "Incense Sticks",
  "incense-cones": "Incense Cones",
  "ghee-batti": "Ghee Batti",
  camphor: "Camphor",
};

const SUBCATEGORY_DESCRIPTIONS: Record<string, string> = {
  nakshatra:
    "Five fragrances in glass — sandalwood, lavender, vanilla, coffee, citrus. Choose the stillness that suits the room.",
  mandala:
    "The same five fragrances, pressed into a tin. For the surface you choose to make sacred, wherever that may be.",
  ganesha: "Cast for the home that makes space for new beginnings.",
  lakshmi: "Abundance arrived as presence. For the threshold that holds what matters.",
  rudraksh: "Traditional beads, hand-knotted. Worn in daily practice.",
  "rose-quartz": "A stone with a long history of being kept close.",
  diwali: "Light, fragrance, and intention — assembled for the festival of lights.",
  rakhi: "For the bond that does not need occasion to mean something.",
  chhath: "Sacred items gathered for the festival of the sun and the dawn it honours.",
  "ganesh-chaturthi": "Assembled for the arrival of Ganesha. A box that greets him with the care he deserves.",
  dussehra: "For the day that marks what goodness can do.",
  corporate: "A gifting set rooted in Indian tradition. For the workplace that values meaning.",
  wedding: "For the beginning of a shared sacred life.",
  "incense-sticks": "Hand-rolled sandalwood, slow to burn. For the daily ritual.",
  "incense-cones": "Lavender cones for the corner you return to.",
  "ghee-batti": "Pure cow ghee in the traditional form. For the diya as it has always burned.",
  camphor: "For the aarti flame. As clean and certain as it has always been.",
};

/* ─── Static params ───────────────────────────────────── */
const VALID_PARAMS = [
  { category: "candle",            subcategory: "nakshatra" },
  { category: "candle",            subcategory: "mandala" },
  { category: "idol",              subcategory: "ganesha" },
  { category: "idol",              subcategory: "lakshmi" },
  { category: "bracelet",          subcategory: "rudraksh" },
  { category: "bracelet",          subcategory: "rose-quartz" },
  { category: "gift",              subcategory: "diwali" },
  { category: "gift",              subcategory: "rakhi" },
  { category: "gift",              subcategory: "chhath" },
  { category: "gift",              subcategory: "ganesh-chaturthi" },
  { category: "gift",              subcategory: "dussehra" },
  { category: "gift",              subcategory: "corporate" },
  { category: "gift",              subcategory: "wedding" },
  { category: "pooja-essentials",  subcategory: "incense-sticks" },
  { category: "pooja-essentials",  subcategory: "incense-cones" },
  { category: "pooja-essentials",  subcategory: "ghee-batti" },
  { category: "pooja-essentials",  subcategory: "camphor" },
];

/* ─── Label helper ────────────────────────────────────── */
function buildLabel(p: DbProduct): string {
  const first = p.collection
    ? p.collection.charAt(0).toUpperCase() + p.collection.slice(1)
    : p.type.charAt(0).toUpperCase() + p.type.slice(1);
  return [first, p.fragrance ?? null].filter(Boolean).join(" · ");
}

function getSubcategorySlug(p: DbProduct): string {
  return p.collection ?? p.subcategory ?? "";
}

/* ─── Page ────────────────────────────────────────────── */
interface PageProps {
  params: { category: string; subcategory: string };
}

export default async function SubcategoryPage({ params }: PageProps) {
  const { category, subcategory } = params;

  const isValid = VALID_PARAMS.some(
    (p) => p.category === category && p.subcategory === subcategory
  );
  if (!isValid) notFound();

  const categoryName = CATEGORY_NAMES[category];
  const subcategoryName = SUBCATEGORY_NAMES[subcategory] ?? subcategory;
  const subcategoryDescription = SUBCATEGORY_DESCRIPTIONS[subcategory];

  /* ── Fetch products + visibility ── */
  const supabase = createServerClient();
  const cols =
    "id,name,type,subcategory,collection,fragrance,price,description,short_description,image_url,category,stock,created_at";

  /* Check category and collection visibility in parallel with products */
  const [catVisRes, collVisRes] = await Promise.all([
    supabase.from("category_visibility").select("is_visible").eq("category", category).single(),
    supabase.from("collection_visibility").select("is_visible").eq("category", category).eq("subcategory", subcategory).single(),
  ]);
  if (catVisRes.data?.is_visible === false) notFound();
  if (collVisRes.data?.is_visible === false) notFound();

  const isCandle = category === "candle";
  const { data, error } = isCandle
    ? await supabase
        .from("products")
        .select(cols)
        .eq("category", category)
        .eq("collection", subcategory)
        .eq("is_visible", true)
        .order("created_at", { ascending: true })
    : await supabase
        .from("products")
        .select(cols)
        .eq("category", category)
        .eq("subcategory", subcategory)
        .eq("is_visible", true)
        .order("created_at", { ascending: true });

  if (error) {
    console.error("[Supabase] subcategory fetch error:", error.message);
  }

  const products = (data ?? []) as DbProduct[];

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
        <div className="max-w-6xl mx-auto relative">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-8 flex-wrap">
            <Link
              href="/shop"
              className="font-display text-[0.54rem] tracking-[0.2em] uppercase text-[rgba(245,237,224,0.30)] hover:text-[rgba(245,237,224,0.60)] transition-colors duration-200"
            >
              Shop
            </Link>
            <span className="text-[rgba(196,163,115,0.28)] text-xs">›</span>
            <Link
              href={`/shop/${category}`}
              className="font-display text-[0.54rem] tracking-[0.2em] uppercase text-[rgba(245,237,224,0.30)] hover:text-[rgba(245,237,224,0.60)] transition-colors duration-200"
            >
              {categoryName}
            </Link>
            <span className="text-[rgba(196,163,115,0.28)] text-xs">›</span>
            <span className="font-display text-[0.54rem] tracking-[0.2em] uppercase text-brass">
              {subcategoryName}
            </span>
          </nav>

          <FadeInView delay={0.1}>
            <h1
              className="font-display text-ivory mb-4"
              style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "0.05em" }}
            >
              {subcategoryName}
            </h1>
            <div className="w-10 h-px bg-[rgba(196,163,115,0.35)] mb-5" />
            {subcategoryDescription && (
              <p className="font-body font-light italic text-[rgba(245,237,224,0.52)] text-base leading-relaxed max-w-lg">
                {subcategoryDescription}
              </p>
            )}
            {!error && (
              <p className="font-display text-[0.54rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.38)] mt-5">
                {products.length === 1 ? "1 piece" : `${products.length} pieces`}
              </p>
            )}
          </FadeInView>
        </div>
      </section>

      {/* Brass rule */}
      <div className="h-px bg-gradient-to-r from-transparent via-[rgba(196,163,115,0.20)] to-transparent" />

      {/* Product grid */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">

          {error && (
            <div className="text-center py-20">
              <p className="font-display text-[0.64rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.40)] mb-4">
                Something went wrong
              </p>
              <p className="font-body font-light italic text-[rgba(245,237,224,0.32)] text-base">
                We could not load this collection. Please try again shortly.
              </p>
            </div>
          )}

          {!error && products.length === 0 && (
            <div className="text-center py-24">
              <p className="font-display text-[0.64rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.40)] mb-5">
                Nothing here yet
              </p>
              <p className="font-body font-light italic text-[rgba(245,237,224,0.32)] text-base max-w-xs mx-auto leading-relaxed">
                This collection is being curated. Return soon — something sacred
                is on its way.
              </p>
            </div>
          )}

          {!error && products.length > 0 && (
            <div
              className="scroll-strip flex gap-5 overflow-x-auto pb-4 -mx-6 px-6"
              style={{ scrollbarWidth: "none" }}
            >
              {products.map((product) => (
                <div key={product.id} className="flex-shrink-0 w-64 md:w-72">
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    category={product.category}
                    subcategorySlug={getSubcategorySlug(product)}
                    label={buildLabel(product)}
                    price={product.price}
                    description={product.short_description || product.description || undefined}
                    imageUrl={product.image_url || undefined}
                  />
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

    </div>
  );
}
