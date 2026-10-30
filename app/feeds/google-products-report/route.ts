import { NextResponse } from "next/server";
import { buildGoogleFeed, productPageUrl } from "@/lib/feeds/google-products";

const LINK_TIMEOUT_MS = 5000;

async function checkLink(url: string): Promise<{ url: string; status: number; ok: boolean }> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(LINK_TIMEOUT_MS),
    });
    return { url, status: res.status, ok: res.status === 200 };
  } catch {
    return { url, status: 0, ok: false };
  }
}

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 503 });
  }

  const result = await buildGoogleFeed();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const { items, skipped, flagged } = result;

  const preview = items.slice(0, 3).map((p) => ({
    id:           p.id,
    title:        [p.name, p.fragrance].filter(Boolean).join(" - ").slice(0, 150),
    link:         productPageUrl(p),
    price:        `${(p.mrp && p.mrp > p.price ? p.mrp : p.price).toFixed(2)} INR`,
    sale_price:   p.mrp && p.mrp > p.price ? `${p.price.toFixed(2)} INR` : null,
    availability: (p.stock ?? 0) > 0 ? "in_stock" : "out_of_stock",
    has_image:    !!p.image_url,
    extra_images: (p.image_urls ?? []).length,
    has_desc:     !!(p.description || p.short_description || p.long_description),
  }));

  const missingDesc = items
    .filter((p) => !p.description && !p.short_description && !p.long_description)
    .map((p) => ({ id: p.id, name: p.name }));

  // Check every product link concurrently
  const linkChecks = await Promise.all(
    items.map(async (p) => {
      const url = productPageUrl(p);
      const check = await checkLink(url);
      return {
        id:     p.id,
        title:  [p.name, p.fragrance].filter(Boolean).join(" - ").slice(0, 150),
        url,
        status: check.status,
        ok:     check.ok,
      };
    })
  );

  const failedLinks = linkChecks.filter((r) => !r.ok).map(({ id, title, url, status }) => ({ id, title, url, status }));

  return NextResponse.json({
    total_items:            items.length,
    skipped_count:          skipped.length,
    flagged_health_claims:  flagged.length,
    links_checked:          linkChecks.length,
    links_failed:           failedLinks.length,
    failed_links:           failedLinks,
    preview_first_3:        preview,
    skipped,
    flagged_products:       flagged,
    missing_description:    missingDesc,
  });
}
