import type { Metadata } from "next";
import GrahaFinderClient from "./GrahaFinderClient";

export const metadata: Metadata = {
  title: "Find Your Graha — Dhyom",
  description:
    "Discover your ruling planet and sacred stone through Vedic numerology. Enter your day of birth to reveal your Graha and the bracelet made for it.",
  openGraph: {
    title: "Find Your Graha — Dhyom",
    description:
      "Your birth day carries the energy of a ruling planet. Find yours — and the stone that resonates with it.",
    url: "https://www.dhyom.in/graha-finder",
  },
};

export default function GrahaFinderPage() {
  return (
    <div className="min-h-screen bg-black-plum">

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="bg-damson pt-28 pb-16 px-6 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(107,42,72,0.30) 0%, transparent 70%)",
          }}
        />

        <div className="max-w-2xl mx-auto relative text-center">
          <p className="font-display text-[0.54rem] tracking-[0.30em] uppercase text-[rgba(196,163,115,0.45)] mb-5">
            Vedic Numerology
          </p>

          <h1
            className="font-display text-ivory"
            style={{
              fontSize: "clamp(2rem, 6vw, 3.6rem)",
              letterSpacing: "0.07em",
              lineHeight: 1.1,
            }}
          >
            Find Your Graha
          </h1>

          <div className="mt-5 mx-auto w-8 h-px bg-[rgba(196,163,115,0.30)]" />

          <p className="mt-6 font-body font-light italic text-[rgba(245,237,224,0.50)] text-base leading-relaxed max-w-sm mx-auto">
            In Vedic numerology, every day of birth carries the energy of a ruling
            planet — your Graha. Enter your birth day to discover yours, and the stone
            that honours it.
          </p>
        </div>
      </section>

      {/* ── Brass rule ─────────────────────────────────── */}
      <div className="h-px bg-gradient-to-r from-transparent via-[rgba(196,163,115,0.18)] to-transparent" />

      {/* ── Calculator ─────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <GrahaFinderClient />
        </div>
      </section>

      {/* ── How it works ───────────────────────────────── */}
      <section className="border-t border-[rgba(196,163,115,0.08)] px-6 py-16">
        <div className="max-w-lg mx-auto text-center flex flex-col gap-5">
          <p className="font-display text-[0.54rem] tracking-[0.26em] uppercase text-[rgba(196,163,115,0.35)]">
            How It Works
          </p>
          <div className="flex flex-col gap-4 text-left">
            {[
              ["Mulank", "The sum of the digits of your birth day, reduced to a single number. 23 becomes 2+3 = 5. 29 becomes 2+9 = 11, then 1+1 = 2."],
              ["Graha", "Each Mulank (1–9) corresponds to a ruling planet in Vedic astrology — your Graha. This energy shapes how you move through the world."],
              ["Stone", "Each Graha has an associated gemstone that resonates with its frequency. Worn as a bracelet, it becomes a daily point of alignment."],
            ].map(([term, def]) => (
              <div key={term} className="flex gap-4 items-start">
                <span className="font-display text-[0.56rem] tracking-[0.2em] uppercase text-brass shrink-0 pt-[0.3rem] w-16">
                  {term}
                </span>
                <p className="font-body font-light text-[rgba(245,237,224,0.42)] text-sm leading-relaxed">
                  {def}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
