"use client";

import { MotionConfig } from "framer-motion";
import { CartProvider } from "@/lib/cart/CartContext";

// Single "use client" boundary for all providers.
// MotionConfig with reducedMotion="user" makes every motion component
// across the site automatically respect the user's OS accessibility setting.
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <CartProvider>
        {children}
      </CartProvider>
    </MotionConfig>
  );
}
