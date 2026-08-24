"use client";

import { MotionConfig } from "framer-motion";
import { CartProvider } from "@/lib/cart/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CartFlyProvider } from "@/context/CartFlyContext";
import AuthModal from "@/components/AuthModal";
import CartFlyOverlay from "@/components/CartFlyOverlay";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <CartFlyProvider>
              {children}
              <AuthModal />
              <CartFlyOverlay />
            </CartFlyProvider>
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
