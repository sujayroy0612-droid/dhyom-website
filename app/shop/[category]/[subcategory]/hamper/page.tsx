export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import HamperBuilder from "@/components/HamperBuilder";

interface HamperBox {
  id: string; name: string; image_url: string | null; price: number;
}

const OCCASION_NAMES: Record<string, string> = {
  diwali: "Diwali", rakhi: "Rakhi", chhath: "Chhath Puja",
  "ganesh-chaturthi": "Ganesh Chaturthi", dussehra: "Dussehra",
  corporate: "Corporate Gifting", wedding: "Wedding",
  birthday: "Birthday",
};

interface PageProps {
  params: { category: string; subcategory: string };
}

export default async function HamperBuilderPage({ params }: PageProps) {
  const { category, subcategory } = params;

  if (category !== "gift") notFound();

  const sb = createServerClient();

  const { data: catVis } = await sb
    .from("category_visibility")
    .select("is_visible")
    .eq("category", category)
    .single();
  if (catVis?.is_visible === false) notFound();

  const { data: boxRows } = await sb
    .from("hamper_boxes")
    .select("id,name,image_url,price")
    .order("name");

  const boxes = (boxRows ?? []) as HamperBox[];
  const occasionName = OCCASION_NAMES[subcategory] ?? subcategory;

  return (
    <HamperBuilder
      category={category}
      subcategory={subcategory}
      occasionName={occasionName}
      boxes={boxes}
    />
  );
}
