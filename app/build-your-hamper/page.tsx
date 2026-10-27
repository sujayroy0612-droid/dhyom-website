export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import StandaloneHamperBuilder from "@/components/StandaloneHamperBuilder";

export const metadata: Metadata = {
  title: "Build Your Hamper — Dhyom",
  description:
    "Curate a custom gift hamper from five categories. Every hamper comes in the signature Mandala Trunk Box.",
};

interface HamperBox {
  id: string; name: string; image_url: string | null; price: number; stock: number | null;
}
interface BuilderProduct {
  id: string; name: string; price: number; hamper_price: number | null;
  category: string; fragrance: string | null; variant_label: string | null;
  image_url: string | null; stock: number;
}

export default async function BuildHamperPage() {
  const sb = createServerClient();

  const [boxRes, productsRes] = await Promise.all([
    sb.from("hamper_boxes")
      .select("id,name,image_url,price,stock")
      .eq("is_active", true)
      .order("name")
      .limit(1)
      .single(),
    sb.from("products")
      .select("id,name,category,fragrance,variant_label,price,hamper_price,stock,image_url")
      .in("category", ["bracelet", "candle", "dhoop", "idol", "edibles", "pooja-essentials"])
      .eq("is_visible", true)
      .gt("stock", 0)
      .not("hamper_price", "is", null)
      .gt("hamper_price", 0)
      .order("category")
      .order("name"),
  ]);

  const box      = (boxRes.data ?? null) as HamperBox | null;
  const products = (productsRes.data ?? []) as BuilderProduct[];

  return <StandaloneHamperBuilder box={box} products={products} />;
}
