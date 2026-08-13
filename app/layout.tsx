import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/lib/cart/CartContext";
import { fetchSiteAssets, type SiteAssets } from "@/lib/supabase/site-assets";

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
  const assets: SiteAssets = await fetchSiteAssets().catch((): SiteAssets => ({}));
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
        <CartProvider>
          <Header logoUrl={logoUrl} />
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
