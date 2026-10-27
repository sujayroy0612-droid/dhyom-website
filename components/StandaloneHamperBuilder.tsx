"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useCart, type CartItem } from "@/lib/cart/CartContext";

interface HamperBox {
  id: string; name: string; image_url: string | null; price: number; stock: number | null;
}
interface BuilderProduct {
  id: string; name: string; price: number; hamper_price: number | null;
  category: string; fragrance: string | null; variant_label: string | null;
  image_url: string | null; stock: number;
}

interface Props {
  box: HamperBox | null;
  products: BuilderProduct[];
}

const MIN_SPEND = 999;

const CATEGORY_LABELS: Record<string, string> = {
  bracelet:          "Bracelets",
  candle:            "Candles",
  dhoop:             "Fragrance",
  idol:              "Devotional",
  edibles:           "Gourmet",
  "pooja-essentials": "Pooja Essentials",
};

const CATEGORY_INTROS: Record<string, string> = {
  bracelet: "The intention. Pick 1 for a solo gift, 2 for couple hampers.",
  candle:   "The scent memory. Choose one fragrance to anchor the hamper.",
  dhoop:    "The ritual. Pick a dhoop that will burn through the evenings.",
  idol:     "The presence. The matte-black Ganesh brings a modern reverence to any home.",
  edibles:  "The sweetness. A considered addition to any festive gift.",
};

const CATEGORY_ORDER = ["bracelet", "candle", "dhoop", "idol", "edibles", "pooja-essentials"];
const CATEGORY_MAX: Record<string, number> = { bracelet: 2 };

function getCategoryMax(cat: string): number { return CATEGORY_MAX[cat] ?? 1; }
function hp(p: BuilderProduct): number { return p.hamper_price ?? p.price; }

