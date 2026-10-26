"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

export function MetaPixelPageView() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [pathname]);
  return null;
}

export function MetaViewContent({ productId, price }: { productId: string; price: number }) {
  useEffect(() => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "ViewContent", {
        content_ids: [productId],
        content_type: "product",
        value: price,
        currency: "INR",
      });
    }
  }, [productId, price]);
  return null;
}
