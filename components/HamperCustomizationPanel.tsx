"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useCart } from "@/lib/cart/CartContext";
import type { HamperSelection } from "@/lib/cart/CartContext";

export interface HamperSlot {
  id: string;
  label: string;
  allowed_categories: string[];
  quantity: number;
  sort_order: number;
}

export interface HamperBox {
  id: string;
  name: string;
  image_url: string;
  extra_price: number;
}

interface SlotProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  fragrance: string | null;
  variant_label: string | null;
  image_url: string | null;
}

interface Props {
  productId: string;
  productName: string;
  price: number;
  imageUrl: string;
  category: string;
  subcategorySlug: string;
  productSlug: string;
  slots: HamperSlot[];
  boxes: HamperBox[];
}

export default function HamperCustomizationPanel({
  productId, productName, price, imageUrl,
  category, subcategorySlug, productSlug,
  slots, boxes,
}: Props) {
  const { addItem } = useCart();

  const [selectedBoxId,    setSelectedBoxId]    = useState<string>("");
  const [slotChoices,      setSlotChoices]       = useState<Record<string, string>>({});  // slotId → productId
  const [slotProducts,     setSlotProducts]      = useState<Record<string, SlotProduct[]>>({});
  const [loadingProducts,  setLoadingProducts]   = useState(true);
  const [giftMessage,      setGiftMessage]       = useState("");
  const [hidePrices,       setHidePrices]        = useState(false);
  const [adding,           setAdding]            = useState(false);
  const [added,            setAdded]             = useState(false);

  // Fetch products for each slot's allowed categories
  useEffect(() => {
    if (slots.length === 0) { setLoadingProducts(false); return; }

    const allCats = Array.from(new Set(slots.flatMap(s => s.allowed_categories)));
    if (allCats.length === 0) { setLoadingProducts(false); return; }

    fetch(`/api/hampers/products?categories=${encodeURIComponent(allCats.join(","))}`)
      .then(r => r.json())
      .then((data: { products?: SlotProduct[] }) => {
        const prods = data.products ?? [];
        // Group by category
        const byCat: Record<string, SlotProduct[]> = {};
        for (const p of prods) {
          if (!byCat[p.category]) byCat[p.category] = [];
          byCat[p.category].push(p);
        }
        // Build per-slot product lists
        const bySlot: Record<string, SlotProduct[]> = {};
        for (const slot of slots) {
          bySlot[slot.id] = slot.allowed_categories.flatMap(c => byCat[c] ?? []);
        }
        setSlotProducts(bySlot);
        setLoadingProducts(false);
      })
      .catch(() => setLoadingProducts(false));
  }, [slots]);

  const selectedBox = boxes.find(b => b.id === selectedBoxId);
  const totalPrice  = price + (selectedBox?.extra_price ?? 0);
  const allSlotsFilled = slots.every(s => !!slotChoices[s.id]);
  const canAdd = !!selectedBoxId && allSlotsFilled;

  function handleSlotChoice(slotId: string, productId: string) {
    setSlotChoices(prev => ({ ...prev, [slotId]: productId }));
  }

  async function handleAddToCart() {
    if (!canAdd) return;
    setAdding(true);

    const box = selectedBox!;
    const selections: HamperSelection[] = slots.map(slot => {
      const pid = slotChoices[slot.id];
      const prod = slotProducts[slot.id]?.find(p => p.id === pid);
      return {
        slotId:       slot.id,
        slotLabel:    slot.label,
        productId:    pid,
        productName:  prod?.name ?? "",
        productLabel: prod?.fragrance ?? prod?.variant_label ?? "",
        imageUrl:     prod?.image_url ?? "",
      };
    });

    const hamperComponents = selections.map(s => ({ id: s.productId, quantity: 1 }));

    addItem({
      kind:             "hamper",
      id:               crypto.randomUUID(),
      productId,
      productName,
      productSlug,
      category,
      subcategorySlug,
      boxId:            box.id,
      boxName:          box.name,
      boxExtraPrice:    box.extra_price,
      price:            totalPrice,
      quantity:         1,
      imageUrl,
      giftMessage,
      hidePrices,
      selections,
      hamperComponents,
    });

    setAdding(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  }

  const LABEL = "block font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)] mb-2";
  const SEL   = "w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.22)] hover:border-[rgba(196,163,115,0.40)] focus:border-[rgba(196,163,115,0.60)] rounded-[3px] px-3 py-2.5 font-body font-light text-[rgba(245,237,224,0.78)] text-sm focus:outline-none transition-colors duration-150";

  return (
    <div className="flex flex-col gap-6">

      {/* Step 1 — Box */}
      {boxes.length > 0 && (
        <div>
          <p className={LABEL}>Step 1 — Choose your gift box</p>
          <div className="flex flex-col gap-2">
            {boxes.map(box => (
              <button
                key={box.id}
                type="button"
                onClick={() => setSelectedBoxId(box.id)}
                className={[
                  "flex items-center gap-4 p-3 rounded-[4px] border text-left transition-all duration-150",
                  selectedBoxId === box.id
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
                  {box.extra_price > 0 && (
                    <p className="font-display text-brass text-[0.65rem] mt-0.5">+₹{box.extra_price.toLocaleString("en-IN")}</p>
                  )}
                </div>
                <span className={[
                  "w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors",
                  selectedBoxId === box.id ? "border-brass bg-brass" : "border-[rgba(196,163,115,0.30)]",
                ].join(" ")} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Slots */}
      {slots.length > 0 && (
        <div>
          <p className={LABEL}>Step 2 — Customise your hamper</p>
          {loadingProducts ? (
            <div className="flex items-center gap-2 py-3">
              <div className="w-4 h-4 rounded-full border-2 border-[rgba(196,163,115,0.20)] border-t-brass animate-spin" />
              <span className="font-body font-light text-[rgba(245,237,224,0.38)] text-sm">Loading products…</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {slots.map((slot, idx) => {
                const products = slotProducts[slot.id] ?? [];
                return (
                  <div key={slot.id}>
                    <label className="block font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.42)] mb-1.5">
                      {slot.label} {idx + 1}
                    </label>
                    {products.length === 0 ? (
                      <p className="font-body font-light text-[rgba(245,237,224,0.28)] text-sm">No products available for this slot.</p>
                    ) : (
                      <select
                        className={SEL}
                        value={slotChoices[slot.id] ?? ""}
                        onChange={e => handleSlotChoice(slot.id, e.target.value)}
                        style={{ background: "rgba(26,10,18,0.95)" }}
                      >
                        <option value="">— Choose a {slot.label.toLowerCase()} —</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}{p.fragrance ? ` · ${p.fragrance}` : ""}{p.variant_label ? ` · ${p.variant_label}` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Gift message */}
      <div>
        <label className={LABEL}>Gift Message (optional)</label>
        <textarea
          rows={3}
          value={giftMessage}
          onChange={e => setGiftMessage(e.target.value)}
          maxLength={300}
          placeholder="Write a personal message for your recipient…"
          className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.32)] focus:border-[rgba(196,163,115,0.55)] rounded-[3px] px-3 py-2.5 font-body font-light text-[rgba(245,237,224,0.75)] text-sm focus:outline-none transition-colors duration-150 resize-none placeholder:text-[rgba(245,237,224,0.18)]"
        />
        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <button
              type="button"
              onClick={() => setHidePrices(v => !v)}
              className={[
                "w-9 h-5 rounded-full border transition-all duration-200 relative flex-shrink-0",
                hidePrices ? "bg-[rgba(196,163,115,0.15)] border-brass" : "bg-transparent border-[rgba(196,163,115,0.20)]",
              ].join(" ")}
            >
              <span className={[
                "absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200",
                hidePrices ? "left-[calc(100%-18px)] bg-brass" : "left-0.5 bg-[rgba(245,237,224,0.22)]",
              ].join(" ")} />
            </button>
            <span className="font-display text-[0.38rem] tracking-[0.12em] uppercase text-[rgba(245,237,224,0.45)]">
              Hide prices on packing slip
            </span>
          </label>
          <span className="font-display text-[0.35rem] text-[rgba(196,163,115,0.28)]">{giftMessage.length}/300</span>
        </div>
      </div>

      {/* Price summary */}
      <div className="border border-[rgba(196,163,115,0.12)] rounded-[4px] px-4 py-3 bg-[rgba(196,163,115,0.03)] flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="font-body font-light text-[rgba(245,237,224,0.48)] text-sm">Hamper (base)</span>
          <span className="font-display text-ivory text-sm">₹{price.toLocaleString("en-IN")}</span>
        </div>
        {selectedBox && selectedBox.extra_price > 0 && (
          <div className="flex items-center justify-between">
            <span className="font-body font-light text-[rgba(245,237,224,0.48)] text-sm">{selectedBox.name}</span>
            <span className="font-display text-ivory text-sm">+₹{selectedBox.extra_price.toLocaleString("en-IN")}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-[rgba(196,163,115,0.10)] pt-1.5 mt-0.5">
          <span className="font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(245,237,224,0.38)]">Total</span>
          <span className="font-display text-brass" style={{ fontSize: "1.2rem", letterSpacing: "0.04em" }}>₹{totalPrice.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Add to Cart */}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!canAdd || adding}
        className={[
          "w-full font-display tracking-[0.2em] uppercase py-4 rounded-[3px] border transition-all duration-200 text-center",
          added
            ? "border-[rgba(100,215,100,0.50)] text-[rgba(100,215,100,0.80)] bg-[rgba(100,215,100,0.05)]"
            : canAdd
            ? "border-brass text-brass bg-[rgba(196,163,115,0.06)] hover:bg-[rgba(196,163,115,0.14)]"
            : "border-[rgba(196,163,115,0.18)] text-[rgba(245,237,224,0.28)] cursor-not-allowed",
        ].join(" ")}
        style={{ fontSize: "0.62rem" }}
      >
        {adding ? "Adding…" : added ? "Added to Cart ✓" : "Add to Cart"}
      </button>

      {!canAdd && !adding && (
        <p className="font-display text-[0.38rem] tracking-[0.10em] uppercase text-[rgba(245,237,224,0.28)] text-center -mt-3">
          {!selectedBoxId ? "Select a gift box to continue" : "Select all items to add to cart"}
        </p>
      )}
    </div>
  );
}
