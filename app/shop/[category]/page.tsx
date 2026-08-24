import { notFound } from "next/navigation";
import Link from "next/link";
import FadeInView from "@/components/FadeInView";

/* ─── Subcategory data per category ───────────────────── */
const SUBCATEGORIES: Record<
  string,
  { slug: string; title: string; description: string }[]
> = {
  candle: [
    {
      slug: "nakshatra",
      title: "Nakshatra Collection",
      description:
        "Sandalwood, lavender, vanilla, coffee, citrus — each fragrance poured into glass. Long burn, clean presence.",
    },
    {
      slug: "mandala",
      title: "Mandala Collection",
      description:
        "The same five fragrances in a travel tin. Portable, practical, and no less considered.",
    },
  ],
  idol: [
    {
      slug: "ganesha",
      title: "Ganesha",
      description:
        "He who clears the way — for the home that makes room for new beginnings.",
    },
    {
      slug: "lakshmi",
      title: "Lakshmi",
      description:
        "Abundance arrived as presence. For the threshold of the home.",
    },
  ],
  bracelet: [
    {
      slug: "rudraksh",
      title: "Rudraksh Mala",
      description: "Traditional beads, hand-knotted for daily practice.",
    },
    {
      slug: "rose-quartz",
      title: "Rose Quartz",
      description: "A stone with a long history of being carried close. Simply strung.",
    },
  ],
  gift: [
    {
      slug: "diwali",
      title: "Diwali",
      description: "Light, fragrance, and intention — for the festival of lights.",
    },
    {
      slug: "rakhi",
      title: "Rakhi",
      description: "For the bond that does not need occasion to mean something.",
    },
    {
      slug: "chhath",
      title: "Chhath Puja",
      description: "Sacred items for the festival of the sun and the dawn it honours.",
    },
    {
      slug: "ganesh-chaturthi",
      title: "Ganesh Chaturthi",
      description: "Assembled for the arrival of Ganesha.",
    },
    {
      slug: "dussehra",
      title: "Dussehra",
      description: "For the day that marks what goodness can do.",
    },
    {
      slug: "corporate",
      title: "Corporate Gifting",
      description: "Rooted in Indian tradition. For the workplace that values meaning.",
    },
    {
      slug: "wedding",
      title: "Wedding",
      description: "For the beginning of a shared sacred life.",
    },
  ],
  "pooja-essentials": [
    {
      slug: "incense-sticks",
      title: "Incense Sticks",
      description: "Hand-rolled, slow to burn. For the daily ritual, offered without ceremony.",
    },
    {
      slug: "incense-cones",
      title: "Incense Cones",
      description: "For the corner you return to. One cone, the room entirely changed.",
    },
    {
      slug: "ghee-batti",
      title: "Ghee Batti",
      description: "Pure cow ghee in the traditional form. For the diya as it has always burned.",
    },
    {
      slug: "camphor",
      title: "Camphor Tablets",
      description: "For the aarti flame. As clean and certain as it has always been.",
    },
  ],
};

const CATEGORY_NAMES: Record<string, string> = {
  candle: "Candles",
  idol: "Idols",
  bracelet: "Spiritual Bracelets",
  gift: "Gift Sets",
  "pooja-essentials": "Pooja Essentials",
};

export function generateStaticParams() {
  return Object.keys(SUBCATEGORIES).map((category) => ({ category }));
}

interface PageProps {
  params: { category: string };
}

export default function CategoryPage({ params }: PageProps) {
  const { category } = params;
  const subcategories = SUBCATEGORIES[category];
  if (!subcategories) notFound();

  const categoryName = CATEGORY_NAMES[category];

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
        <div className="max-w-4xl mx-auto relative">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-8 flex-wrap">
            <Link
              href="/shop"
              className="font-display text-[0.54rem] tracking-[0.2em] uppercase text-[rgba(245,237,224,0.30)] hover:text-[rgba(245,237,224,0.60)] transition-colors duration-200"
            >
              Shop
            </Link>
            <span className="text-[rgba(196,163,115,0.28)] text-xs">›</span>
            <span className="font-display text-[0.54rem] tracking-[0.2em] uppercase text-brass">
              {categoryName}
            </span>
          </nav>

          <FadeInView delay={0.1}>
            <h1
              className="font-display text-ivory"
              style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "0.05em" }}
            >
              {categoryName}
            </h1>
            <div className="w-10 h-px bg-[rgba(196,163,115,0.35)] mt-5" />
          </FadeInView>
        </div>
      </section>

      {/* Subcategory tiles */}
      <section className="px-6 py-16">
        <div
          className="scroll-strip flex gap-5 overflow-x-auto pb-4 -mx-6 px-6"
          style={{ scrollbarWidth: "none" }}
        >
          {subcategories.map((sub) => (
            <Link
              key={sub.slug}
              href={`/shop/${category}/${sub.slug}`}
              className="flex-shrink-0 w-72 group bg-damson border border-[rgba(196,163,115,0.14)] rounded-[6px] flex flex-col justify-between p-8 min-h-[180px] hover:border-[rgba(196,163,115,0.50)] hover:shadow-[0_12px_40px_rgba(15,5,8,0.40)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex flex-col gap-3">
                <h2
                  className="font-display text-ivory leading-tight"
                  style={{ fontSize: "1.05rem", letterSpacing: "0.05em" }}
                >
                  {sub.title}
                </h2>
                <p className="font-body font-light italic text-[rgba(245,237,224,0.48)] text-sm leading-relaxed">
                  {sub.description}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-6 font-display text-[0.58rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.45)] group-hover:text-brass transition-colors duration-200">
                View
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M1 5h10M7 1l4 4-4 4" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
