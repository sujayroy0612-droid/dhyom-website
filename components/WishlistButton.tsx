"use client";

import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";

export default function WishlistButton({
  productId,
  className = "",
}: {
  productId: string;
  className?: string;
}) {
  const { user, openModal } = useAuth();
  const { ids, toggle } = useWishlist();
  const wishlisted = ids.has(productId);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { openModal(); return; }
    toggle(productId);
  }

  return (
    <button
      onClick={handleClick}
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={`flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(26,10,18,0.72)] backdrop-blur-sm border transition-all duration-200 ${
        wishlisted
          ? "border-[rgba(196,163,115,0.55)] text-brass hover:text-[rgba(245,237,224,0.80)]"
          : "border-[rgba(196,163,115,0.22)] text-[rgba(245,237,224,0.40)] hover:text-brass hover:border-[rgba(196,163,115,0.50)]"
      } ${className}`}
    >
      <svg width="14" height="13" viewBox="0 0 14 13" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.3">
        <path d="M7 11.5S1 7.8 1 4a3 3 0 015-2.24A3 3 0 0113 4c0 3.8-6 7.5-6 7.5z" />
      </svg>
    </button>
  );
}
