"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/funnel/track";

export default function FunnelTracker({ productId }: { productId: string }) {
  useEffect(() => {
    trackEvent("product_view", productId);
  }, [productId]);
  return null;
}
