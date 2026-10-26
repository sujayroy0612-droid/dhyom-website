import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import { MetaPixelPageView } from "@/components/MetaPixel";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ConditionalShell from "@/components/ConditionalShell";
import Providers from "@/components/Providers";
import WhatsAppButton from "@/components/WhatsAppButton";
import AnnouncementBar from "@/components/AnnouncementBar";
import AmazonBadge from "@/components/AmazonBadge";
import { fetchSiteAssets, type SiteAssets } from "@/lib/supabase/site-assets";
import { fetchVisibleNavData } from "@/lib/supabase/visibility";
import type { NavCategory } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Dhyom — Sacred Home & Pooja Décor",
  description:
    "Premium eco-conscious Indian home and pooja décor. Curated with reverence for tradition and the earth.",
  verification: {
    google: "90Szan0CE6iqh3pkeU0Q0iEcQga_M7TsBsEzjoHTHKg",
  },
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
          <AnnouncementBar />
          <ConditionalShell><Header logoUrl={logoUrl} shopNav={shopNav} /></ConditionalShell>
          <main style={{ paddingTop: "var(--bar-height, 0px)" }}>{children}</main>
          <ConditionalShell><Footer logoUrl={logoUrl} /></ConditionalShell>
          <ConditionalShell><WhatsAppButton /></ConditionalShell>
          <ConditionalShell><AmazonBadge /></ConditionalShell>
        </Providers>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <>
            <Script
              id="meta-pixel-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${process.env.NEXT_PUBLIC_META_PIXEL_ID}');fbq('track','PageView');`,
              }}
            />
            <MetaPixelPageView />
          </>
        )}
      </body>
    </html>
  );
}
