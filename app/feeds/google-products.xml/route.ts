import { NextResponse } from "next/server";
import { buildGoogleFeed, productPageUrl } from "@/lib/feeds/google-products";
import type { FeedProduct } from "@/lib/feeds/google-products";

const BASE_URL = "https://www.dhyom.in";

const CATEGORY_NAMES: Record<string, string> = {
  candle:             "Candles",
  idol:               "Idols",
  bracelet:           "Spiritual Bracelets",
  gift:               "Gift Sets",
  "pooja-essentials": "Pooja Essentials",
};

const SUBCATEGORY_NAMES: Record<string, string> = {
  nakshatra:          "Nakshatra Collection",
  mandala:            "Mandala Collection",
  ganesha:            "Ganesha",
  lakshmi:            "Lakshmi",
  navagraha:          "Navagraha Collection",
  diwali:             "Diwali",
  rakhi:              "Rakhi",
  chhath:             "Chhath Puja",
  "ganesh-chaturthi": "Ganesh Chaturthi",
  dussehra:           "Dussehra",
  corporate:          "Corporate Gifting",
  wedding:            "Wedding",
  birthday:           "Birthday Gifting",
  "incense-sticks":   "Incense Sticks",
  "incense-cones":    "Incense Cones",
  "ghee-batti":       "Ghee Batti",
  camphor:            "Camphor Tablets",
};

// Google Shopping taxonomy text paths
const GOOGLE_CATEGORY: Record<string, string> = {
  candle:             "Home & Garden > Decor > Candles & Home Fragrances > Candles",
  idol:               "Home & Garden > Decor > Figurines",
  bracelet:           "Apparel & Accessories > Jewelry > Bracelets",
  gift:               "Arts & Entertainment > Party & Celebration > Gift Giving > Gift Sets",
  "pooja-essentials": "Home & Garden > Decor > Candles & Home Fragrances",
};

const SUBCATEGORY_GOOGLE_CATEGORY: Record<string, string> = {
  "incense-sticks": "Home & Garden > Decor > Candles & Home Fragrances > Incense",
  "incense-cones":  "Home & Garden > Decor > Candles & Home Fragrances > Incense",
  "ghee-batti":     "Home & Garden > Decor > Candles & Home Fragrances > Candles",
  camphor:          "Home & Garden > Decor > Candles & Home Fragrances",
};

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function fmtPrice(n: number): string {
  return `${n.toFixed(2)} INR`;
}

function optimizeImage(url: string): string {
  if (url.includes("/upload/") && !url.includes("c_limit")) {
    return url.replace("/upload/", "/upload/c_limit,w_1200,q_auto:best,f_auto/");
  }
  return url;
}


function productTypePath(p: FeedProduct): string {
  const cat = CATEGORY_NAMES[p.category] ?? p.category;
  const key = p.collection ?? p.subcategory ?? "";
  const sub = SUBCATEGORY_NAMES[key] ?? key;
  return sub ? `${cat} > ${sub}` : cat;
}

function googleCategory(p: FeedProduct): string {
  const key = p.collection ?? p.subcategory ?? "";
  return SUBCATEGORY_GOOGLE_CATEGORY[key] ?? GOOGLE_CATEGORY[p.category] ?? "Home & Garden > Decor";
}

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new NextResponse("Feed unavailable: missing server credentials", { status: 503 });
  }

  const result = await buildGoogleFeed();
  if ("error" in result) {
    return new NextResponse(`Feed error: ${result.error}`, { status: 500 });
  }

  const { items } = result;
  const now = new Date().toUTCString();

  let xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n` +
    `  <channel>\n` +
    `    <title>Dhyom Product Feed</title>\n` +
    `    <link>${BASE_URL}</link>\n` +
    `    <description>Dhyom sacred home and gifting products — Google Merchant Center</description>\n` +
    `    <lastBuildDate>${now}</lastBuildDate>\n`;

  for (const p of items) {
    const title = [p.name, p.fragrance].filter(Boolean).join(" - ").slice(0, 150);

    const rawDesc = [
      p.short_description ? stripHtml(p.short_description) : null,
      p.long_description  ? stripHtml(p.long_description)  : null,
      p.description       ? stripHtml(p.description)       : null,
    ].filter(Boolean).join(" ").trim().slice(0, 5000);
    const description = rawDesc || title;

    const availability = (p.stock ?? 0) > 0 ? "in_stock" : "out_of_stock";
    const hasSale     = !!(p.mrp && p.mrp > p.price);
    const listedPrice = hasSale ? p.mrp! : p.price;

    const allImages   = [p.image_url, ...(p.image_urls ?? [])].filter(Boolean);
    const mainImage   = optimizeImage(allImages[0]);
    const extraImages = allImages.slice(1, 11).map(optimizeImage);

    const subcatKey = p.collection ?? p.subcategory ?? "";

    const lines: string[] = [
      `    <item>`,
      `      <g:id>${xmlEscape(p.id)}</g:id>`,
      `      <g:title>${xmlEscape(title)}</g:title>`,
      `      <g:description>${xmlEscape(description)}</g:description>`,
      `      <g:link>${xmlEscape(productPageUrl(p))}</g:link>`,
      `      <g:image_link>${xmlEscape(mainImage)}</g:image_link>`,
      ...extraImages.map((u) => `      <g:additional_image_link>${xmlEscape(u)}</g:additional_image_link>`),
      `      <g:availability>${availability}</g:availability>`,
      `      <g:price>${fmtPrice(listedPrice)}</g:price>`,
    ];

    if (hasSale) {
      lines.push(`      <g:sale_price>${fmtPrice(p.price)}</g:sale_price>`);
    }

    lines.push(
      `      <g:brand>Dhyom</g:brand>`,
      `      <g:condition>new</g:condition>`,
      `      <g:identifier_exists>no</g:identifier_exists>`,
      `      <g:google_product_category>${xmlEscape(googleCategory(p))}</g:google_product_category>`,
      `      <g:product_type>${xmlEscape(productTypePath(p))}</g:product_type>`,
    );

    if (p.variant_group) {
      lines.push(`      <g:item_group_id>${xmlEscape(p.variant_group)}</g:item_group_id>`);
    }
    // Fragrance is the variant dimension for candles and incense
    if (p.fragrance && (p.category === "candle" || subcatKey.includes("incense"))) {
      lines.push(`      <g:color>${xmlEscape(p.fragrance)}</g:color>`);
    }

    lines.push(`    </item>`);
    xml += lines.join("\n") + "\n";
  }

  xml += `  </channel>\n</rss>\n`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type":  "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
