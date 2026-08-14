import Link from "next/link";
import Image from "next/image";
import Button from "@/components/Button";
import ProductCard from "@/components/ProductCard";
import NewsletterForm from "@/components/NewsletterForm";
import FadeIn from "@/components/FadeIn";
import FadeInView from "@/components/FadeInView";
import CardGrid from "@/components/CardGrid";
import { createServerClient } from "@/lib/supabase/server";
import { fetchSiteAssets, type SiteAssets } from "@/lib/supabase/site-assets";
import type { DbProduct } from "@/lib/supabase/types";

/* ─── Category → asset key map ───────────────────────── */
const CATEGORY_ASSET: Record<string, string> = {
  candle:             "category_candle",
  idol:               "category_idol",
  bracelet:           "category_bracelet",
  gift:               "category_gift",
  "pooja-essentials": "category_pooja_essentials",
};

/* ─── Category data ───────────────────────────────────── */
const categories = [
  {
    id: "candle",
    title: "Candles",
    shortTitle: "Candles",
    href: "/shop/candle",
    description:
      "Two collections of scented wax — Nakshatra in glass, Mandala in tin — chosen for the quality of stillness each fragrance holds.",
  },
  {
    id: "idol",
    title: "Idols",
    shortTitle: "Idols",
    href: "/shop/idol",
    description:
      "Ganesha and Lakshmi, cast for the home altar — sacred presence for the space that holds what matters.",
  },
  {
    id: "bracelet",
    title: "Spiritual Bracelets",
    shortTitle: "Bracelets",
    href: "/shop/bracelet",
    description:
      "Rudraksh mala and rose quartz, hand-knotted for the wrist and worn in daily practice.",
  },
  {
    id: "gift",
    title: "Gift Sets",
    shortTitle: "Gift Sets",
    href: "/shop/gift",
    description:
      "Curated boxes for the festivals and occasions that mark a sacred year — assembled with the care the moment deserves.",
  },
  {
    id: "pooja-essentials",
    title: "Pooja Essentials",
    shortTitle: "Pooja Essentials",
    href: "/shop/pooja-essentials",
    description:
      "Incense sticks, ghee batti, camphor — the foundational items of daily ritual in their purest and simplest forms.",
  },
];

/* ─── Value pillars data ──────────────────────────────── */
const pillars = [
  {
    label: "Eco-Conscious Craft",
    body: "Charcoal-free, natural ingredients in every product",
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        {/* Leaf outline */}
        <path d="M22 4 Q36 10 36 26 Q36 40 22 42 Q8 40 8 26 Q8 10 22 4 Z" />
        {/* Central midrib */}
        <line x1="22" y1="6" x2="22" y2="42" />
        {/* Side veins */}
        <line x1="22" y1="20" x2="13" y2="14" />
        <line x1="22" y1="30" x2="31" y2="24" />
      </svg>
    ),
  },
  {
    label: "Handcrafted in India",
    body: "Made by skilled artisans, not mass-produced",
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        {/* Diya bowl */}
        <path d="M8 26 Q8 40 22 42 Q36 40 36 26" />
        {/* Rim */}
        <path d="M6 24 Q6 22 22 22 Q38 22 38 24 Q38 26 22 27 Q6 26 6 24 Z" />
        {/* Wick */}
        <line x1="22" y1="22" x2="22" y2="17" />
        {/* Flame */}
        <path d="M22 6 Q26 10 26 15 Q26 19 22 22 Q18 19 18 15 Q18 10 22 6 Z" />
      </svg>
    ),
  },
  {
    label: "Panchagavya Formula",
    body: "Rooted in traditional Vedic ingredients",
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        {/* Kalash body */}
        <path d="M15 40 Q9 34 9 24 Q9 16 14 12 L16 8 Q16 6 22 6 Q28 6 28 8 L30 12 Q35 16 35 24 Q35 34 29 40 Z" />
        {/* Base */}
        <line x1="12" y1="40" x2="32" y2="40" />
        {/* Shoulder band */}
        <path d="M14 16 Q22 19 30 16" />
        {/* Neck band */}
        <line x1="15" y1="8" x2="29" y2="8" />
        {/* Mango / coconut on top */}
        <path d="M18 6 Q22 1 26 6" />
        <line x1="22" y1="1" x2="22" y2="6" />
      </svg>
    ),
  },
  {
    label: "Thoughtful Gifting",
    body: "Curated for the moments that matter",
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        {/* Box body */}
        <rect x="7" y="21" width="30" height="20" rx="1" />
        {/* Lid */}
        <rect x="5" y="14" width="34" height="8" rx="1" />
        {/* Vertical ribbon */}
        <line x1="22" y1="14" x2="22" y2="41" />
        {/* Left bow loop */}
        <path d="M22 14 Q17 7 12 10 Q10 13 16 14" />
        {/* Right bow loop */}
        <path d="M22 14 Q27 7 32 10 Q34 13 28 14" />
        {/* Bow knot */}
        <circle cx="22" cy="14" r="1.8" />
      </svg>
    ),
  },
];

