import Link from "next/link";
import Image from "next/image";
import Button from "@/components/Button";
import ProductCard from "@/components/ProductCard";
import NewsletterForm from "@/components/NewsletterForm";
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

/* ─── Feature strip data ──────────────────────────────── */
const features = [
  {
    title: "Flat ₹80 Shipping",
    subtitle: "On every order, always",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M1 8h14v9a1 1 0 01-1 1H2a1 1 0 01-1-1V8z" />
        <path d="M15 11h4l2 4v2h-6v-6z" />
        <circle cx="5.5" cy="18.5" r="1.5" />
        <circle cx="17.5" cy="18.5" r="1.5" />
        <path d="M1 8V5a1 1 0 011-1h12a1 1 0 011 1v3" />
      </svg>
    ),
  },
  {
    title: "No Returns on Opened Items",
    subtitle: "Please review before opening",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M11 2L3 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6L11 2z" />
        <path d="M8 11l2.5 2.5L14 8" />
      </svg>
    ),
  },
  {
    title: "Secure Razorpay Checkout",
    subtitle: "100% payment protection",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="3" y="10" width="16" height="10" rx="1.5" />
        <path d="M7 10V7a4 4 0 018 0v3" />
        <circle cx="11" cy="15" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: "COD Available",
    subtitle: "Pay when it arrives",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="2" y="6" width="18" height="12" rx="1.5" />
        <path d="M2 10h18" />
        <path d="M6 14h4" />
      </svg>
    ),
  },
  {
    title: "WhatsApp Support",
    subtitle: "We're here for you",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M11 2a9 9 0 019 9 9 9 0 01-9 9 8.95 8.95 0 01-4.5-1.2L2 20l1.2-4.5A8.95 8.95 0 012 11a9 9 0 019-9z" />
        <path d="M8 10.5c.5 2 2.5 3.5 4.5 4 .5-1 .5-1 .5-1l-1-1s-.5 0-1 .5c-.5-.5-1.5-1.5-2-2 .5-.5.5-1 .5-1L8.5 9s0 1-1 1c0 0 .3.2.5.5z" />
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

/* ─── Page ────────────────────────────────────────────── */
export default async function Home() {
  const supabase = createServerClient();
  const cols = "id,name,type,subcategory,collection,fragrance,price,description,image_url,category,stock,created_at";
  const [candleRes, idolRes, braceletRes, giftRes, poojaRes, assets] = await Promise.all([
    supabase.from("products").select(cols).eq("category", "candle").limit(2),
    supabase.from("products").select(cols).eq("category", "idol").limit(1),
    supabase.from("products").select(cols).eq("category", "bracelet").limit(1),
    supabase.from("products").select(cols).eq("category", "gift").limit(1),
    supabase.from("products").select(cols).eq("category", "pooja-essentials").limit(1),
    fetchSiteAssets().catch((): SiteAssets => ({})),
  ]);
  const featured: DbProduct[] = [
    ...(candleRes.data ?? []),
    ...(idolRes.data ?? []),
    ...(braceletRes.data ?? []),
    ...(giftRes.data ?? []),
    ...(poojaRes.data ?? []),
  ] as DbProduct[];

  return (
    <div className="min-h-screen">

      {/* ══ HERO — Damson (30%) ══════════════════════════════ */}
      <section className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 bg-damson overflow-hidden">
        {assets.hero_background && (
          <>
            <Image
              src={assets.hero_background}
              alt=""
              fill
              priority
              className="object-cover opacity-20"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-damson/60" />
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

        <p className="font-display text-[0.62rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.60)] mb-7 relative">
          Sacred · Sustainable · Indian
        </p>

        <h1
          className="font-display text-ivory relative mb-7 max-w-3xl"
          style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)", letterSpacing: "0.05em", lineHeight: 1.12 }}
        >
          Bring the Sacred
          <br />
          <span className="text-brass">Home</span>
        </h1>

        <p className="font-body font-light italic text-[rgba(245,237,224,0.58)] text-lg max-w-md mb-10 leading-relaxed relative">
          Dhyom curates premium, eco-conscious home and pooja décor rooted in
          Indian tradition — for the mindful modern home.
        </p>

        <div className="flex flex-wrap gap-4 justify-center relative">
          <Button href="/shop" size="lg">Explore the Collection</Button>
          <Button href="/about" variant="secondary" size="lg">Our Story</Button>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[rgba(196,163,115,0.35)]">
          <span className="font-display text-[0.55rem] tracking-[0.28em] uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-[rgba(196,163,115,0.35)] to-transparent" />
        </div>
      </section>


      {/* ══ CATEGORY GRID — Ivory (60%) · Damson cards (30%) ══ */}
      <section className="bg-[#F5EDE0] py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-display text-[0.60rem] tracking-[0.28em] uppercase text-[rgba(61,20,40,0.45)] mb-4">
              Our Collections
            </p>
            <h2
              className="font-display text-damson"
              style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", letterSpacing: "0.05em" }}
            >
              The Dhyom Collection
            </h2>
            <div className="mt-5 mx-auto w-12 h-px bg-[rgba(196,163,115,0.45)]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={cat.href}
                className="bg-damson border border-[rgba(196,163,115,0.15)] rounded-[6px] overflow-hidden group hover:border-[rgba(196,163,115,0.42)] hover:shadow-[0_12px_40px_rgba(15,5,8,0.28)] transition-all duration-300 flex flex-col"
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
          </div>
        </div>
      </section>


      {/* ══ FEATURE STRIP — Ink bg ══════════════════════════ */}
      <section className="bg-ink border-y border-[rgba(196,163,115,0.10)] py-0">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-5">
            {features.map((f, i) => (
              <div
                key={i}
                className={[
                  "flex flex-col items-center text-center gap-3 px-6 py-8",
                  "border-[rgba(196,163,115,0.10)]",
                  i < features.length - 1 ? "border-b lg:border-b-0 lg:border-r" : "",
                  // last item (5th) spans 2 cols on mobile so it's centred in its row
                  i === 4 ? "col-span-2 lg:col-span-1" : "",
                ].join(" ")}
              >
                <span className="text-brass opacity-70">{f.icon}</span>
                <div>
                  <p className="font-display text-[0.62rem] tracking-[0.12em] uppercase text-ivory leading-snug">
                    {f.title}
                  </p>
                  <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-xs mt-1">
                    {f.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ══ FEATURED PRODUCTS — Black Plum · Damson cards ══ */}
      <section className="bg-black-plum py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-display text-[0.60rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.45)] mb-4">
              Handpicked
            </p>
            <h2
              className="font-display text-ivory"
              style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", letterSpacing: "0.05em" }}
            >
              The Collection
            </h2>
            <div className="mt-5 mx-auto w-12 h-px bg-[rgba(196,163,115,0.35)]" />
          </div>

          {featured.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
            </div>
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


      {/* ══ SEASONAL SPOTLIGHT — Damson · split layout ══════ */}
      <section className="bg-damson py-0 overflow-hidden">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row">

          {/* Image area */}
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

          {/* Text */}
          <div className="lg:w-2/5 flex flex-col justify-center px-10 py-16 lg:py-20">
            <p className="font-display text-[0.60rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.55)] mb-5">
              Season of Light
            </p>
            <h2
              className="font-display text-ivory mb-5"
              style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)", letterSpacing: "0.05em", lineHeight: 1.12 }}
            >
              The Diwali
              <br />
              <span className="text-brass">Collection</span>
            </h2>
            <div className="w-8 h-px bg-[rgba(196,163,115,0.35)] mb-7" />
            <p className="font-body font-light italic text-[rgba(245,237,224,0.55)] text-base leading-relaxed mb-10">
              Every home deserves to greet Diwali with something sacred.
              Candles, incense, and intention — assembled for the festival
              of lights and the season of giving.
            </p>
            <div>
              <Link href="/shop/gift">
                <Button size="md">Shop the Collection</Button>
              </Link>
            </div>
          </div>

        </div>
      </section>


      {/* ══ NEWSLETTER CAPTURE — Damson ══════════════════════ */}
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


      {/* ══ OUR STORY — Black Plum · Om watermark ══════════ */}
      <section className="relative bg-black-plum py-32 px-6 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        >
          <span
            className="text-ivory"
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "clamp(18rem, 45vw, 30rem)",
              opacity: 0.05,
              lineHeight: 1,
              userSelect: "none",
            }}
          >
            ॐ
          </span>
        </div>

        <div className="relative max-w-xl mx-auto text-center">
          <p className="font-display text-[0.60rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.55)] mb-5">
            Our Story
          </p>
          <h2
            className="font-display text-ivory mb-6"
            style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", letterSpacing: "0.05em" }}
          >
            Rooted in Ritual
          </h2>
          <div className="w-10 h-px bg-[rgba(196,163,115,0.35)] mx-auto mb-10" />
          <p className="font-body font-light text-[rgba(245,237,224,0.68)] text-lg leading-[1.95] mb-6">
            Dhyom was born from a simple belief — that the rituals we inherit
            deserve the finest materials the earth can offer. Every piece in
            our collection is crafted by skilled artisans using sustainable,
            ethically sourced materials, honouring both the sacred traditions
            of India and the world we share.
          </p>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.40)] text-base leading-relaxed mb-12">
            We exist so that your home may hold a little more intention,
            a little more stillness.
          </p>
          <Button variant="secondary" size="md">Read Our Story</Button>
        </div>
      </section>

    </div>
  );
}
