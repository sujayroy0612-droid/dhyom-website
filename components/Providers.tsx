"use client";

import { MotionConfig } from "framer-motion";
import { CartProvider } from "@/lib/cart/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { WishlistProvider } from "@/context/WishlistContext";
import AuthModal from "@/components/AuthModal";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            {children}
            <AuthModal />
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
