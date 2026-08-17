import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ConditionalShell from "@/components/ConditionalShell";
import Providers from "@/components/Providers";
import WhatsAppButton from "@/components/WhatsAppButton";
import AnnouncementBar from "@/components/AnnouncementBar";
import AmazonTrustBar from "@/components/AmazonTrustBar";
import AmazonBadge from "@/components/AmazonBadge";
import { fetchSiteAssets, type SiteAssets } from "@/lib/supabase/site-assets";
import { fetchVisibleNavData } from "@/lib/supabase/visibility";
import type { NavCategory } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Dhyom — Sacred Home & Pooja Décor",
  description:
    "Premium eco-conscious Indian home and pooja décor. Curated with reverence for tradition and the earth.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [assets, shopNav] = await Promise.all([
    fetchSiteAssets().catch((): SiteAssets => ({})),
    fetchVisibleNavData().catch((): NavCategory[] => []),
  ]);
  const logoUrl = assets.logo ?? null;

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Cinzel (display) + Cormorant Garamond (body) — no Inter */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <AmazonTrustBar />
          <AnnouncementBar />
          <ConditionalShell><Header logoUrl={logoUrl} shopNav={shopNav} /></ConditionalShell>
          <main style={{ paddingTop: "var(--bar-height, 0px)" }}>{children}</main>
          <ConditionalShell><Footer logoUrl={logoUrl} /></ConditionalShell>
          <ConditionalShell><WhatsAppButton /></ConditionalShell>
          <ConditionalShell><AmazonBadge /></ConditionalShell>
        </Providers>
      </body>
    </html>
  );
}
