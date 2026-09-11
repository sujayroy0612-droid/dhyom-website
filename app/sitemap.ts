import { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase/server";

const BASE_URL = "https://www.dhyom.in";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient();

  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL,            lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE_URL}/shop`,  lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  // Category / subcategory listing pages
  const categoryRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/shop/candle`,                     changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/shop/candle/mandala`,             changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/shop/candle/nakshatra`,           changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/shop/pooja-essentials`,           changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/shop/pooja-essentials/incense-sticks`, changeFrequency: "weekly", priority: 0.7 },
  ];

  // Product pages — only published, visible products with a slug
  const { data: products } = await supabase
    .from("products")
    .select("slug, category, collection, subcategory, created_at")
    .eq("is_visible", true)
    .not("slug", "is", null);

  const productRoutes: MetadataRoute.Sitemap = (products ?? [])
    .filter(p => p.slug)
    .map(p => {
      const subcat = p.collection ?? p.subcategory ?? "";
      return {
        url: `${BASE_URL}/shop/${p.category}/${subcat}/${p.slug}`,
        lastModified: p.created_at ? new Date(p.created_at) : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      };
    });

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
