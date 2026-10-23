export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import HamperBuilder from "@/components/HamperBuilder";

interface HamperBox {
  id: string; name: string; image_url: string | null; price: number; stock: number | null;
}

interface HamperSettings {
  min_total: number; max_total: number;
}

const OCCASION_NAMES: Record<string, string> = {
  diwali:              "Diwali",
  rakhi:               "Rakhi",
  chhath:              "Chhath Puja",
  "ganesh-chaturthi":  "Ganesh Chaturthi",
  dussehra:            "Dussehra",
  corporate:           "Corporate Gifting",
  wedding:             "Wedding",
  birthday:            "Birthday",
};

interface PageProps {
  params: { category: string; subcategory: string };
}

export default async function HamperBuilderPage({ params }: PageProps) {
  const { category, subcategory } = params;

  if (category !== "gift") notFound();

  const sb = createServerClient();

  const [catVisRes, settingsRes, boxesRes] = await Promise.all([
    sb.from("category_visibility").select("is_visible").eq("category", category).single(),
    sb.from("hamper_settings")
      .select("min_total,max_total")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single(),
    sb.from("hamper_boxes")
      .select("id,name,image_url,price,stock")
      .eq("is_active", true)
      .order("name"),
  ]);

  if (catVisRes.data?.is_visible === false) notFound();

  const settings: HamperSettings = settingsRes.data ?? { min_total: 1399, max_total: 2300 };
  const boxes = (boxesRes.data ?? []) as HamperBox[];
  const occasionName = OCCASION_NAMES[subcategory] ?? subcategory;

  return (
    <HamperBuilder
      category={category}
      subcategory={subcategory}
      occasionName={occasionName}
      boxes={boxes}
      settings={settings}
    />
  );
}
