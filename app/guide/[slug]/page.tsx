import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { fetchSiteAssets } from "@/lib/supabase/site-assets";
import GuideForm from "./GuideForm";

export const dynamic = "force-dynamic";

type Campaign = {
  id: string;
  slug: string;
  title: string;
  headline: string;
  subheadline: string | null;
  body_copy: string | null;
};

async function fetchCampaign(slug: string): Promise<Campaign | null> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await sb
    .from("campaigns")
    .select("id, slug, title, headline, subheadline, body_copy")
    .eq("slug", slug)
    .eq("active", true)
    .single();
  return data ?? null;
}

// Split headline on | for two-tone: "First Part|Second Part" → ivory + brass
function renderHeadline(headline: string) {
  const parts = headline.split("|");
  if (parts.length === 2) {
    return (
      <>
        <span className="text-ivory">{parts[0].trim()}</span>
        <br />
        <span className="text-brass">{parts[1].trim()}</span>
      </>
    );
  }
  return <span className="text-ivory">{headline}</span>;
}

export default async function GuidePage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const [campaign, assets] = await Promise.all([
    fetchCampaign(slug).catch(() => null),
    fetchSiteAssets().catch(() => ({})),
  ]);

  const logoUrl = (assets as Record<string, string | undefined>).logo ?? null;

  // ── Not found / inactive ──────────────────────────────────────────────────
  if (!campaign) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(to bottom, #3D1428 0%, #0F0508 100%)" }}
      >
        <div className="relative w-full max-w-lg mx-auto flex flex-col items-center text-center gap-6">
          {logoUrl ? (
            <Image src={logoUrl} alt="Dhyom" width={240} height={96} className="h-24 w-auto object-contain" priority />
          ) : (
            <p className="font-display text-brass" style={{ fontSize: "0.62rem", letterSpacing: "0.35em", textTransform: "uppercase" }}>
              Dhyom
            </p>
          )}
          <div style={{ width: "44px", height: "1px", background: "rgba(196,163,115,0.35)" }} />
          <p className="font-body font-light italic text-[rgba(245,237,224,0.45)] text-base leading-[1.8]">
            This guide is no longer available.
          </p>
          <Link
            href="/"
            className="font-display text-[rgba(196,163,115,0.55)] hover:text-brass transition-colors duration-200"
            style={{ fontSize: "0.55rem", letterSpacing: "0.22em", textTransform: "uppercase" }}
          >
            Return to Dhyom
          </Link>
        </div>
      </div>
    );
  }

  // ── Active campaign ───────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden"
      style={{ background: "linear-gradient(to bottom, #3D1428 0%, #0F0508 100%)" }}
    >
      {/* Brass radial glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 38% at 50% 0%, rgba(196,163,115,0.09) 0%, transparent 70%)",
        }}
      />

      {/* Minimal nav */}
      <nav className="absolute top-0 left-0 right-0 flex items-center justify-center gap-10 px-8 py-6">
        <Link
          href="/"
          className="font-display text-[rgba(196,163,115,0.55)] hover:text-brass transition-colors duration-200"
          style={{ fontSize: "0.55rem", letterSpacing: "0.22em", textTransform: "uppercase" }}
        >
          Home
        </Link>
        <Link
          href="/shop"
          className="font-display text-[rgba(196,163,115,0.55)] hover:text-brass transition-colors duration-200"
          style={{ fontSize: "0.55rem", letterSpacing: "0.22em", textTransform: "uppercase" }}
        >
          Shop
        </Link>
      </nav>

      <div className="relative w-full max-w-lg mx-auto flex flex-col items-center text-center gap-7">

        {/* Logo */}
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="Dhyom"
            width={240}
            height={96}
            className="h-24 w-auto object-contain"
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
        {campaign.subheadline && (
          <p
            className="font-display text-[rgba(196,163,115,0.50)]"
            style={{ fontSize: "0.56rem", letterSpacing: "0.28em", textTransform: "uppercase" }}
          >
            {campaign.subheadline}
          </p>
        )}

        {/* Headline — split on | for two-tone */}
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(1.7rem, 5vw, 2.6rem)",
            letterSpacing: "0.05em",
            lineHeight: 1.12,
            fontWeight: 400,
          }}
        >
          {renderHeadline(campaign.headline)}
        </h1>

        {/* Brass divider */}
        <div style={{ width: "44px", height: "1px", background: "rgba(196,163,115,0.45)" }} />

        {/* Body copy */}
        {campaign.body_copy && (
          <p className="font-body font-light italic text-[rgba(245,237,224,0.52)] text-base leading-[1.8] max-w-sm">
            {campaign.body_copy}
          </p>
        )}

        {/* Form */}
        <GuideForm slug={slug} />

        {/* Reassurance */}
        <p className="font-body text-[0.72rem] text-[rgba(245,237,224,0.20)] leading-relaxed">
          No spam. Unsubscribe anytime.
        </p>

      </div>
    </div>
  );
}
