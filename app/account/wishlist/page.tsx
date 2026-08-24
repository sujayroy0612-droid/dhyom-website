"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/lib/cart/CartContext";

type WishlistProduct = {
  id: string; name: string; price: number; image_url?: string;
  category: string; subcategory?: string; collection?: string; type: string;
};

export default function WishlistPage() {
  const { user } = useAuth();
  const { ids, toggle } = useWishlist();
  const { addItem } = useCart();
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user || ids.size === 0) { setProducts([]); setLoading(false); return; }
    supabase
      .from("products")
      .select("id,name,price,image_url,category,subcategory,collection,type")
      .in("id", Array.from(ids))
      .then(({ data }) => { setProducts((data ?? []) as WishlistProduct[]); setLoading(false); });
  }, [user, ids]);

  if (loading) return <p className="font-body font-light text-[rgba(245,237,224,0.38)] text-[0.95rem]">Loading…</p>;

  if (ids.size === 0) {
    return (
      <div className="py-12 flex flex-col items-start gap-4">
        <p className="font-display text-[0.62rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.38)]">Wishlist is empty</p>
        <p className="font-body font-light italic text-[rgba(245,237,224,0.42)] text-[0.95rem] leading-[1.85]">
          Tap the heart on any product to save it here.
        </p>
        <Link href="/shop" className="mt-2 font-display text-[0.60rem] tracking-[0.20em] uppercase text-brass border border-[rgba(196,163,115,0.35)] rounded-full px-7 py-2.5 hover:bg-[rgba(196,163,115,0.07)] transition-all duration-200">
          Explore Shop
        </Link>
      </div>
    );
  }

  function subcatSlug(p: WishlistProduct) { return p.collection ?? p.subcategory ?? p.type; }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {products.map((p) => (
        <div key={p.id} className="bg-damson border border-[rgba(196,163,115,0.13)] rounded-[6px] overflow-hidden flex flex-col">
          <Link href={`/shop/${p.category}/${subcatSlug(p)}/${p.id}`} className="block aspect-video relative bg-[#270b1b]">
            {p.image_url ? (
              <Image src={p.image_url} alt={p.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center font-display text-[0.50rem] tracking-[0.20em] uppercase text-[rgba(196,163,115,0.18)]">No image</span>
            )}
          </Link>
          <div className="p-4 flex flex-col gap-3 flex-1">
            <div>
              <p className="font-display text-ivory text-[0.88rem]">{p.name}</p>
              <p className="font-display text-brass text-[0.95rem] mt-1">₹{p.price.toLocaleString("en-IN")}</p>
            </div>
            <div className="flex items-center gap-2 mt-auto">
              <button
                onClick={() => addItem({ id: p.id, name: p.name, price: p.price, imageUrl: p.image_url ?? "", category: p.category, subcategorySlug: subcatSlug(p), label: p.type, quantity: 1 })}
                className="flex-1 font-display text-[0.55rem] tracking-[0.18em] uppercase text-brass border border-[rgba(196,163,115,0.35)] rounded-[3px] py-2.5 hover:bg-[rgba(196,163,115,0.07)] transition-all duration-200 text-center"
              >
                Add to Cart
              </button>
              <button
                onClick={() => toggle(p.id)}
                aria-label="Remove from wishlist"
                className="p-2.5 text-[rgba(210,80,80,0.50)] hover:text-[rgba(210,80,80,0.80)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <line x1="3" y1="3" x2="13" y2="13" /><line x1="13" y1="3" x2="3" y2="13" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
