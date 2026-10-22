export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import HamperBuilder from "@/components/HamperBuilder";

interface HamperLevel {
  id: string; level: string; name: string; min_spend: number; sort_order: number;
}
interface HamperBox {
  id: string; name: string; image_url: string | null; price: number;
}

const OCCASION_NAMES: Record<string, string> = {
  diwali: "Diwali", rakhi: "Rakhi", chhath: "Chhath Puja",
  "ganesh-chaturthi": "Ganesh Chaturthi", dussehra: "Dussehra",
  corporate: "Corporate Gifting", wedding: "Wedding",
};

interface PageProps {
  params: { category: string; subcategory: string };
  searchParams: { level?: string };
}

export default async function HamperBuilderPage({ params, searchParams }: PageProps) {
  const { category, subcategory } = params;
  const levelSlug = searchParams.level ?? "essential";

  if (category !== "gift") notFound();

  const sb = createServerClient();

  // Check category visibility
  const { data: catVis } = await sb
    .from("category_visibility")
    .select("is_visible")
    .eq("category", category)
    .single();
  if (catVis?.is_visible === false) notFound();

  const [levelsRes, boxesRes] = await Promise.all([
    sb.from("hamper_config").select("id,level,name,min_spend,sort_order").order("sort_order"),
    sb.from("hamper_boxes").select("id,name,image_url,price").order("name"),
  ]);

  const levels = (levelsRes.data ?? []) as HamperLevel[];
  const boxes  = (boxesRes.data  ?? []) as HamperBox[];

  const selectedLevel = levels.find(l => l.level === levelSlug) ?? levels[0];
  if (!selectedLevel) notFound();

  const occasionName = OCCASION_NAMES[subcategory] ?? subcategory;

  return (
    <HamperBuilder
      category={category}
      subcategory={subcategory}
      occasionName={occasionName}
      levels={levels}
      boxes={boxes}
      initialLevel={selectedLevel}
    />
  );
}