function fireEvent(name: string, params?: Record<string, unknown>) {
  try {
    const w = window as unknown as Record<string, ((...a: unknown[]) => void) | undefined>;
    w.gtag?.("event", name, params ?? {});
    (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq?.("trackCustom", name, params ?? {});
  } catch {}
}

export default function StandaloneHamperBuilder({ box, products }: Props) {
  const router  = useRouter();
  const { addItems } = useCart();

  const [chosen,       setChosen]       = useState<Map<string, number>>(new Map());
  const [giftMessage,  setGiftMessage]  = useState("");
  const [hidePrices,   setHidePrices]   = useState(false);
  const [adding,       setAdding]       = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [copyMsg,      setCopyMsg]      = useState("");
  const qualifiedRef   = useRef(false);
  const cartAddedRef   = useRef(false);

  // Restore from share URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlItems = params.get("items");
    if (!urlItems) return;
    const m = new Map<string, number>();
    urlItems.split(",").forEach(id => {
      const p = products.find(pr => pr.id === id);
      if (p) m.set(id, (m.get(id) ?? 0) + 1);
    });
    if (m.size > 0) setChosen(m);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire opened event once
  useEffect(() => { fireEvent("hamper_builder_opened"); }, []);

  // Abandon tracking
  useEffect(() => {
    function onLeave() {
      if (chosen.size > 0 && !cartAddedRef.current) {
        fireEvent("hamper_abandoned", { items_count: chosen.size });
      }
    }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [chosen]);

  const boxPrice      = box?.price ?? 0;
  const productTotal  = Array.from(chosen.entries()).reduce((s, [id, qty]) => {
    const p = products.find(pr => pr.id === id);
    return p ? s + hp(p) * qty : s;
  }, 0);
  const runningTotal  = productTotal + boxPrice;
  const progress      = Math.min(100, Math.round((runningTotal / MIN_SPEND) * 100));
  const remaining     = Math.max(0, MIN_SPEND - runningTotal);
  const canAdd        = !!box && runningTotal >= MIN_SPEND;

  // hamper_qualified fires once
  useEffect(() => {
    if (runningTotal >= MIN_SPEND && !qualifiedRef.current) {
      qualifiedRef.current = true;
      fireEvent("hamper_qualified", { total: runningTotal });
    }
  }, [runningTotal]);

  const categories = CATEGORY_ORDER.filter(cat => products.some(p => p.category === cat));

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) setActiveCategory(categories[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length]);

  function catCount(cat: string): number {
    return Array.from(chosen.entries()).reduce((s, [id, qty]) => {
      return products.find(pr => pr.id === id)?.category === cat ? s + qty : s;
    }, 0);
  }

  function addProduct(productId: string) {
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    const max = getCategoryMax(p.category);
    const cur = catCount(p.category);

    setChosen(prev => {
      const next = new Map(prev);
      if (max === 1) {
        for (const [id] of Array.from(next.entries())) {
          if (products.find(pr => pr.id === id)?.category === p.category) next.delete(id);
        }
        next.set(productId, 1);
      } else {
        if (cur < max) next.set(productId, (next.get(productId) ?? 0) + 1);
      }
      return next;
    });
    fireEvent("item_added", { item_id: productId, category: p.category, price: hp(p) });
  }

  function removeProduct(productId: string) {
    const p = products.find(pr => pr.id === productId);
    setChosen(prev => {
      const next = new Map(prev);
      const qty = next.get(productId) ?? 0;
      if (qty <= 1) next.delete(productId); else next.set(productId, qty - 1);
      return next;
    });
    if (p) fireEvent("item_removed", { item_id: productId, category: p.category });
  }

  function shareHamper() {
    const ids = Array.from(chosen.entries())
      .flatMap(([id, qty]) => Array(qty).fill(id))
      .join(",");
    const url = `${window.location.origin}/build-your-hamper${ids ? `?items=${ids}` : ""}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyMsg("Link copied");
      setTimeout(() => setCopyMsg(""), 2000);
    }).catch(() => {});
  }

  const handleAddToCart = useCallback(() => {
    if (!canAdd || !box) return;
    setAdding(true);
    cartAddedRef.current = true;
    const groupId = crypto.randomUUID();
    const items: CartItem[] = [];

    items.push({
      kind: "product", id: box.id, cartItemId: crypto.randomUUID(),
      name: box.name, price: box.price, quantity: 1,
      category: "gift", subcategorySlug: "custom-hamper", label: "",
      imageUrl: box.image_url ?? "",
      hamperGroupId: groupId, hamperGroup: "Custom Dhyom Hamper", isHamperBox: true,
      giftMessage: giftMessage.trim() || undefined,
      hidePrices: hidePrices || undefined,
    });

    for (const [productId, qty] of Array.from(chosen.entries())) {
      const p = products.find(pr => pr.id === productId);
      if (!p) continue;
      items.push({
        kind: "product", id: p.id, cartItemId: crypto.randomUUID(),
        name: p.name, price: hp(p), quantity: qty,
        category: p.category, subcategorySlug: "custom-hamper",
        label: [p.fragrance, p.variant_label].filter(Boolean).join(" · "),
        imageUrl: p.image_url ?? "",
        hamperGroupId: groupId, hamperGroup: "Custom Dhyom Hamper",
      });
    }

    fireEvent("hamper_added_to_cart", { total: runningTotal, items_count: chosen.size, box: 1 });
    addItems(items);
    setAdding(false);
    router.push("/cart");
  }, [canAdd, box, chosen, products, giftMessage, hidePrices, runningTotal, addItems, router]);

  const LABEL = "block font-display text-[0.40rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.45)] mb-2";
  const RING  = "border border-[rgba(196,163,115,0.22)] hover:border-[rgba(196,163,115,0.45)] rounded-[4px] transition-all duration-150";

  // Box out of stock
  if (!box || (box.stock !== null && box.stock <= 0)) {
    return (
      <div className="min-h-screen bg-[#12060e] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="font-display text-ivory mb-3" style={{ fontSize: "1.1rem", letterSpacing: "0.06em" }}>
            Hamper configurator temporarily unavailable.
          </p>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.45)] text-[0.92rem]">
            New stock arriving soon.
          </p>
          <Link href="/shop" className="inline-block mt-6 font-display text-[0.52rem] tracking-[0.18em] uppercase text-brass border border-[rgba(196,163,115,0.35)] px-5 py-2.5 rounded-[3px] hover:bg-[rgba(196,163,115,0.08)] transition-all duration-150">
            Browse the Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12060e]">

      {/* Hero */}
      <div className="relative bg-[#1a0a12] border-b border-[rgba(196,163,115,0.10)] pt-24 pb-10 px-6 overflow-hidden">
        {box.image_url && (
          <>
            <div className="absolute inset-0">
              <Image src={box.image_url} alt="" fill className="object-cover opacity-[0.08]" sizes="100vw" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a12]/70 to-[#1a0a12]" />
          </>
        )}
        <div className="relative max-w-5xl mx-auto">
          <nav className="flex items-center gap-2 mb-6 flex-wrap">
            <Link href="/shop" className="font-display text-[0.50rem] tracking-[0.18em] uppercase text-[rgba(245,237,224,0.28)] hover:text-[rgba(245,237,224,0.55)] transition-colors">Shop</Link>
            <span className="text-[rgba(196,163,115,0.25)] text-xs">›</span>
            <span className="font-display text-[0.50rem] tracking-[0.18em] uppercase text-brass">Build Your Hamper</span>
          </nav>
          <h1 className="font-display text-ivory mb-3" style={{ fontSize: "clamp(1.6rem, 4vw, 2.6rem)", letterSpacing: "0.05em" }}>
            Build the hamper you&rsquo;d want to receive.
          </h1>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.48)] text-[0.95rem] max-w-lg">
            Curate from five categories. Every hamper comes in the signature Mandala Trunk Box.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col lg:flex-row gap-10 items-start">

        {/* ── Left column ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-10">

          {/* Mandatory box */}
          <div>
            <p className={LABEL}>Your Gift Box — Always Included</p>
            <div className="rounded-[4px] border border-[rgba(196,163,115,0.28)] bg-[rgba(196,163,115,0.04)] overflow-hidden">
              {box.image_url && (
                <div className="w-full h-48 relative overflow-hidden bg-[#270b1b]">
                  <Image src={box.image_url} alt={box.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 600px" />
                </div>
              )}
              <div className="px-4 py-3">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-display text-ivory text-[0.80rem]" style={{ letterSpacing: "0.04em" }}>{box.name}</p>
                    <p className="font-display text-brass text-[0.65rem] mt-0.5">₹{box.price.toLocaleString("en-IN")}</p>
                  </div>
                  <span className="font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(100,215,100,0.70)] border border-[rgba(100,215,100,0.28)] px-2 py-1 rounded-[3px] flex-shrink-0">
                    Always Included
                  </span>
                </div>
                <p className="font-body font-light italic text-[rgba(245,237,224,0.35)] text-[0.82rem] mt-2 leading-relaxed">
                  Every Dhyom hamper is presented in our signature mandala-patterned trunk with brass clasp and corner hardware. Keepsake-grade, reusable.
                </p>
              </div>
            </div>
          </div>

          {/* Category tabs + products */}
          <div>
            <p className={LABEL}>Fill Your Hamper</p>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap mb-3">
              {categories.map(cat => {
                const count = catCount(cat);
                const max   = getCategoryMax(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={[
                      "px-3 py-1.5 rounded-[3px] font-display text-[0.44rem] tracking-[0.12em] uppercase transition-all duration-150 flex items-center gap-1.5",
                      activeCategory === cat
                        ? "bg-[rgba(196,163,115,0.12)] border border-[rgba(196,163,115,0.45)] text-brass"
                        : "border border-[rgba(196,163,115,0.16)] text-[rgba(245,237,224,0.38)] hover:border-[rgba(196,163,115,0.30)]",
                    ].join(" ")}
                  >
                    {CATEGORY_LABELS[cat] ?? cat}
                    {count > 0 && (
                      <span className="w-4 h-4 rounded-full bg-brass text-[#12060e] flex items-center justify-center" style={{ fontSize: "0.38rem" }}>
                        {count}
                      </span>
                    )}
                    <span className="text-[rgba(196,163,115,0.30)]" style={{ fontSize: "0.36rem" }}>max {max}</span>
                  </button>
                );
              })}
            </div>

            {/* Category intro */}
            {activeCategory && CATEGORY_INTROS[activeCategory] && (
              <p className="font-body font-light italic text-[rgba(245,237,224,0.32)] text-[0.84rem] mb-4">
                {CATEGORY_INTROS[activeCategory]}
              </p>
            )}

            {/* Products grid */}
            {activeCategory && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.filter(p => p.category === activeCategory).map(p => {
                  const qty        = chosen.get(p.id) ?? 0;
                  const max        = getCategoryMax(p.category);
                  const catFull    = catCount(p.category) >= max;
                  const isSwap     = qty === 0 && max === 1 && catCount(p.category) > 0;
                  const stockLow   = p.stock > 0 && p.stock <= 5;
                  const outOfStock = p.stock <= 0;
                  const hprice     = hp(p);
                  const label      = [p.fragrance, p.variant_label].filter(Boolean).join(" · ");

                  return (
                    <div
                      key={p.id}
                      className={[
                        RING, "p-3 flex flex-col gap-2 relative",
                        qty > 0 ? "border-[rgba(196,163,115,0.40)] bg-[rgba(196,163,115,0.04)]" : "",
                        outOfStock ? "opacity-50" : "",
                      ].join(" ")}
                    >
                      {stockLow && !outOfStock && (
                        <span className="absolute top-2 right-2 z-10 font-display tracking-[0.10em] uppercase text-[rgba(220,150,80,0.85)] border border-[rgba(220,150,80,0.35)] px-1.5 py-0.5 rounded-[2px] bg-[#12060e]" style={{ fontSize: "0.32rem" }}>
                          Only {p.stock} left
                        </span>
                      )}
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
                      <div className="mt-auto">
                        {outOfStock ? (
                          <div className="w-full text-center font-display text-[0.40rem] tracking-[0.14em] uppercase py-1.5 rounded-[3px] text-[rgba(245,237,224,0.20)] border border-[rgba(245,237,224,0.08)]">
                            Currently unavailable
                          </div>
                        ) : qty > 0 ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => removeProduct(p.id)}
                              className="flex-1 text-center font-display text-[0.44rem] tracking-[0.14em] uppercase py-1.5 rounded-[3px] text-[rgba(245,237,224,0.50)] border border-[rgba(196,163,115,0.38)] bg-[rgba(196,163,115,0.06)] hover:bg-transparent hover:text-[rgba(245,237,224,0.35)] transition-all duration-150"
                            >
                              Selected ✓
                            </button>
                            {max > 1 && qty < max && (
                              <button
                                type="button"
                                onClick={() => addProduct(p.id)}
                                className="px-2.5 text-center font-display text-[0.44rem] tracking-[0.12em] uppercase py-1.5 rounded-[3px] text-brass border border-[rgba(196,163,115,0.28)] hover:border-[rgba(196,163,115,0.50)] hover:bg-[rgba(196,163,115,0.05)] transition-all duration-150"
                              >
                                +1
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addProduct(p.id)}
                            disabled={catFull && max > 1}
                            className={[
                              "w-full text-center font-display text-[0.44rem] tracking-[0.14em] uppercase py-1.5 rounded-[3px] transition-all duration-150",
                              catFull && max > 1
                                ? "text-[rgba(245,237,224,0.18)] border border-[rgba(245,237,224,0.08)] cursor-not-allowed"
                                : isSwap
                                ? "text-ivory border border-[rgba(196,163,115,0.45)] hover:bg-[rgba(196,163,115,0.08)]"
                                : "text-brass border border-[rgba(196,163,115,0.28)] hover:border-[rgba(196,163,115,0.50)] hover:bg-[rgba(196,163,115,0.05)]",
                            ].join(" ")}
                          >
                            {isSwap ? "Swap In" : catFull && max > 1 ? `Max ${max} per hamper` : "Add"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Gift message */}
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
              <span className="font-display text-[rgba(196,163,115,0.28)]" style={{ fontSize: "0.35rem" }}>{giftMessage.length}/200</span>
            </div>
          </div>

        </div>

        {/* ── Right sticky summary ── */}
        <div className="w-full lg:w-[300px] flex-shrink-0 lg:sticky lg:top-24">
          <div className="bg-[#1a0a12] border border-[rgba(196,163,115,0.14)] rounded-[5px] overflow-hidden">

            <div className="px-5 pt-5 pb-4 border-b border-[rgba(196,163,115,0.08)]">
              <p className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.38)] mb-1">Your Hamper</p>
              <p className="font-display text-ivory" style={{ fontSize: "0.88rem", letterSpacing: "0.06em" }}>Custom Dhyom Hamper</p>
            </div>

            <div className="px-5 py-4 flex flex-col gap-3">

              {/* Progress */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="font-display text-[0.38rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.38)]">
                    Min ₹{MIN_SPEND.toLocaleString("en-IN")}
                  </span>
                  <span className="font-display text-brass text-[0.68rem]">₹{runningTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="w-full h-1.5 bg-[rgba(196,163,115,0.10)] rounded-full overflow-hidden">
                  <div className="h-full bg-brass rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                {remaining > 0 ? (
                  <p className="font-display text-[0.36rem] tracking-[0.10em] uppercase text-[rgba(245,237,224,0.28)] mt-1.5">
                    Add ₹{remaining.toLocaleString("en-IN")} more worth of items to reach the ₹{MIN_SPEND.toLocaleString("en-IN")} hamper minimum
                  </p>
                ) : (
                  <p className="font-display text-[0.36rem] tracking-[0.10em] uppercase text-[rgba(100,215,100,0.55)] mt-1.5">
                    Your Dhyom hamper is ready.
                  </p>
                )}
              </div>

              {/* Items list */}
              <div className="flex flex-col gap-1.5 border-t border-[rgba(196,163,115,0.08)] pt-3">
                <div className="flex justify-between">
                  <span className="font-display text-[rgba(196,163,115,0.50)] text-[0.68rem]" style={{ letterSpacing: "0.04em" }}>
                    {box.name}
                  </span>
                  <span className="font-display text-[rgba(245,237,224,0.38)] text-[0.68rem]">₹{box.price.toLocaleString("en-IN")}</span>
                </div>
                {Array.from(chosen.entries()).map(([id, qty]) => {
                  const p = products.find(pr => pr.id === id);
                  if (!p) return null;
                  return (
                    <div key={id} className="flex justify-between gap-2">
                      <span className="font-display text-[rgba(245,237,224,0.55)] text-[0.68rem] truncate" style={{ letterSpacing: "0.02em" }}>
                        {qty}× {p.name}
                      </span>
                      <span className="font-display text-[rgba(245,237,224,0.38)] text-[0.68rem] flex-shrink-0">
                        ₹{(hp(p) * qty).toLocaleString("en-IN")}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="border-t border-[rgba(196,163,115,0.10)] pt-3 flex justify-between">
                <span className="font-display text-[0.44rem] tracking-[0.14em] uppercase text-[rgba(245,237,224,0.38)]">Total</span>
                <span className="font-display text-brass" style={{ fontSize: "1.1rem", letterSpacing: "0.04em" }}>
                  ₹{runningTotal.toLocaleString("en-IN")}
                </span>
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canAdd || adding}
                className={[
                  "w-full font-display tracking-[0.18em] uppercase py-3.5 rounded-[3px] border transition-all duration-200 text-center mt-1",
                  canAdd
                    ? "border-brass text-brass bg-[rgba(196,163,115,0.06)] hover:bg-[rgba(196,163,115,0.14)]"
                    : "border-[rgba(196,163,115,0.18)] text-[rgba(245,237,224,0.28)] cursor-not-allowed",
                ].join(" ")}
                style={{ fontSize: "0.56rem" }}
              >
                {adding
                  ? "Adding…"
                  : canAdd
                  ? `Add Hamper to Cart — ₹${runningTotal.toLocaleString("en-IN")}`
                  : "Add items to continue"}
              </button>

              {/* Share */}
              {chosen.size > 0 && (
                <button
                  type="button"
                  onClick={shareHamper}
                  className="w-full font-display tracking-[0.14em] uppercase py-2.5 rounded-[3px] border border-[rgba(196,163,115,0.16)] text-[rgba(196,163,115,0.45)] hover:border-[rgba(196,163,115,0.35)] hover:text-[rgba(196,163,115,0.70)] transition-all duration-150 text-center"
                  style={{ fontSize: "0.50rem" }}
                >
                  {copyMsg || "Share this hamper"}
                </button>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
