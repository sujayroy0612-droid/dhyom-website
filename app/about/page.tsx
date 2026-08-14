import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Story — Dhyom",
  description:
    "Dhyom was built to create sacred objects — fragrance, light, and devotional pieces — crafted for the modern Indian home.",
};

const radial =
  "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(107,42,72,0.30) 0%, transparent 70%)";

/* ── Reusable prose paragraph ── */
function P({
  children,
  dim = false,
}: {
  children: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <p
      className="font-body font-light leading-[1.95]"
      style={{
        fontSize: "1.05rem",
        color: dim
          ? "rgba(245,237,224,0.45)"
          : "rgba(245,237,224,0.62)",
      }}
    >
      {children}
    </p>
  );
}

/* ── Punchy standalone line ── */
function Beat({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-body font-light italic"
      style={{
        fontSize: "1.1rem",
        color: "rgba(245,237,224,0.80)",
        lineHeight: 1.75,
      }}
    >
      {children}
    </p>
  );
}

/* ── Section heading (Vision / Mission / Founder) ── */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-display text-brass"
      style={{ fontSize: "0.62rem", letterSpacing: "0.28em", textTransform: "uppercase" }}
    >
      {children}
    </h2>
  );
}

const hairline = (
  <div className="w-full h-px bg-[rgba(196,163,115,0.12)]" />
);

const shortRule = (
  <div className="w-10 h-px bg-[rgba(196,163,115,0.30)]" />
);

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black-plum">

      {/* ── Hero header ── */}
      <section className="bg-damson pt-28 pb-20 px-6 relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: radial }} />
        <div className="max-w-2xl mx-auto relative">
          <p className="font-display text-[0.58rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.50)] mb-5">
            About
          </p>
          <h1
            className="font-display text-ivory"
            style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", letterSpacing: "0.05em", lineHeight: 1.15 }}
          >
            Our Story
          </h1>
          <div className="mt-6 w-10 h-px bg-[rgba(196,163,115,0.35)]" />
        </div>
      </section>

      {/* ── Main story ── */}
      <section className="px-6 pt-20 pb-10">
        <div className="max-w-2xl mx-auto flex flex-col gap-7">

          <P>
            There is a generation of Indians building extraordinary lives.
          </P>

          <P>
            They have invested in everything that surrounds them. The home they live in. The food they eat. The clothes they wear. Every corner of their life reflects who they have become.
          </P>

          <Beat>But something has been missing.</Beat>

          <P>
            The sacred objects available to them feel like they belong in a temple shop, not in the home they have spent years building. The pooja essentials, the festival pieces, the devotional objects — mass-produced, cheap, unworthy of the spaces they are meant to sanctify. And on the other end, imported candles and fragrance that feel foreign, disconnected from who they are.
          </P>

          <Beat>The ritual was never the problem. The products were.</Beat>

          <P>
            Dhyom was built to solve this. To create sacred objects — fragrance, light, and devotional pieces, for the everyday puja corner and for the festival calendar that shapes the Indian year — Diwali, Raksha Bandhan, Ganesh Chaturthi, and beyond — that are as premium, as intentional, and as beautifully crafted as everything else in a modern Indian home.
          </P>

          <div className="flex flex-col gap-2 py-2">
            <Beat>Not religious. Not traditional in a limiting way.</Beat>
            <Beat>Sacred.</Beat>
          </div>

          <P>
            In the way that only the finest fragrance, the warmest flame, and the most carefully made objects can make a space feel. Rooted in Indian heritage. Crafted for Indian homes. Made for the life you have built.
          </P>

          <Beat>This is what it means to bring the sacred home.</Beat>

        </div>
      </section>

      {/* ── Vision ── */}
      <section className="px-6 pt-16 pb-10">
        <div className="max-w-2xl mx-auto flex flex-col gap-8">

          {hairline}

          <div className="flex flex-col gap-5 pt-2">
            <div className="flex flex-col gap-4">
              <SectionHeading>Our Vision</SectionHeading>
              {shortRule}
            </div>
            <P>
              To become the definitive sacred-lifestyle brand for the modern Indian home — where every fragrance, flame, and festival object is crafted with the same intention you&rsquo;d expect from anything else you invest in.
            </P>
          </div>

        </div>
      </section>

      {/* ── Mission ── */}
      <section className="px-6 pt-6 pb-10">
        <div className="max-w-2xl mx-auto flex flex-col gap-8">

          {hairline}

          <div className="flex flex-col gap-5 pt-2">
            <div className="flex flex-col gap-4">
              <SectionHeading>Our Mission</SectionHeading>
              {shortRule}
            </div>
            <P>
              To close the gap in Indian pooja and gifting: everything on the market was either mass-market and forgettable, or temple-shop generic. Nothing existed for someone who curates the rest of their home with care and expects the same from what sits on their altar, or what they hand someone at a festival. Dhyom exists to be that missing middle — for the everyday ritual and for the moments that mark the Indian calendar.
            </P>
          </div>

        </div>
      </section>

      {/* ── Founder quote ── */}
      <section className="px-6 pt-6 pb-24">
        <div className="max-w-2xl mx-auto flex flex-col gap-8">

          {hairline}

          <div className="flex flex-col gap-6 pt-2">
            <div className="flex flex-col gap-4">
              <SectionHeading>From the Founder</SectionHeading>
              {shortRule}
            </div>

            <blockquote className="border-l-2 border-[rgba(196,163,115,0.35)] pl-7 flex flex-col gap-5">
              <p
                className="font-body font-light italic"
                style={{ fontSize: "1.08rem", color: "rgba(245,237,224,0.68)", lineHeight: 1.95 }}
              >
                &ldquo;I wasn&rsquo;t looking to get into this space because of a personal ritual. I was looking at the home and sacred-decor category as a business problem — and I saw a gap. Everything was either mass-market at one end, or temple-shop generic at the other. Nothing in between for someone who&rsquo;s spent real money curating their home. Once I saw that gap, the decision was simple: build the brand that should already exist.&rdquo;
              </p>
              <footer
                className="font-display text-[rgba(196,163,115,0.55)]"
                style={{ fontSize: "0.56rem", letterSpacing: "0.22em", textTransform: "uppercase" }}
              >
                — Sujay, Founder, Dhyom
              </footer>
            </blockquote>
          </div>

        </div>
      </section>

    </div>
  );
}
