export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { DbProduct } from "@/lib/supabase/types";
import FadeInView from "@/components/FadeInView";
import BraceletPageClient from "./BraceletPageClient";

export const metadata: Metadata = {
  title: "Spiritual Bracelets — Dhyom",
  description:
    "Nine sacred stones, each aligned to a ruling planet. Find yours through your Mulank — the numerology of your birth day.",
  openGraph: {
    title: "Spiritual Bracelets — Dhyom",
    description:
      "Enter the day you were born to discover your Graha and the bracelet aligned to it.",
    url: "https://www.dhyom.in/shop/bracelet",
  },
};

export default async function BraceletPage() {
  const supabase = createServerClient();

  const cols =
    "id,slug,name,type,subcategory,collection,fragrance,price,description,short_description,image_url,image_urls,category,stock,is_visible,created_at";

  const { data } = await supabase
    .from("products")
    .select(cols)
    .eq("category", "bracelet")
    .eq("subcategory", "navagraha")
    .eq("is_visible", true)
    .order("created_at", { ascending: true });

  const products = (data ?? []) as DbProduct[];

  return (
    <div className="min-h-screen bg-black-plum">

      {/* ── Header ─────────────────────────────────────── */}
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
            <span className="font-display text-[0.54rem] tracking-[0.2em] uppercase text-brass">
              Spiritual Bracelets
            </span>
          </nav>

          <FadeInView delay={0.1}>
            <h1
              className="font-display text-ivory mb-4"
              style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "0.05em" }}
            >
              Navagraha Collection
            </h1>
            <div className="w-10 h-px bg-[rgba(196,163,115,0.35)] mb-5" />
            <p className="font-body font-light italic text-[rgba(245,237,224,0.52)] text-base leading-relaxed max-w-xl">
              Nine sacred stones, each aligned to a ruling planet. Worn close to the skin,
              they carry the frequency of their Graha. Find yours below.
            </p>
          </FadeInView>
        </div>
      </section>

      {/* Brass rule */}
      <div className="h-px bg-gradient-to-r from-transparent via-[rgba(196,163,115,0.20)] to-transparent" />

      {/* ── Finder + product grid (client) ─────────────── */}
      <BraceletPageClient products={products} />

      {/* ── How it works ───────────────────────────────── */}
      <section className="border-t border-[rgba(196,163,115,0.08)] px-6 py-16">
        <div className="max-w-lg mx-auto flex flex-col gap-5">
          <p className="font-display text-[0.54rem] tracking-[0.26em] uppercase text-[rgba(196,163,115,0.35)]">
            How It Works
          </p>
          <div className="flex flex-col gap-4">
            {([
              ["Mulank", "The sum of the digits of your birth day, reduced to a single number. 23 becomes 2+3 = 5. 29 becomes 2+9 = 11, then 1+1 = 2."],
              ["Graha", "Each Mulank (1–9) corresponds to a ruling planet in Vedic astrology — your Graha. This energy shapes how you move through the world."],
              ["Stone", "Each Graha has an associated gemstone that resonates with its frequency. Worn as a bracelet, it becomes a daily point of alignment."],
            ] as [string, string][]).map(([term, def]) => (
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
