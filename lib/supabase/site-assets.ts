import { createServerClient } from "./server";

export type SiteAssets = Record<string, string | null>;

export async function fetchSiteAssets(): Promise<SiteAssets> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("site_assets")
    .select("key, image_url");
  const map: SiteAssets = {};
  for (const row of data ?? []) {
    map[row.key as string] = (row.image_url as string | null) ?? null;
  }
  return map;
}
