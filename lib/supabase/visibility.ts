import { createServerClient } from "./server";
import { SHOP_NAV, type NavCategory } from "@/lib/nav";

export async function fetchVisibleCategorySlugs(): Promise<string[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("category_visibility")
    .select("category")
    .eq("is_visible", true);
  return (data ?? []).map((r) => r.category as string);
}

/**
 * Returns a filtered/trimmed SHOP_NAV where:
 * - only categories with is_visible=true in category_visibility appear
 * - within each category, only subcategories that have ≥1 visible product appear
 */
export async function fetchVisibleNavData(): Promise<NavCategory[]> {
  const supabase = createServerClient();

  const [catRes, subRes] = await Promise.all([
    supabase.from("category_visibility").select("category").eq("is_visible", true),
    supabase
      .from("products")
      .select("category, collection, subcategory")
      .eq("is_visible", true),
  ]);

  const visibleCats = new Set((catRes.data ?? []).map((r) => r.category as string));

  const visibleSubs: Record<string, Set<string>> = {};
  for (const row of subRes.data ?? []) {
    const cat = row.category as string;
    const sub = (row.collection ?? row.subcategory) as string | null;
    if (!sub) continue;
    if (!visibleSubs[cat]) visibleSubs[cat] = new Set();
    visibleSubs[cat].add(sub);
  }

  return SHOP_NAV.filter((cat) => visibleCats.has(cat.category)).map((cat) => ({
    ...cat,
    subcategories: cat.subcategories.filter(
      (sub) => visibleSubs[cat.category]?.has(sub.slug) ?? false
    ),
  }));
}
