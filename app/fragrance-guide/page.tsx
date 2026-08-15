import Image from "next/image";
import { fetchSiteAssets } from "@/lib/supabase/site-assets";
import FragranceForm from "./FragranceForm";

export const dynamic = "force-dynamic";

export default async function FragranceGuidePage() {
  const assets = await fetchSiteAssets().catch(() => ({}));
  const logoUrl = (assets as Record<string, string | undefined>).logo ?? null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden"
      style={{ background: "linear-gradient(to bottom, #3D1428 0%, #0F0508 100%)" }}
    >
      {/* Brass radial glow at top */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 38% at 50% 0%, rgba(196,163,115,0.09) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-lg mx-auto flex flex-col items-center text-center gap-7">

        {/* Logo */}
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="Dhyom"
            width={110}
            height={44}
            className="h-9 w-auto object-contain"
            priority
          />
        ) : (
          <p
            className="font-display text-brass"
            style={{ fontSize: "0.62rem", letterSpacing: "0.35em", textTransform: "uppercase" }}
          >
            Dhyom
          </p>
        )}

        {/* Eyebrow */}
        <p
          className="font-display text-[rgba(196,163,115,0.50)]"
          style={{ fontSize: "0.56rem", letterSpacing: "0.28em", textTransform: "uppercase" }}
        >
          The Fragrance Personalities
        </p>

        {/* Headline */}
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(1.7rem, 5vw, 2.6rem)",
            letterSpacing: "0.05em",
            lineHeight: 1.12,
            fontWeight: 400,
          }}
        >
          <span className="text-ivory">What Your Fragrance</span>
          <br />
          <span className="text-brass">Says About You</span>
        </h1>

        {/* 44 px brass divider */}
        <div style={{ width: "44px", height: "1px", background: "rgba(196,163,115,0.45)" }} />

        {/* Sub-line */}
        <p className="font-body font-light italic text-[rgba(245,237,224,0.52)] text-base leading-[1.8] max-w-sm">
          The scent you reach for is never an accident. Discover the personality behind each
          Dhyom fragrance — and find yours.
        </p>

        {/* Client form */}
        <FragranceForm />

        {/* Reassurance */}
        <p className="font-body text-[0.72rem] text-[rgba(245,237,224,0.20)] leading-relaxed">
          No spam. Unsubscribe anytime.
        </p>

      </div>
    </div>
  );
}
