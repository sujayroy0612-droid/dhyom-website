"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useCart, type CartItem } from "@/lib/cart/CartContext";

interface HamperBox { id: string; name: string; image_url: string | null; price: number; stock: number | null; }
interface BuilderProduct {
  id: string; name: string; price: number; hamper_price: number | null;
  category: string; fragrance: string | null; variant_label: string | null;
  image_url: string | null; stock: number;
}
interface HamperSettings { min_total: number; max_total: number; }

interface Props {
  category:     string;
  subcategory:  string;
  occasionName: string;
  boxes:        HamperBox[];
  settings:     HamperSettings;
}

const CATEGORY_LABELS: Record<string, string> = {
  candle: "Candles", idol: "Idols", bracelet: "Bracelets",
  "pooja-essentials": "Pooja Essentials",
};

function hamperPrice(p: BuilderProduct): number {
  return p.hamper_price ?? p.price;
}

export default function HamperBuilder({ category, subcategory, occasionName, boxes, settings }: Props) {
  const router = useRouter();
  const { addItems } = useCart();

  const MIN_SPEND = settings.min_total;
  const MAX_SPEND = settings.max_total;

  const [selectedBox,  setSelectedBox]  = useState<HamperBox | null>(null);
  const [products,     setProducts]     = useState<BuilderProduct[]>([]);
  const [loadingProds, setLoadingProds] = useState(true);
  const [catFilter,    setCatFilter]    = useState<string | null>(null);
  const [chosen,       setChosen]       = useState<Map<string, number>>(new Map());
  const [giftMessage,  setGiftMessage]  = useState("");
  const [hidePrices,   setHidePrices]   = useState(false);
  const [adding,       setAdding]       = useState(false);

  useEffect(() => {
    setLoadingProds(true);
    fetch("/api/hampers/products?categories=candle,idol,bracelet,pooja-essentials")
      .then(r => r.json())
      .then((d: { products?: BuilderProduct[] }) => {
        setProducts(d.products ?? []);
        setLoadingProds(false);
      })
      .catch(() => setLoadingProds(false));
  }, []);

  const productTotal = Array.from(chosen.entries()).reduce((sum, [id, qty]) => {
    const p = products.find(pr => pr.id === id);
    return sum + hamperPrice(p!) * qty;
  }, 0);
  const boxPrice     = selectedBox?.price ?? 0;
  const runningTotal = productTotal + boxPrice;
  const progress     = Math.min(100, Math.round((runningTotal / MIN_SPEND) * 100));
  const remaining    = Math.max(0, MIN_SPEND - runningTotal);
  const canAdd       = !!selectedBox && runningTotal >= MIN_SPEND;
  const budgetFull   = runningTotal >= MAX_SPEND + 50;

  const categories = Array.from(new Set(products.map(p => p.category)));
  const visibleProducts = catFilter ? products.filter(p => p.category === catFilter) : [];

  function setQty(productId: string, delta: number) {
    setChosen(prev => {
      const next = new Map(prev);
      const current = next.get(productId) ?? 0;
      const newQty = Math.max(0, Math.min(current + delta, 10));
      if (newQty === 0) next.delete(productId); else next.set(productId, newQty);
      return next;
    });
  }

  const handleAddToCart = useCallback(() => {
    if (!canAdd || !selectedBox) return;
    setAdding(true);

    const groupId   = crypto.randomUUID();
    const groupName = `${occasionName} Hamper`;

    const cartItems: CartItem[] = [];

    cartItems.push({
      kind:            "product",
      id:              selectedBox.id,
      cartItemId:      crypto.randomUUID(),
      name:            selectedBox.name,
      price:           selectedBox.price,
      quantity:        1,
      category:        "gift",
      subcategorySlug: subcategory,
      label:           "",
      imageUrl:        selectedBox.image_url ?? "",
      hamperGroupId:   groupId,
      hamperGroup:     groupName,
      isHamperBox:     true,
      giftMessage:     giftMessage.trim() || undefined,
      hidePrices:      hidePrices || undefined,
    });

    for (const [productId, qty] of Array.from(chosen.entries())) {
      const p = products.find(pr => pr.id === productId);
      if (!p) continue;
      const label = [p.fragrance, p.variant_label].filter(Boolean).join(" · ");
      cartItems.push({
        kind:            "product",
        id:              p.id,
        cartItemId:      crypto.randomUUID(),
        name:            p.name,
        price:           hamperPrice(p),
        quantity:        qty,
        category:        p.category,
        subcategorySlug: subcategory,
        label,
        imageUrl:        p.image_url ?? "",
        hamperGroupId:   groupId,
        hamperGroup:     groupName,
      });
    }

    addItems(cartItems);
    setAdding(false);
    router.push("/cart");
  }, [canAdd, selectedBox, occasionName, subcategory, giftMessage, hidePrices, chosen, products, addItems, router]);

  const LABEL = "block font-display text-[0.40rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.45)] mb-2";
  const RING  = "border border-[rgba(196,163,115,0.22)] hover:border-[rgba(196,163,115,0.45)] rounded-[4px] transition-all duration-150";

  return (
    <div className="min-h-screen bg-[#12060e]">

      {/* Header */}
      <div className="bg-[#1a0a12] border-b border-[rgba(196,163,115,0.10)] pt-24 pb-8 px-6">
        <div className="max-w-5xl mx-auto">
          <nav className="flex items-center gap-2 mb-6 flex-wrap">
            <Link href="/shop" className="font-display text-[0.50rem] tracking-[0.18em] uppercase text-[rgba(245,237,224,0.28)] hover:text-[rgba(245,237,224,0.55)] transition-colors">Shop</Link>
            <span className="text-[rgba(196,163,115,0.25)] text-xs">›</span>
            <Link href={`/shop/${category}`} className="font-display text-[0.50rem] tracking-[0.18em] uppercase text-[rgba(245,237,224,0.28)] hover:text-[rgba(245,237,224,0.55)] transition-colors">Gift Sets</Link>
            <span className="text-[rgba(196,163,115,0.25)] text-xs">›</span>
            <Link href={`/shop/${category}/${subcategory}`} className="font-display text-[0.50rem] tracking-[0.18em] uppercase text-[rgba(245,237,224,0.28)] hover:text-[rgba(245,237,224,0.55)] transition-colors">{occasionName}</Link>
            <span className="text-[rgba(196,163,115,0.25)] text-xs">›</span>
            <span className="font-display text-[0.50rem] tracking-[0.18em] uppercase text-brass">Build Hamper</span>
          </nav>
          <h1 className="font-display text-ivory mb-2" style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", letterSpacing: "0.05em" }}>
            Build Your {occasionName} Hamper
          </h1>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.40)] text-[0.92rem]">
            Select a box, fill it with what feels right. Min ₹{MIN_SPEND.toLocaleString("en-IN")} · Max ₹{MAX_SPEND.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col lg:flex-row gap-10 items-start">

        {/* Left column */}
        <div className="flex-1 min-w-0 flex flex-col gap-10">

          {/* Step 1 — Box */}
          <div>
            <p className={LABEL}>Step 1 — Choose your gift box</p>
            {boxes.length === 0 ? (
              <p className="font-body font-light text-[rgba(245,237,224,0.30)] text-sm">No box options configured yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {boxes.map(box => (
                  <button
                    key={box.id}
                    type="button"
                    onClick={() => setSelectedBox(box)}
                    className={[
                      "flex items-center gap-4 p-3 rounded-[4px] border text-left transition-all duration-150",
                      selectedBox?.id === box.id
                        ? "border-brass bg-[rgba(196,163,115,0.08)]"
                        : "border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.38)]",
                    ].join(" ")}
                  >
                    {box.image_url && (
                      <div className="w-14 h-14 flex-shrink-0 relative rounded-[3px] overflow-hidden bg-[#270b1b]">
                        <Image src={box.image_url} alt={box.name} fill className="object-cover" sizes="56px" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-ivory text-[0.80rem]" style={{ letterSpacing: "0.04em" }}>{box.name}</p>
                      {box.price > 0
                        ? <p className="font-display text-brass text-[0.65rem] mt-0.5">₹{box.price.toLocaleString("en-IN")}</p>
                        : <p className="font-display text-[rgba(196,163,115,0.38)] text-[0.65rem] mt-0.5">Included</p>
                      }
                    </div>
                    <span className={["w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors", selectedBox?.id === box.id ? "border-brass bg-brass" : "border-[rgba(196,163,115,0.30)]"].join(" ")} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2 — Products */}
          <div>
            <p className={LABEL}>Step 2 — Fill your hamper</p>

            <div className="flex gap-2 flex-wrap mb-4">
              {loadingProds ? (
                <div className="flex items-center gap-2 py-1">
                  <div className="w-4 h-4 rounded-full border-2 border-[rgba(196,163,115,0.20)] border-t-brass animate-spin" />
                  <span className="font-body font-light text-[rgba(245,237,224,0.38)] text-sm">Loading…</span>
                </div>
              ) : categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat)}
                  className={[
                    "px-3 py-1.5 rounded-[3px] font-display text-[0.44rem] tracking-[0.12em] uppercase transition-all duration-150",
                    catFilter === cat
                      ? "bg-[rgba(196,163,115,0.12)] border border-[rgba(196,163,115,0.45)] text-brass"
                      : "border border-[rgba(196,163,115,0.16)] text-[rgba(245,237,224,0.38)] hover:border-[rgba(196,163,115,0.30)]",
                  ].join(" ")}
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                </button>
              ))}
            </div>

            {budgetFull && (
              <div className="mb-4 px-3 py-2.5 rounded-[4px] bg-[rgba(196,163,115,0.07)] border border-[rgba(196,163,115,0.22)] flex items-center gap-2">
                <span className="text-brass text-[0.7rem]">✓</span>
                <p className="font-display text-[0.44rem] tracking-[0.12em] uppercase text-brass">Maximum reached — remove an item to add more</p>
              </div>
            )}

            {!catFilter ? (
              <p className="font-body font-light text-[rgba(245,237,224,0.28)] text-sm py-4">Select a category above to browse products.</p>
            ) : visibleProducts.length === 0 ? (
              <p className="font-body font-light text-[rgba(245,237,224,0.30)] text-sm py-4">No products available in this category.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visibleProducts.map(p => {
                  const qty   = chosen.get(p.id) ?? 0;
                  const hprice = hamperPrice(p);
                  const label = [p.fragrance, p.variant_label].filter(Boolean).join(" · ");
                  return (
                    <div key={p.id} className={[RING, "p-3 flex flex-col gap-2", qty > 0 ? "border-[rgba(196,163,115,0.40)] bg-[rgba(196,163,115,0.04)]" : ""].join(" ")}>
                      <div className="w-full aspect-square relative rounded-[3px] overflow-hidden bg-[#270b1b]">
                        {p.image_url
                          ? <Image src={p.image_url} alt={p.name} fill className="object-cover" sizes="160px" />
                          : <span className="absolute inset-0 flex items-center justify-center font-display text-[0.30rem] tracking-[0.1em] uppercase text-[rgba(196,163,115,0.18)]">D</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-ivory text-[0.72rem] leading-tight" style={{ letterSpacing: "0.04em" }}>{p.name}</p>
                        {label && <p className="font-display text-[0.40rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.42)] mt-0.5">{label}</p>}
                        <p className="font-display text-brass text-[0.68rem] mt-1">₹{hprice.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => setQty(p.id, 1)}
                            disabled={budgetFull}
                            className={[
                              "w-full text-center font-display text-[0.44rem] tracking-[0.14em] uppercase py-1.5 rounded-[3px] transition-all duration-150",
                              budgetFull
                                ? "text-[rgba(245,237,224,0.18)] border border-[rgba(245,237,224,0.08)] cursor-not-allowed"
                                : "text-brass border border-[rgba(196,163,115,0.28)] hover:border-[rgba(196,163,115,0.50)] hover:bg-[rgba(196,163,115,0.05)]",
                            ].join(" ")}
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center border border-[rgba(196,163,115,0.30)] rounded-[3px] overflow-hidden w-full justify-between">
                            <button type="button" onClick={() => setQty(p.id, -1)} className="w-8 h-7 flex items-center justify-center text-brass font-display hover:bg-[rgba(196,163,115,0.06)] transition-colors">−</button>
                            <span className="font-display text-ivory text-sm select-none">{qty}</span>
                            <button type="button" onClick={() => setQty(p.id, 1)} disabled={budgetFull || qty >= 10} className="w-8 h-7 flex items-center justify-center text-brass font-display hover:bg-[rgba(196,163,115,0.06)] disabled:opacity-30 transition-colors">+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 3 — Gift message */}
          <div>
            <p className={LABEL}>Gift Message (optional)</p>
            <textarea
              rows={3}
              value={giftMessage}
              onChange={e => setGiftMessage(e.target.value)}
              maxLength={200}
              placeholder="Write a personal message for your recipient…"
              className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.32)] focus:border-[rgba(196,163,115,0.55)] rounded-[3px] px-3 py-2.5 font-body font-light text-[rgba(245,237,224,0.75)] text-sm focus:outline-none transition-colors duration-150 resize-none placeholder:text-[rgba(245,237,224,0.18)]"
            />
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setHidePrices(v => !v)}
                  className={["w-9 h-5 rounded-full border transition-all duration-200 relative flex-shrink-0", hidePrices ? "bg-[rgba(196,163,115,0.15)] border-brass" : "bg-transparent border-[rgba(196,163,115,0.20)]"].join(" ")}
                >
                  <span className={["absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200", hidePrices ? "left-[calc(100%-18px)] bg-brass" : "left-0.5 bg-[rgba(245,237,224,0.22)]"].join(" ")} />
                </button>
                <span className="font-display text-[0.40rem] tracking-[0.12em] uppercase text-[rgba(245,237,224,0.45)]">Hide prices on packing slip</span>
              </label>
              <span className="font-display text-[0.35rem] text-[rgba(196,163,115,0.28)]">{giftMessage.length}/200</span>
            </div>
          </div>

        </div>

        {/* Right sticky summary */}
        <div className="w-full lg:w-[300px] flex-shrink-0 lg:sticky lg:top-24">
          <div className="bg-[#1a0a12] border border-[rgba(196,163,115,0.14)] rounded-[5px] overflow-hidden">

            <div className="px-5 pt-5 pb-4 border-b border-[rgba(196,163,115,0.08)]">
              <p className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.38)] mb-1">Your Hamper</p>
              <p className="font-display text-ivory" style={{ fontSize: "0.88rem", letterSpacing: "0.06em" }}>{occasionName}</p>
            </div>

            <div className="px-5 py-4 flex flex-col gap-3">

              {/* Progress bar */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="font-display text-[0.38rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.38)]">
                    Min ₹{MIN_SPEND.toLocaleString("en-IN")} · Max ₹{MAX_SPEND.toLocaleString("en-IN")}
                  </span>
                  <span className="font-display text-brass text-[0.68rem]">₹{runningTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="w-full h-1.5 bg-[rgba(196,163,115,0.10)] rounded-full overflow-hidden">
                  <div className="h-full bg-brass rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                {remaining > 0 && (
                  <p className="font-display text-[0.36rem] tracking-[0.10em] uppercase text-[rgba(245,237,224,0.28)] mt-1.5">
                    Add ₹{remaining.toLocaleString("en-IN")} more to continue
                  </p>
                )}
                {remaining === 0 && (
                  <p className="font-display text-[0.36rem] tracking-[0.10em] uppercase text-[rgba(100,215,100,0.55)] mt-1.5">
                    Minimum met ✓
                  </p>
                )}
              </div>

              {/* Chosen items */}
              {(chosen.size > 0 || selectedBox) && (
                <div className="flex flex-col gap-1.5 border-t border-[rgba(196,163,115,0.08)] pt-3">
                  {selectedBox && (
                    <div className="flex justify-between">
                      <span className="font-display text-[rgba(196,163,115,0.50)] text-[0.68rem]" style={{ letterSpacing: "0.04em" }}>Box · {selectedBox.name}</span>
                      <span className="font-display text-[rgba(245,237,224,0.38)] text-[0.68rem]">
                        {selectedBox.price > 0 ? `₹${selectedBox.price.toLocaleString("en-IN")}` : "Included"}
                      </span>
                    </div>
                  )}
                  {Array.from(chosen.entries()).map(([id, qty]) => {
                    const p = products.find(pr => pr.id === id);
                    if (!p) return null;
                    const hprice = hamperPrice(p);
                    return (
                      <div key={id} className="flex justify-between gap-2">
                        <span className="font-display text-[rgba(245,237,224,0.55)] text-[0.68rem] truncate" style={{ letterSpacing: "0.02em" }}>{qty}× {p.name}</span>
                        <span className="font-display text-[rgba(245,237,224,0.38)] text-[0.68rem] flex-shrink-0">₹{(hprice * qty).toLocaleString("en-IN")}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total */}
              <div className="border-t border-[rgba(196,163,115,0.10)] pt-3 flex justify-between">
                <span className="font-display text-[0.44rem] tracking-[0.14em] uppercase text-[rgba(245,237,224,0.38)]">Total</span>
                <span className="font-display text-brass" style={{ fontSize: "1.1rem", letterSpacing: "0.04em" }}>₹{runningTotal.toLocaleString("en-IN")}</span>
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canAdd || adding}
                className={[
                  "w-full font-display tracking-[0.2em] uppercase py-3.5 rounded-[3px] border transition-all duration-200 text-center mt-1",
                  canAdd
                    ? "border-brass text-brass bg-[rgba(196,163,115,0.06)] hover:bg-[rgba(196,163,115,0.14)]"
                    : "border-[rgba(196,163,115,0.18)] text-[rgba(245,237,224,0.28)] cursor-not-allowed",
                ].join(" ")}
                style={{ fontSize: "0.58rem" }}
              >
                {adding ? "Adding…" : "Add to Cart"}
              </button>

              {!canAdd && (
                <p className="font-display text-[0.34rem] tracking-[0.08em] uppercase text-[rgba(245,237,224,0.25)] text-center -mt-1">
                  {!selectedBox ? "Choose a box first" : `Add ₹${remaining.toLocaleString("en-IN")} more to continue`}
                </p>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
