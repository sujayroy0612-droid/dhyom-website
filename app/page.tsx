import Link from "next/link";
import Button from "@/components/Button";

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

/* ─── Page ────────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="min-h-screen">

      {/* ══ HERO — Damson (30%) ══════════════════════════ */}
      <section className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 bg-damson">
        {/* Velvet-wine gradient depth — never solid bg */}
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
          style={{
            fontSize: "clamp(2.6rem, 6vw, 4.8rem)",
            letterSpacing: "0.05em",
            lineHeight: 1.12,
          }}
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
          <Button size="lg">Explore the Collection</Button>
          <Button variant="secondary" size="lg">Our Story</Button>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[rgba(196,163,115,0.35)]">
          <span className="font-display text-[0.55rem] tracking-[0.28em] uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-[rgba(196,163,115,0.35)] to-transparent" />
        </div>
      </section>


      {/* ══ COLLECTION — Ivory field (60%) · Damson cards (30%) ══ */}
      <section className="bg-[#F5EDE0] py-28 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Section heading */}
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

          {/* Category cards — Damson on Ivory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-damson border border-[rgba(196,163,115,0.15)] rounded-[6px] overflow-hidden group hover:border-[rgba(196,163,115,0.42)] hover:shadow-[0_12px_40px_rgba(15,5,8,0.28)] transition-all duration-300"
              >
                {/* Image placeholder */}
                <div className="aspect-[4/3] bg-[#2a0c1c] flex items-center justify-center overflow-hidden">
                  <span
                    aria-hidden="true"
                    className="font-display text-[0.55rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.22)]"
                  >
                    Image coming soon
                  </span>
                </div>

                {/* Card body */}
                <div className="p-7 flex flex-col gap-4">
                  <h3
                    className="font-display text-ivory"
                    style={{ fontSize: "1.05rem", letterSpacing: "0.05em" }}
                  >
                    {cat.title}
                  </h3>
                  <p className="font-body font-light italic text-[rgba(245,237,224,0.52)] text-base leading-relaxed">
                    {cat.description}
                  </p>
                  <Link
                    href={cat.href}
                    className="inline-flex items-center gap-2 font-display text-[0.60rem] tracking-[0.2em] uppercase text-brass hover:text-ivory transition-colors duration-200 mt-1"
                  >
                    Shop {cat.shortTitle}
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <path d="M1 5h10M7 1l4 4-4 4" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>


      {/* ══ OUR STORY — Black Plum · Om watermark ══════════ */}
      <section className="relative bg-black-plum py-32 px-6 overflow-hidden">

        {/* Om watermark — 5% opacity, dark background only */}
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

        {/* Content */}
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
