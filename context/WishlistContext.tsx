"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

type WishlistCtx = {
  ids:    Set<string>;
  toggle: (productId: string) => Promise<void>;
};

const Ctx = createContext<WishlistCtx>({ ids: new Set(), toggle: async () => {} });

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());

  // Load wishlist whenever user changes
  useEffect(() => {
    if (!user) { setIds(new Set()); return; }
    supabase
      .from("wishlist")
      .select("product_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setIds(new Set((data ?? []).map((r: { product_id: string }) => r.product_id)));
      });
  }, [user]);

  const toggle = useCallback(async (productId: string) => {
    if (!user) return;
    const has = ids.has(productId);
    // Optimistic update
    setIds((prev) => {
      const next = new Set(prev);
      if (has) { next.delete(productId); } else { next.add(productId); }
      return next;
    });
    if (has) {
      await supabase.from("wishlist").delete()
        .eq("user_id", user.id).eq("product_id", productId);
    } else {
      await supabase.from("wishlist").insert({ user_id: user.id, product_id: productId });
    }
  }, [user, ids]);

  return <Ctx.Provider value={{ ids, toggle }}>{children}</Ctx.Provider>;
}

export function useWishlist() { return useContext(Ctx); }
