"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useCart, CartItem } from "@/lib/cart/CartContext";
import { supabase } from "@/lib/supabase/client";

const SHIPPING = 80;

interface BumpProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string;
  subcategory: string | null;
  collection: string | null;
  type: string;
  fragrance: string | null;
}

/* ─── Coupon ──────────────────────────────────────────── */
interface CouponMeta { code: string; type: "percentage" | "fixed"; value: number; }
type CouponState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "applied"; meta: CouponMeta }
  | { status: "error"; message: string };

function calcDiscount(meta: CouponMeta, subtotal: number): number {
  if (meta.type === "percentage") return Math.round((subtotal * meta.value) / 100);
  return Math.min(meta.value, subtotal);
}

/* ─── Cart item row ───────────────────────────────────── */
function CartRow({ item, onQtyChange, onRemove }: {
  item: CartItem; onQtyChange: (q: number) => void; onRemove: () => void;
}) {
  return (
    <div className="flex gap-5 py-6">
      <div className="w-20 h-20 flex-shrink-0 bg-[#270b1b] rounded-[4px] border border-[rgba(196,163,115,0.12)] flex items-center justify-center overflow-hidden relative">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="80px" />
        ) : (
          <span className="font-display text-[0.36rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.18)]">DHYOM</span>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          {item.label && (
            <p className="font-display text-[0.52rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.42)] mb-1 truncate">{item.label}</p>
          )}
          <p className="font-display text-ivory leading-tight truncate" style={{ fontSize: "0.9rem", letterSpacing: "0.04em" }}>{item.name}</p>
          <p className="font-body font-light text-[rgba(245,237,224,0.35)] text-sm mt-1">₹{item.price.toLocaleString("en-IN")} each</p>
        </div>
        <div className="flex items-center gap-4 sm:gap-5 flex-shrink-0">
          <div className="inline-flex items-center border border-[rgba(196,163,115,0.22)] rounded-[3px] overflow-hidden">
            <button type="button" onClick={() => onQtyChange(item.quantity - 1)} disabled={item.quantity <= 1} aria-label="Decrease quantity" className="w-9 h-9 flex items-center justify-center text-brass font-display text-base hover:bg-[rgba(196,163,115,0.06)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline-none">−</button>
            <span className="w-9 h-9 flex items-center justify-center font-display text-ivory text-sm select-none" style={{ letterSpacing: "0.04em" }}>{item.quantity}</span>
            <button type="button" onClick={() => onQtyChange(item.quantity + 1)} disabled={item.quantity >= 10} aria-label="Increase quantity" className="w-9 h-9 flex items-center justify-center text-brass font-display text-base hover:bg-[rgba(196,163,115,0.06)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:outline-none">+</button>
          </div>
          <span className="font-display text-brass w-[72px] text-right flex-shrink-0" style={{ fontSize: "0.92rem", letterSpacing: "0.04em" }}>₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
          <button type="button" onClick={onRemove} aria-label={`Remove ${item.name}`} className="text-[rgba(196,163,115,0.28)] hover:text-brass transition-colors duration-150 p-1 flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M1.5 1.5l10 10M11.5 1.5l-10 10" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────── */
export default function CartPage() {
  const router = useRouter();
  const { items, subtotal, totalItems, removeItem, setQuantity, addItem } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponState>({ status: "idle" });
  const [bumpProduct, setBumpProduct] = useState<BumpProduct | null>(null);
  const [bumpChecked, setBumpChecked] = useState(false);

  /* ── Fetch bump product via server API (bypasses RLS) ── */
  useEffect(() => {
    setBumpChecked(false);
    if (items.length === 0) { setBumpProduct(null); return; }
    const primaryCat = items[0]?.category;
    if (!primaryCat) { setBumpProduct(null); return; }

    fetch(`/api/funnel-bump?category=${encodeURIComponent(primaryCat)}`)
      .then((r) => r.json())
      .then(({ product }) => setBumpProduct(product ?? null))
      .catch(() => setBumpProduct(null));
  }, [items]);

  const couponMeta = coupon.status === "applied" ? coupon.meta : null;
  const discount   = couponMeta ? calcDiscount(couponMeta, subtotal) : 0;
  const bumpExtra  = bumpChecked && bumpProduct ? bumpProduct.price : 0;
  const total      = subtotal - discount + SHIPPING + bumpExtra;

  /* ── Proceed to checkout ── */
  function handleCheckout() {
    if (bumpChecked && bumpProduct) {
      addItem({
        id: bumpProduct.id,
        name: bumpProduct.name,
        price: bumpProduct.price,
        quantity: 1,
        category: bumpProduct.category,
        subcategorySlug: bumpProduct.subcategory ?? bumpProduct.collection ?? "",
        label: bumpProduct.fragrance
          ? `${bumpProduct.type.charAt(0).toUpperCase() + bumpProduct.type.slice(1)} · ${bumpProduct.fragrance}`
          : bumpProduct.type.charAt(0).toUpperCase() + bumpProduct.type.slice(1),
        imageUrl: bumpProduct.image_url ?? "",
      });
    }
    router.push("/checkout");
  }

  async function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCoupon({ status: "loading" });
    try {
      const { data, error } = await supabase.from("coupons").select("*").eq("code", code).eq("active", true).single();
      if (error || !data) { setCoupon({ status: "error", message: "This code is not valid." }); return; }
      const now = new Date();
      if (data.valid_from && new Date(data.valid_from) > now) { setCoupon({ status: "error", message: "This code is not yet active." }); return; }
      if (data.valid_until && new Date(data.valid_until) < now) { setCoupon({ status: "error", message: "This code has expired." }); return; }
      if (data.usage_limit !== null && data.times_used >= data.usage_limit) { setCoupon({ status: "error", message: "This code has reached its usage limit." }); return; }
      setCoupon({ status: "applied", meta: { code: data.code, type: data.discount_type as "percentage" | "fixed", value: Number(data.discount_value) } });
    } catch {
      setCoupon({ status: "error", message: "Something went wrong. Please try again." });
    }
  }

  function handleRemoveCoupon() { setCoupon({ status: "idle" }); setCouponInput(""); }

  /* ── Empty state ── */
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-black-plum flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-sm flex flex-col items-center gap-10">
          <div className="w-16 h-16 rounded-full border border-[rgba(196,163,115,0.18)] flex items-center justify-center">
            <svg width="22" height="26" viewBox="0 0 22 26" fill="none" stroke="rgba(196,163,115,0.35)" strokeWidth="1.2">
              <path d="M3 7h16l-2 16H5L3 7z" /><path d="M8 7V5a3 3 0 016 0v2" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-5">
            <p className="font-display text-[0.56rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.38)]">Your Cart</p>
            <h1 className="font-display text-ivory" style={{ fontSize: "clamp(1.5rem, 3vw, 2.1rem)", letterSpacing: "0.05em" }}>Your collection is empty</h1>
            <div className="w-8 h-px bg-[rgba(196,163,115,0.22)]" />
            <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-[0.95rem] leading-[1.85]">Each piece in our collection carries intention and care.</p>
          </div>
          <Link href="/shop" className="inline-flex items-center gap-3 font-display text-[0.6rem] tracking-[0.22em] uppercase text-brass hover:text-ivory border border-[rgba(196,163,115,0.30)] hover:border-[rgba(245,237,224,0.38)] px-8 py-3.5 rounded-[3px] transition-all duration-200 active:scale-[0.98]">
            Browse the Collection
          </Link>
        </div>
      </div>
    );
  }

  /* ── Filled cart ── */
  return (
    <div className="min-h-screen bg-black-plum">
      <div className="pt-24 pb-20 max-w-6xl mx-auto px-6">

        <div className="mb-10 lg:mb-12">
          <p className="font-display text-[0.56rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.38)] mb-3">Your Selection</p>
          <h1 className="font-display text-ivory" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", letterSpacing: "0.05em" }}>Your Cart</h1>
          <div className="mt-4 w-10 h-px bg-[rgba(196,163,115,0.22)]" />
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">

          {/* ── Left: items ── */}
          <div className="flex-1 min-w-0">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                  transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                  className="border-b border-[rgba(196,163,115,0.10)] last:border-b-0"
                >
                  <CartRow item={item} onQtyChange={(q) => setQuantity(item.id, q)} onRemove={() => removeItem(item.id)} />
                </motion.div>
              ))}
            </AnimatePresence>
            <p className="mt-5 font-display text-[0.52rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.28)]">
              {totalItems} {totalItems === 1 ? "item" : "items"} in your cart
            </p>
          </div>

          {/* ── Right: summary ── */}
          <div className="w-full lg:w-[340px] xl:w-[370px] flex-shrink-0 lg:sticky lg:top-24">
            <div className="bg-damson border border-[rgba(196,163,115,0.14)] rounded-[6px] overflow-hidden">

              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-[rgba(196,163,115,0.10)]">
                <h2 className="font-display text-ivory" style={{ fontSize: "0.82rem", letterSpacing: "0.1em" }}>Order Summary</h2>
              </div>

              <div className="px-6 pt-5 pb-4 flex flex-col gap-4">

                <div className="flex justify-between items-baseline">
                  <span className="font-body font-light text-[rgba(245,237,224,0.52)] text-[0.9rem]">Subtotal</span>
                  <span className="font-display text-ivory" style={{ fontSize: "0.9rem", letterSpacing: "0.04em" }}>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>

                {/* Coupon input */}
                <div className="flex flex-col gap-2">
                  {coupon.status !== "applied" ? (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text" value={couponInput}
                          onChange={(e) => { setCouponInput(e.target.value); if (coupon.status === "error") setCoupon({ status: "idle" }); }}
                          onKeyDown={(e) => { if (e.key === "Enter") handleApplyCoupon(); }}
                          placeholder="Coupon code"
                          className="flex-1 min-w-0 bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.20)] rounded-[3px] px-3 py-2 font-display text-ivory text-[0.68rem] tracking-[0.1em] uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-[rgba(245,237,224,0.22)] placeholder:font-body focus:outline-none focus:border-[rgba(196,163,115,0.45)] transition-colors duration-150"
                        />
                        <button type="button" onClick={handleApplyCoupon} disabled={coupon.status === "loading" || !couponInput.trim()} className="px-4 font-display text-[0.58rem] tracking-[0.18em] uppercase text-brass border border-[rgba(196,163,115,0.28)] rounded-[3px] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.50)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 focus-visible:outline-none whitespace-nowrap">
                          {coupon.status === "loading" ? "···" : "Apply"}
                        </button>
                      </div>
                      {coupon.status === "error" && (
                        <p className="font-body font-light text-[rgba(220,80,80,0.75)] text-[0.78rem]">{coupon.message}</p>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between bg-[rgba(196,163,115,0.06)] border border-[rgba(196,163,115,0.16)] rounded-[3px] px-3 py-2.5">
                      <div>
                        <p className="font-display text-[0.5rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.50)] mb-0.5">Code applied</p>
                        <p className="font-display text-brass" style={{ fontSize: "0.7rem", letterSpacing: "0.06em" }}>
                          {coupon.meta.code}
                          <span className="text-[rgba(196,163,115,0.50)] ml-2">{coupon.meta.type === "percentage" ? `−${coupon.meta.value}%` : `−₹${coupon.meta.value}`}</span>
                        </p>
                      </div>
                      <button type="button" onClick={handleRemoveCoupon} aria-label="Remove coupon" className="text-[rgba(196,163,115,0.32)] hover:text-brass transition-colors duration-150 p-1 ml-2 flex-shrink-0">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M1 1l8 8M9 1L1 9" /></svg>
                      </button>
                    </div>
                  )}
                </div>

                {coupon.status === "applied" && discount > 0 && (
                  <div className="flex justify-between items-baseline">
                    <span className="font-body font-light text-[rgba(245,237,224,0.45)] text-[0.9rem]">Discount</span>
                    <span className="font-display text-[rgba(110,195,130,0.80)]" style={{ fontSize: "0.9rem", letterSpacing: "0.04em" }}>−₹{discount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                {bumpChecked && bumpProduct && (
                  <div className="flex justify-between items-baseline">
                    <span className="font-body font-light text-[rgba(245,237,224,0.52)] text-[0.9rem] truncate mr-2">{bumpProduct.name}</span>
                    <span className="font-display text-ivory flex-shrink-0" style={{ fontSize: "0.9rem", letterSpacing: "0.04em" }}>₹{bumpProduct.price.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline">
                  <span className="font-body font-light text-[rgba(245,237,224,0.52)] text-[0.9rem]">Shipping</span>
                  <span className="font-display text-ivory" style={{ fontSize: "0.9rem", letterSpacing: "0.04em" }}>₹{SHIPPING.toLocaleString("en-IN")}</span>
                </div>

                <div className="h-px bg-[rgba(196,163,115,0.14)]" />

                <div className="flex justify-between items-baseline">
                  <span className="font-display text-ivory" style={{ fontSize: "0.88rem", letterSpacing: "0.08em" }}>Total</span>
                  <span className="font-display text-brass" style={{ fontSize: "1.15rem", letterSpacing: "0.04em" }}>₹{total.toLocaleString("en-IN")}</span>
                </div>

              </div>

              {/* ── Order Bump ── */}
              {bumpProduct && (
                <div className="border-t border-[rgba(196,163,115,0.18)] px-6 py-5 bg-[rgba(196,163,115,0.04)]">
                  <p className="font-display text-[0.52rem] tracking-[0.2em] uppercase text-brass mb-4">Complete the Ritual</p>
                  <div className="flex gap-3 items-center mb-3">
                    <div className="w-12 h-12 flex-shrink-0 bg-[#270b1b] rounded-[3px] border border-[rgba(196,163,115,0.12)] overflow-hidden relative">
                      {bumpProduct.image_url ? (
                        <Image src={bumpProduct.image_url} alt={bumpProduct.name} fill className="object-cover" sizes="48px" />
                      ) : (
                        <span className="font-display text-[0.26rem] tracking-[0.1em] uppercase text-[rgba(196,163,115,0.18)] absolute inset-0 flex items-center justify-center">D</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-ivory leading-tight" style={{ fontSize: "0.82rem", letterSpacing: "0.04em" }}>{bumpProduct.name}</p>
                      <p className="font-display text-brass mt-0.5" style={{ fontSize: "0.72rem", letterSpacing: "0.04em" }}>₹{bumpProduct.price.toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                  <p className="font-body font-light italic text-[rgba(245,237,224,0.35)] text-[0.78rem] mb-3 leading-relaxed">
                    A small addition, in the spirit of the ritual.
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={bumpChecked} onChange={(e) => setBumpChecked(e.target.checked)} className="sr-only" />
                    <div aria-hidden="true" className={["w-4 h-4 rounded-[2px] border flex-shrink-0 flex items-center justify-center transition-all duration-150", bumpChecked ? "bg-brass border-brass" : "border-[rgba(196,163,115,0.28)] group-hover:border-[rgba(196,163,115,0.55)]"].join(" ")}>
                      {bumpChecked && <svg width="8" height="6" viewBox="0 0 8 6" fill="none" stroke="#12060e" strokeWidth="1.5"><path d="M1 3l2 2 4-4" /></svg>}
                    </div>
                    <span className="font-display text-[0.58rem] tracking-[0.14em] uppercase text-[rgba(245,237,224,0.55)] group-hover:text-ivory transition-colors duration-150">
                      Add to my order
                    </span>
                  </label>
                </div>
              )}

              {/* Checkout CTA */}
              <div className="px-6 pb-6 pt-4">
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="w-full flex items-center justify-center gap-2.5 font-display text-[0.65rem] tracking-[0.22em] uppercase text-brass border border-[rgba(196,163,115,0.35)] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.55)] rounded-[3px] py-3.5 transition-all duration-200 active:scale-[0.98]"
                >
                  Proceed to Checkout
                  <svg width="13" height="10" viewBox="0 0 13 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 5h11M7.5 1l4 4-4 4" /></svg>
                </button>
                <p className="mt-4 text-center font-body font-light italic text-[rgba(245,237,224,0.26)] text-[0.78rem]">
                  Handcrafted with care. Delivered with reverence.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
