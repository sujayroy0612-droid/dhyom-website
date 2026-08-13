"use client";

import { useState } from "react";
import Button from "@/components/Button";
import { useCart } from "@/lib/cart/CartContext";

interface ProductActionsProps {
  productId: string;
  productName: string;
  price: number;
  inStock: boolean;
  label: string;
  imageUrl: string;
  category: string;
  subcategorySlug: string;
}

export default function ProductActions({
  productId,
  productName,
  price,
  inStock,
  label,
  imageUrl,
  category,
  subcategorySlug,
}: ProductActionsProps) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [addedState, setAddedState] = useState<"idle" | "added">("idle");

  function decrement() {
    setQty((q) => Math.max(1, q - 1));
  }
  function increment() {
    setQty((q) => Math.min(10, q + 1));
  }

  function handleAddToCart() {
    addItem({ id: productId, name: productName, price, quantity: qty, category, subcategorySlug, label, imageUrl });
    setAddedState("added");
    setTimeout(() => setAddedState("idle"), 1800);
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Quantity selector */}
      <div className="flex flex-col gap-2">
        <p className="font-display text-[0.58rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.45)]">
          Quantity
        </p>
        <div className="inline-flex items-center border border-[rgba(196,163,115,0.25)] rounded-[3px] overflow-hidden w-fit">
          <button
            type="button"
            onClick={decrement}
            disabled={qty <= 1 || !inStock}
            aria-label="Decrease quantity"
            className="w-10 h-10 flex items-center justify-center text-brass font-display text-base hover:bg-[rgba(196,163,115,0.08)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
          >
            −
          </button>
          <span
            className="w-10 h-10 flex items-center justify-center font-display text-ivory text-sm"
            style={{ letterSpacing: "0.04em" }}
          >
            {qty}
          </span>
          <button
            type="button"
            onClick={increment}
            disabled={qty >= 10 || !inStock}
            aria-label="Increase quantity"
            className="w-10 h-10 flex items-center justify-center text-brass font-display text-base hover:bg-[rgba(196,163,115,0.08)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
          >
            +
          </button>
        </div>
      </div>

      {/* Add to cart button */}
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={!inStock || addedState === "added"}
          onClick={handleAddToCart}
          className="w-full sm:w-auto"
        >
          {!inStock
            ? "Currently Unavailable"
            : addedState === "added"
            ? "Added to Cart ✓"
            : "Add to Cart"}
        </Button>

        <p
          className={[
            "font-display text-[0.56rem] tracking-[0.18em] uppercase",
            inStock ? "text-[rgba(196,163,115,0.50)]" : "text-[rgba(196,163,115,0.30)]",
          ].join(" ")}
        >
          {inStock ? "In Stock" : "Currently Unavailable"}
        </p>
      </div>

    </div>
  );
}