/* ─── Helpers ─────────────────────────────────────────── */
function buildLabel(p: DbProduct): string {
  const first = p.collection
    ? p.collection.charAt(0).toUpperCase() + p.collection.slice(1)
    : p.type.charAt(0).toUpperCase() + p.type.slice(1);
  return [first, p.fragrance ?? null].filter(Boolean).join(" · ");
}

function getSubcategorySlug(p: DbProduct): string {
  return p.collection ?? p.subcategory ?? "";
}

/* ─── Types ───────────────────────────────────────────── */
interface Review { id: string; name: string; rating: number; body: string; }

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 12 12" fill={i <= rating ? "#C4A373" : "none"} stroke="#C4A373" strokeWidth="1" aria-hidden="true">
          <path d="M6 1l1.4 3h3.1L8 6l1 3L6 7.5 3 9l1-3-2.5-2h3.1L6 1z" />
        </svg>
      ))}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────── */
export default async function Home() {
  const supabase = createServerClient();
  const cols = "id,name,type,subcategory,collection,fragrance,price,description,image_url,category,stock,is_featured,created_at";
  const [featuredRes, reviewsRes, assets, catVisRes] = await Promise.all([
    supabase.from("products").select(cols).eq("is_featured", true).eq("is_visible", true).limit(12),
    supabase.from("reviews").select("id,name,rating,body").eq("approved", true).order("created_at", { ascending: false }).limit(8),
    fetchSiteAssets().catch((): SiteAssets => ({})),
    supabase.from("category_visibility").select("category").eq("is_visible", true),
  ]);
  const featured = (featuredRes.data ?? []) as DbProduct[];
  const reviews = (reviewsRes.data ?? []) as Review[];
  const visibleCatSlugs = new Set((catVisRes.data ?? []).map((r) => r.category as string));
  // If table is empty or missing, show all categories (fail-open)
  const visibleCategories = visibleCatSlugs.size > 0
    ? categories.filter((c) => visibleCatSlugs.has(c.id))
    : categories;

  return (
    <div className="min-h-screen">

      {/* ══ 1. HERO ══════════════════════════════════════════ */}
      <section className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 bg-damson overflow-hidden">
        {assets.hero_background && (
          <>
            <Image
              src={assets.hero_background}
              alt=""
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(61,20,40,0.78) 0%, rgba(61,20,40,0.22) 28%, rgba(61,20,40,0.10) 50%, rgba(61,20,40,0.25) 72%, rgba(61,20,40,0.72) 100%)",
              }}
            />
          </>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 38%, rgba(107,42,72,0.38) 0%, transparent 70%)",
          }}
        />

        <FadeIn delay={0} className="relative">
          <p className="font-display text-[0.62rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.60)] mb-7">
            Sacred · Sustainable · Indian
          </p>
        </FadeIn>

        <FadeIn delay={0.14} className="relative">
          <h1
            className="font-display text-ivory mb-10 max-w-3xl"
            style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)", letterSpacing: "0.05em", lineHeight: 1.12 }}
          >
            Bring the Sacred
            <br />
            <span className="text-brass">Home</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.30} className="relative">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center font-display uppercase tracking-[0.22em] rounded-full transition-colors duration-200 active:scale-[0.98] px-8 py-2.5 text-[0.65rem] bg-brass text-ink border border-brass hover:bg-[#d4b383] hover:border-[#d4b383]"
          >
            Explore the Collection
          </Link>
        </FadeIn>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[rgba(196,163,115,0.35)]">
          <span className="font-display text-[0.55rem] tracking-[0.28em] uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-[rgba(196,163,115,0.35)] to-transparent" />
        </div>
      </section>


      {/* ══ 2. BEST SELLING ══════════════════════════════════ */}
      <section className="bg-black-plum py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeInView className="text-center mb-14">
            <p className="font-display text-[0.60rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.45)] mb-4">
              Handpicked
            </p>
            <h2
              className="font-display text-ivory"
              style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", letterSpacing: "0.05em" }}
            >
              Best Selling
            </h2>
            <div className="mt-5 mx-auto w-12 h-px bg-[rgba(196,163,115,0.35)]" />
          </FadeInView>

          {featured.length > 0 ? (
            <CardGrid gridClassName="grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  category={product.category}
                  subcategorySlug={getSubcategorySlug(product)}
                  label={buildLabel(product)}
                  price={product.price}
                  description={product.description || undefined}
                  imageUrl={product.image_url || undefined}
                />
              ))}
            </CardGrid>
          ) : (
            <p className="text-center font-body font-light italic text-[rgba(245,237,224,0.30)] text-base">
              The collection is being assembled. Return soon.
            </p>
          )}

          <div className="text-center mt-12">
            <Link href="/shop/candle">
              <Button variant="secondary" size="md">View All Products</Button>
            </Link>
          </div>
        </div>
      </section>


      {/* ══ 3. OUR COLLECTION — category grid ════════════════ */}
      <section className="bg-[#F5EDE0] py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeInView className="text-center mb-16">
            <p className="font-display text-[0.60rem] tracking-[0.28em] uppercase text-[rgba(61,20,40,0.45)] mb-4">
              Browse by Category
            </p>
            <h2
              className="font-display text-damson"
              style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", letterSpacing: "0.05em" }}
            >
              Our Collection
            </h2>
            <div className="mt-5 mx-auto w-12 h-px bg-[rgba(196,163,115,0.45)]" />
          </FadeInView>

          <CardGrid gridClassName="grid-cols-2 lg:grid-cols-3 gap-7">
            {visibleCategories.map((cat) => (
              <Link
                key={cat.id}
                href={cat.href}
                className="bg-damson border border-[rgba(196,163,115,0.15)] rounded-[6px] overflow-hidden group hover:border-[rgba(196,163,115,0.42)] hover:shadow-[0_12px_40px_rgba(15,5,8,0.28)] transition-all duration-300 flex flex-col h-full"
              >
                <div className="aspect-[4/3] bg-[#2a0c1c] flex items-center justify-center overflow-hidden relative">
                  {assets[CATEGORY_ASSET[cat.id]] ? (
                    <Image
                      src={assets[CATEGORY_ASSET[cat.id]]!}
                      alt={cat.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <span aria-hidden="true" className="font-display text-[0.55rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.22)]">
                      Image coming soon
                    </span>
                  )}
                </div>
                <div className="p-7 flex flex-col gap-4">
                  <h3 className="font-display text-ivory" style={{ fontSize: "1.05rem", letterSpacing: "0.05em" }}>
                    {cat.title}
                  </h3>
                  <p className="font-body font-light italic text-[rgba(245,237,224,0.52)] text-base leading-relaxed">
                    {cat.description}
                  </p>
                  <div className="inline-flex items-center gap-2 font-display text-[0.60rem] tracking-[0.2em] uppercase text-brass group-hover:text-ivory transition-colors duration-200 mt-1">
                    Shop {cat.shortTitle}
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <path d="M1 5h10M7 1l4 4-4 4" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </CardGrid>
        </div>
      </section>


      {/* ══ 4. FESTIVAL CAMPAIGN — seasonal spotlight ════════ */}
      <FadeInView>
      <section className="bg-damson py-0 overflow-hidden">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row">

          <div className="lg:w-3/5 aspect-[4/3] lg:aspect-auto lg:min-h-[520px] bg-[#270b1b] relative overflow-hidden flex-shrink-0">
            {assets.seasonal_banner ? (
              <Image
                src={assets.seasonal_banner}
                alt="Seasonal collection"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            ) : (
              <>
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    background: "radial-gradient(ellipse 80% 80% at 30% 60%, rgba(107,42,72,0.25) 0%, transparent 70%)",
                  }}
                />
                <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-display text-[0.55rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.18)]">
                  Campaign image coming soon
                </span>
              </>
            )}
          </div>

          <div className="lg:w-2/5 flex flex-col justify-center px-10 py-16 lg:py-20">
            <p className="font-display text-[0.60rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.55)] mb-5">
              Raksha Bandhan
            </p>
            <h2
              className="font-display text-ivory mb-5"
              style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)", letterSpacing: "0.05em", lineHeight: 1.12 }}
            >
              The Rakhi
              <br />
              <span className="text-brass">Collection</span>
            </h2>
            <div className="w-8 h-px bg-[rgba(196,163,115,0.35)] mb-7" />
            <p className="font-body font-light italic text-[rgba(245,237,224,0.55)] text-base leading-relaxed mb-10">
              A gift she will light every morning. A ritual that begins
              because of you. Candles, incense, and intention — assembled
              for the bond you cherish most.
            </p>
            <div>
              <Link href="/shop/gift">
                <Button size="md">Shop the Collection</Button>
              </Link>
            </div>
          </div>

        </div>
      </section>
      </FadeInView>


      {/* ══ 5a. WHY CHOOSE DHYOM — value pillars ════════════ */}
      <section className="bg-ink py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeInView className="text-center mb-16">
            <p className="font-display text-[0.60rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.42)] mb-4">
              Our Commitment
            </p>
            <h2
              className="font-display text-ivory"
              style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", letterSpacing: "0.05em" }}
            >
              Why Choose Dhyom?
            </h2>
            <div className="mt-5 mx-auto w-12 h-px bg-[rgba(196,163,115,0.30)]" />
          </FadeInView>

          <CardGrid gridClassName="grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((pillar) => (
              <div
                key={pillar.label}
                className="flex flex-col items-center text-center gap-6 px-6 py-10 border border-[rgba(196,163,115,0.09)] rounded-[4px]"
              >
                <span className="text-brass" style={{ opacity: 0.78 }}>
                  {pillar.icon}
                </span>
                <div className="flex flex-col items-center gap-3">
                  <h3
                    className="font-display text-ivory leading-snug"
                    style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase" }}
                  >
                    {pillar.label}
                  </h3>
                  <div className="w-6 h-px bg-[rgba(196,163,115,0.28)]" />
                  <p className="font-body font-light italic text-[rgba(245,237,224,0.48)] text-[0.88rem] leading-relaxed">
                    {pillar.body}
                  </p>
                </div>
              </div>
            ))}
          </CardGrid>
        </div>
      </section>

      {/* ══ 5b. OUR PURPOSE — image left, text right ════════ */}
      <section className="bg-black-plum overflow-hidden">
        <div className="lg:flex lg:min-h-[600px]">

          {/* Image — left on desktop, top on mobile */}
          <div className="lg:w-[55%] aspect-[4/3] lg:aspect-auto relative bg-[#180a12] flex-shrink-0">
            {assets.purpose_image ? (
              <Image
                src={assets.purpose_image}
                alt="An artisan crafting a Dhyom product"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 55vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-[0.55rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.18)]">
                  Image coming soon
                </span>
              </div>
            )}
            {/* Edge softener toward text panel */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to right, transparent 70%, rgba(12,4,10,0.22) 100%)",
              }}
            />
          </div>

          {/* Text — right on desktop, below on mobile */}
          <FadeInView className="lg:w-[45%] flex flex-col justify-center px-8 py-20 lg:px-14 xl:px-20">
            <p className="font-display text-[0.60rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.55)] mb-5">
              Our Purpose
            </p>
            <h2
              className="font-display text-ivory mb-5"
              style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)", letterSpacing: "0.05em", lineHeight: 1.12 }}
            >
              Rooted in Tradition,
              <br />
              <span className="text-brass">Made with Care</span>
            </h2>
            <div className="w-8 h-px bg-[rgba(196,163,115,0.35)] mb-8" />
            <p className="font-body font-light text-[rgba(245,237,224,0.65)] text-[1.05rem] leading-[1.9] mb-5">
              We believe a home holds space for both the everyday and the sacred.
              Dhyom exists to bring intention back into that space — through
              fragrance, light, and ritual, rooted in Indian tradition and made
              with care.
            </p>
            <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-[0.95rem] leading-relaxed mb-10">
              Each piece begins with a question: does this honour the ritual
              it is made for? If the answer is yes, it belongs in our collection.
            </p>
            <div>
              <Link href="/shop">
                <Button variant="secondary" size="md">Explore the Collection</Button>
              </Link>
            </div>
          </FadeInView>

        </div>
      </section>


      {/* ══ 6. TESTIMONIALS — only if approved reviews exist ═ */}
      {reviews.length > 0 && (
        <section className="bg-damson py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <FadeInView className="text-center mb-14">
              <p className="font-display text-[0.60rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.45)] mb-4">
                Customer Stories
              </p>
              <h2
                className="font-display text-ivory"
                style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", letterSpacing: "0.05em" }}
              >
                What Our Customers Say
              </h2>
              <div className="mt-5 mx-auto w-12 h-px bg-[rgba(196,163,115,0.35)]" />
            </FadeInView>

            <CardGrid gridClassName="grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-[#2a0c1c] border border-[rgba(196,163,115,0.15)] rounded-[6px] p-7 flex flex-col gap-4 h-full"
                >
                  <Stars rating={review.rating} />
                  <p className="font-body font-light italic text-[rgba(245,237,224,0.70)] text-[0.95rem] leading-relaxed flex-1">
                    &ldquo;{review.body}&rdquo;
                  </p>
                  <p className="font-display text-[0.58rem] tracking-[0.18em] uppercase text-brass">
                    — {review.name}
                  </p>
                </div>
              ))}
            </CardGrid>
          </div>
        </section>
      )}


      {/* ══ 7. DISCOVER YOUR RITUAL — newsletter ═════════════ */}
      <FadeInView>
      <section className="bg-damson border-t border-[rgba(196,163,115,0.14)] py-24 px-6">
        <div className="max-w-xl mx-auto text-center">

          <p className="font-display text-[0.60rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.55)] mb-5">
            Sacred Rituals Begin Here
          </p>

          <h2
            className="font-display text-ivory mb-4"
            style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", letterSpacing: "0.05em" }}
          >
            Discover Your Ritual
          </h2>

          <div className="w-8 h-px bg-[rgba(196,163,115,0.35)] mx-auto mb-7" />

          <p className="font-body font-light italic text-[rgba(245,237,224,0.50)] text-base leading-relaxed mb-10">
            Join the Dhyom inner circle and receive your free Ritual Guide —
            a curated introduction to building a sacred space at home.
          </p>

          <NewsletterForm />

          <p className="font-body text-[0.72rem] text-[rgba(245,237,224,0.25)] mt-5 leading-relaxed">
            No spam. Unsubscribe at any time.
          </p>
        </div>
      </section>
      </FadeInView>

    </div>
  );
}
