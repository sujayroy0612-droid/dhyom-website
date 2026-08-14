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
 * Returns a filtered SHOP_NAV based on category_visibility and collection_visibility tables.
 * Fail-open: if either table is empty, returns the full unfiltered nav.
 */
export async function fetchVisibleNavData(): Promise<NavCategory[]> {
  const supabase = createServerClient();

  const [catRes, collRes] = await Promise.all([
    supabase.from("category_visibility").select("category, is_visible"),
    supabase.from("collection_visibility").select("category, subcategory, is_visible"),
  ]);

  const catRows  = catRes.data  ?? [];
  const collRows = collRes.data ?? [];

  // Fail-open: no rows means the SQL hasn't been run yet — show everything
  if (catRows.length === 0) return SHOP_NAV;

  const visibleCats = new Set(
    catRows.filter((r) => r.is_visible).map((r) => r.category as string)
  );

  // Build per-category set of visible subcategories
  const visibleSubs: Record<string, Set<string>> = {};
  for (const row of collRows) {
    if (!row.is_visible) continue;
    const cat = row.category as string;
    const sub = row.subcategory as string;
    if (!visibleSubs[cat]) visibleSubs[cat] = new Set();
    visibleSubs[cat].add(sub);
  }

  return SHOP_NAV
    .filter((cat) => visibleCats.has(cat.category))
    .map((cat) => {
      // If no collection_visibility rows exist for this category, show all its subcategories
      const subSet = visibleSubs[cat.category];
      return {
        ...cat,
        subcategories: subSet
          ? cat.subcategories.filter((sub) => subSet.has(sub.slug))
          : cat.subcategories,
      };
    });
}
