import { createClient } from "@supabase/supabase-js";
import type { DbProduct } from "@/lib/supabase/types";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Words that could trigger Google health-claim disapproval
const HEALTH_CLAIM_RE =
  /\b(heal|heals|healing|cure[sd]?|cures|medicin|medicinal|therap[iy]|therapeutic|remedies|remedy|treat[sm]?|treats|treatment)\b/i;

const BASE_URL = "https://www.dhyom.in";

export function productPageUrl(p: {
  category: string;
  collection?: string | null;
  subcategory?: string | null;
  slug: string | null;
}): string {
  const subcat = p.collection ?? p.subcategory ?? "";
  return `${BASE_URL}/shop/${p.category}/${subcat}/${p.slug ?? ""}`;
}

export interface FeedProduct extends DbProduct {
  // Columns fetched for the feed (subset of DbProduct)
  short_description: string | null;
  long_description: string | null;
}

export interface FeedResult {
  items: FeedProduct[];
  skipped: Array<{ id: string; name: string; reason: string }>;
  flagged: Array<{ id: string; name: string; match: string }>;
}

export async function buildGoogleFeed(): Promise<FeedResult | { error: string }> {
  const sb = adminClient();

  const { data: products, error } = await sb
    .from("products")
    .select(
      "id,slug,name,category,type,subcategory,collection,fragrance," +
      "price,mrp,stock,description,short_description,long_description," +
      "image_url,image_urls,is_visible,variant_group,variant_label"
    )
    .eq("is_visible", true)
    .order("created_at", { ascending: true });

  if (error || !products) {
    return { error: error?.message ?? "DB read error" };
  }

  const [catVisRes, collVisRes] = await Promise.all([
    sb.from("category_visibility").select("category,is_visible"),
    sb.from("collection_visibility").select("category,subcategory,is_visible"),
  ]);

  const hiddenCats = new Set(
    (catVisRes.data ?? [])
      .filter((r) => r.is_visible === false)
      .map((r) => r.category as string)
  );
  const hiddenColls = new Set(
    (collVisRes.data ?? [])
      .filter((r) => r.is_visible === false)
      .map((r) => `${r.category}::${r.subcategory}`)
  );

  const items: FeedProduct[] = [];
  const skipped: FeedResult["skipped"] = [];
  const flagged: FeedResult["flagged"] = [];

  for (const p of products as unknown as FeedProduct[]) {
    const subcatKey = p.collection ?? p.subcategory ?? "";

    if (!p.slug) {
      skipped.push({ id: p.id, name: p.name, reason: "no slug" });
      continue;
    }
    if (!p.image_url) {
      skipped.push({ id: p.id, name: p.name, reason: "no image" });
      continue;
    }
    if (hiddenCats.has(p.category)) {
      skipped.push({ id: p.id, name: p.name, reason: `category "${p.category}" hidden` });
      continue;
    }
    if (hiddenColls.has(`${p.category}::${subcatKey}`)) {
      skipped.push({ id: p.id, name: p.name, reason: `collection "${subcatKey}" hidden` });
      continue;
    }

    // Flag health claims — do not exclude, just surface to the operator
    const textToScan = [p.name, p.description, p.short_description, p.long_description]
      .filter(Boolean)
      .join(" ");
    const m = textToScan.match(HEALTH_CLAIM_RE);
    if (m) flagged.push({ id: p.id, name: p.name, match: m[0] });

    items.push(p);
  }

  return { items, skipped, flagged };
}
