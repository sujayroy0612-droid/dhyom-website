"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCart, HamperCartItem, HamperSelection } from "@/lib/cart/CartContext";

/* ── Types from API ─────────────────────────────────────── */
interface Tier {
  id: string;
  name: string;
  price: number;
  description: string;
  sort_order: number;
}
interface Box {
  id: string;
  name: string;
  image_url: string;
}
interface Slot {
  id: string;
  tier_id: string;
  label: string;
  allowed_categories: string[];
  quantity: number;
  sort_order: number;
}
interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  collection: string | null;
  fragrance: string | null;
  price: number;
  stock: number;
  image_url: string;
  slug: string;
}

function productLabel(p: Product): string {
  const parts: string[] = [];
  if (p.fragrance) parts.push(p.fragrance);
  if (p.collection) parts.push(p.collection);
  return parts.join(" · ");
}

/* ── Step indicator ─────────────────────────────────────── */
const STEPS = ["Tier", "Box", "Items", "Message", "Review"];

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={[
            "w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300",
            i < current
              ? "border-brass bg-brass"
              : i === current
              ? "border-brass bg-[rgba(196,163,115,0.12)]"
              : "border-[rgba(196,163,115,0.20)] bg-transparent",
          ].join(" ")}>
            {i < current ? (
              <svg width="8" height="6" viewBox="0 0 8 6" fill="none" stroke="#12060e" strokeWidth="1.8"><path d="M1 3l2 2 4-4" /></svg>
            ) : (
              <span className={["font-display", i === current ? "text-brass" : "text-[rgba(196,163,115,0.30)]"].join(" ")} style={{ fontSize: "0.38rem", letterSpacing: "0.05em" }}>{i + 1}</span>
            )}
          </div>
          {i < STEPS.length - 1 && (
            <div className={["w-6 h-px transition-all duration-300", i < current ? "bg-brass" : "bg-[rgba(196,163,115,0.15)]"].join(" ")} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Tier card ──────────────────────────────────────────── */
function TierCard({ tier, selected, onSelect }: { tier: Tier; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full text-left border rounded-[6px] p-5 transition-all duration-200 focus-visible:outline-none",
        selected
          ? "border-brass bg-[rgba(196,163,115,0.08)]"
          : "border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.40)] bg-transparent",
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-display text-ivory" style={{ fontSize: "0.88rem", letterSpacing: "0.06em" }}>{tier.name}</p>
        <p className="font-display text-brass" style={{ fontSize: "1rem", letterSpacing: "0.04em" }}>₹{tier.price.toLocaleString("en-IN")}</p>
      </div>
      {tier.description && (
        <p className="font-body font-light text-[rgba(245,237,224,0.45)] text-[0.82rem] leading-relaxed">{tier.description}</p>
      )}
      {selected && (
        <div className="mt-3 flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-brass flex items-center justify-center">
            <svg width="7" height="5" viewBox="0 0 7 5" fill="none" stroke="#12060e" strokeWidth="1.6"><path d="M1 2.5l1.5 1.5 3.5-3" /></svg>
          </div>
          <span className="font-display text-[0.48rem] tracking-[0.16em] uppercase text-brass">Selected</span>
        </div>
      )}
    </button>
  );
}

/* ── Box card ───────────────────────────────────────────── */
function BoxCard({ box, selected, onSelect }: { box: Box; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "text-left border rounded-[6px] overflow-hidden transition-all duration-200 focus-visible:outline-none",
        selected
          ? "border-brass ring-1 ring-brass"
          : "border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.40)]",
      ].join(" ")}
    >
      <div className="relative w-full aspect-square bg-[#1e0716]">
        {box.image_url ? (
          <Image src={box.image_url} alt={box.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 280px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-[0.36rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.18)]">DHYOM</span>
          </div>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="font-display text-ivory text-[0.76rem]" style={{ letterSpacing: "0.06em" }}>{box.name}</p>
        {selected && <p className="font-display text-[0.44rem] tracking-[0.14em] uppercase text-brass mt-1">Selected</p>}
      </div>
    </button>
  );
}

/* ── Product picker for a slot ─────────────────────────── */
function SlotPicker({
  slot, products, selected, onSelect,
}: {
  slot: Slot;
  products: Product[];
  selected: string | null;
  onSelect: (productId: string) => void;
}) {
  const available = products.filter(p =>
    slot.allowed_categories.some(c => c === p.category || c === p.subcategory)
  );

  return (
    <div className="mb-6">
      <p className="font-display text-[0.58rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.50)] mb-3">{slot.label}</p>
      {available.length === 0 ? (
        <p className="font-body font-light text-[rgba(245,237,224,0.30)] text-sm">No products available for this slot.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {available.map(p => {
            const lbl = productLabel(p);
            const isSelected = selected === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                className={[
                  "text-left border rounded-[5px] overflow-hidden transition-all duration-200 focus-visible:outline-none",
                  isSelected
                    ? "border-brass bg-[rgba(196,163,115,0.07)]"
                    : "border-[rgba(196,163,115,0.15)] hover:border-[rgba(196,163,115,0.35)]",
                ].join(" ")}
              >
                <div className="relative w-full aspect-square bg-[#1e0716]">
                  {p.image_url ? (
                    <Image src={p.image_url} alt={p.name} fill className="object-cover" sizes="140px" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-display text-[0.3rem] text-[rgba(196,163,115,0.18)]">D</span>
                    </div>
                  )}
                </div>
                <div className="px-2.5 py-2">
                  <p className="font-display text-ivory text-[0.68rem] leading-tight" style={{ letterSpacing: "0.04em" }}>{p.name}</p>
                  {lbl && <p className="font-body font-light text-[rgba(245,237,224,0.38)] text-[0.64rem] mt-0.5 truncate">{lbl}</p>}
                  {isSelected && <p className="font-display text-[0.42rem] tracking-[0.12em] uppercase text-brass mt-1">Chosen</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────── */
export default function HampersPage() {
  const router = useRouter();
  const { addItem } = useCart();

  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(true);

  /* Data from API */
  const [tiers, setTiers]   = useState<Tier[]>([]);
  const [boxes, setBoxes]   = useState<Box[]>([]);
  const [slots, setSlots]   = useState<Slot[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  /* Selections */
  const [tierId,     setTierId]     = useState<string | null>(null);
  const [boxId,      setBoxId]      = useState<string | null>(null);
  const [slotPicks,  setSlotPicks]  = useState<Record<string, string>>({}); // slotId → productId
  const [giftMsg,    setGiftMsg]    = useState("");
  const [hidePrices, setHidePrices] = useState(false);

  const [validating, setValidating] = useState(false);
  const [validErr,   setValidErr]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/hampers/data")
      .then(r => r.json())
      .then((d: { tiers: Tier[]; boxes: Box[]; slots: Slot[] }) => {
        setTiers(d.tiers ?? []);
        setBoxes(d.boxes ?? []);
        setSlots(d.slots ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const selectedTier = tiers.find(t => t.id === tierId);
  const selectedBox  = boxes.find(b => b.id === boxId);
  const tierSlots    = slots.filter(s => s.tier_id === tierId).sort((a, b) => a.sort_order - b.sort_order);

  /* Fetch products when reaching step 2 */
  useEffect(() => {
    if (step !== 2 || !tierId || tierSlots.length === 0) return;
    const cats = Array.from(new Set(tierSlots.flatMap(s => s.allowed_categories)));
    if (cats.length === 0) return;
    fetch(`/api/hampers/products?categories=${encodeURIComponent(cats.join(","))}`)
      .then(r => r.json())
      .then((d: { products: Product[] }) => setProducts(d.products ?? []))
      .catch(() => {});
  }, [step, tierId, tierSlots.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const allSlotsFilled = tierSlots.every(s => !!slotPicks[s.id]);

  const handleSlotPick = useCallback((slotId: string, productId: string) => {
    setSlotPicks(prev => ({ ...prev, [slotId]: productId }));
  }, []);

  async function handleAddToCart() {
    if (!selectedTier || !selectedBox || !allSlotsFilled) return;
    setValidating(true);
    setValidErr(null);

    const productIds = Object.values(slotPicks);
    const res = await fetch("/api/hampers/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds }),
    }).catch(() => null);

    if (!res || !res.ok) {
      setValidating(false);
      setValidErr("Could not verify stock. Please try again.");
      return;
    }
    const { ok, outOfStock } = await res.json() as { ok: boolean; outOfStock: { id: string; name: string }[] };
    if (!ok) {
      setValidating(false);
      setValidErr(`Some items are no longer in stock: ${outOfStock.map(p => p.name).join(", ")}. Please go back and choose alternatives.`);
      return;
    }

    /* Build the hamper cart item */
    const selections: HamperSelection[] = tierSlots.map(slot => {
      const pid = slotPicks[slot.id];
      const p   = products.find(pr => pr.id === pid)!;
      return {
        slotId:       slot.id,
        slotLabel:    slot.label,
        productId:    p.id,
        productName:  p.name,
        productLabel: productLabel(p),
        imageUrl:     p.image_url,
      };
    });

    const hamperComponents = tierSlots.flatMap(slot => {
      const pid = slotPicks[slot.id];
      return [{ id: pid, quantity: slot.quantity }];
    });

    const item: HamperCartItem = {
      kind:             "hamper",
      id:               crypto.randomUUID(),
      tierId:           selectedTier.id,
      tierName:         selectedTier.name,
      boxId:            selectedBox.id,
      boxName:          selectedBox.name,
      price:            selectedTier.price,
      quantity:         1,
      imageUrl:         selectedBox.image_url,
      giftMessage:      giftMsg.trim(),
      hidePrices,
      selections,
      hamperComponents,
    };

    addItem(item);
    setValidating(false);
    router.push("/cart");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black-plum flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black-plum pb-24">
      <div className="pt-24 max-w-2xl mx-auto px-6">

        {/* Hero */}
        <div className="mb-10 text-center">
          <p className="font-display text-[0.52rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.38)] mb-3">Dhyom</p>
          <h1 className="font-display text-ivory mb-3" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", letterSpacing: "0.05em" }}>Gift Hampers</h1>
          <div className="w-8 h-px bg-[rgba(196,163,115,0.22)] mx-auto mb-4" />
          <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-[0.95rem] leading-relaxed max-w-sm mx-auto">
            Curate a meaningful hamper — choose a tier, select a box design, and personalise every slot.
          </p>
        </div>

        <StepDots current={step} />

        {/* ── Step 0: Choose tier ── */}
        {step === 0 && (
          <div>
            <p className="font-display text-[0.56rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.45)] mb-5">Choose a Hamper Tier</p>
            <div className="flex flex-col gap-3 mb-8">
              {tiers.map(t => (
                <TierCard key={t.id} tier={t} selected={tierId === t.id} onSelect={() => setTierId(t.id)} />
              ))}
            </div>
            <button
              type="button"
              disabled={!tierId}
              onClick={() => setStep(1)}
              className="w-full font-display text-[0.62rem] tracking-[0.22em] uppercase text-brass border border-[rgba(196,163,115,0.35)] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.55)] disabled:opacity-30 disabled:cursor-not-allowed rounded-[3px] py-3.5 transition-all duration-200 active:scale-[0.98]"
            >
              Next — Choose Box
            </button>
          </div>
        )}

        {/* ── Step 1: Choose box ── */}
        {step === 1 && (
          <div>
            <p className="font-display text-[0.56rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.45)] mb-5">Choose a Box Design</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {boxes.map(b => (
                <BoxCard key={b.id} box={b} selected={boxId === b.id} onSelect={() => setBoxId(b.id)} />
              ))}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(0)} className="flex-1 font-display text-[0.58rem] tracking-[0.18em] uppercase text-[rgba(245,237,224,0.40)] border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.35)] rounded-[3px] py-3.5 transition-all duration-200">
                Back
              </button>
              <button
                type="button"
                disabled={!boxId}
                onClick={() => setStep(2)}
                className="flex-2 flex-1 font-display text-[0.62rem] tracking-[0.22em] uppercase text-brass border border-[rgba(196,163,115,0.35)] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.55)] disabled:opacity-30 disabled:cursor-not-allowed rounded-[3px] py-3.5 transition-all duration-200 active:scale-[0.98]"
              >
                Next — Fill Slots
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Fill slots ── */}
        {step === 2 && (
          <div>
            <p className="font-display text-[0.56rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.45)] mb-5">Choose Your Items</p>
            {tierSlots.map(slot => (
              <SlotPicker
                key={slot.id}
                slot={slot}
                products={products}
                selected={slotPicks[slot.id] ?? null}
                onSelect={(pid) => handleSlotPick(slot.id, pid)}
              />
            ))}
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setStep(1)} className="flex-1 font-display text-[0.58rem] tracking-[0.18em] uppercase text-[rgba(245,237,224,0.40)] border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.35)] rounded-[3px] py-3.5 transition-all duration-200">
                Back
              </button>
              <button
                type="button"
                disabled={!allSlotsFilled}
                onClick={() => setStep(3)}
                className="flex-1 font-display text-[0.62rem] tracking-[0.22em] uppercase text-brass border border-[rgba(196,163,115,0.35)] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.55)] disabled:opacity-30 disabled:cursor-not-allowed rounded-[3px] py-3.5 transition-all duration-200 active:scale-[0.98]"
              >
                Next — Gift Message
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Gift message ── */}
        {step === 3 && (
          <div>
            <p className="font-display text-[0.56rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.45)] mb-5">Gift Message (Optional)</p>
            <textarea
              value={giftMsg}
              onChange={e => setGiftMsg(e.target.value)}
              maxLength={200}
              rows={4}
              placeholder="Write a personal message for the recipient…"
              className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.20)] focus:border-[rgba(196,163,115,0.48)] rounded-[3px] px-4 py-3 font-body font-light text-ivory text-[0.95rem] placeholder:text-[rgba(245,237,224,0.20)] focus:outline-none transition-colors duration-150 resize-none mb-2"
            />
            <p className="font-body font-light text-[rgba(245,237,224,0.25)] text-[0.74rem] mb-5">{giftMsg.length}/200</p>
            <label className="flex items-center gap-3 cursor-pointer group mb-8">
              <input type="checkbox" checked={hidePrices} onChange={e => setHidePrices(e.target.checked)} className="sr-only" />
              <div aria-hidden="true" className={["w-4 h-4 rounded-[2px] border flex-shrink-0 flex items-center justify-center transition-all duration-150", hidePrices ? "bg-brass border-brass" : "border-[rgba(196,163,115,0.28)] group-hover:border-[rgba(196,163,115,0.55)]"].join(" ")}>
                {hidePrices && <svg width="8" height="6" viewBox="0 0 8 6" fill="none" stroke="#12060e" strokeWidth="1.5"><path d="M1 3l2 2 4-4" /></svg>}
              </div>
              <span className="font-body font-light text-[rgba(245,237,224,0.55)] text-[0.88rem] group-hover:text-ivory transition-colors duration-150">
                This is a gift — hide prices on the packing slip
              </span>
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="flex-1 font-display text-[0.58rem] tracking-[0.18em] uppercase text-[rgba(245,237,224,0.40)] border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.35)] rounded-[3px] py-3.5 transition-all duration-200">
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 font-display text-[0.62rem] tracking-[0.22em] uppercase text-brass border border-[rgba(196,163,115,0.35)] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.55)] rounded-[3px] py-3.5 transition-all duration-200 active:scale-[0.98]"
              >
                Review Order
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Review + add to cart ── */}
        {step === 4 && selectedTier && selectedBox && (
          <div>
            <p className="font-display text-[0.56rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.45)] mb-5">Review Your Hamper</p>

            <div className="border border-[rgba(196,163,115,0.18)] rounded-[6px] overflow-hidden mb-6">
              {/* Box image */}
              <div className="relative w-full h-44 bg-[#1e0716]">
                {selectedBox.image_url && (
                  <Image src={selectedBox.image_url} alt={selectedBox.name} fill className="object-cover" sizes="100vw" />
                )}
              </div>
              <div className="p-5">
                <div className="flex justify-between items-baseline mb-3">
                  <div>
                    <p className="font-display text-[0.52rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.42)] mb-1">{selectedBox.name}</p>
                    <p className="font-display text-ivory" style={{ fontSize: "1.05rem", letterSpacing: "0.05em" }}>{selectedTier.name}</p>
                  </div>
                  <p className="font-display text-brass" style={{ fontSize: "1.15rem", letterSpacing: "0.04em" }}>₹{selectedTier.price.toLocaleString("en-IN")}</p>
                </div>
                <div className="h-px bg-[rgba(196,163,115,0.12)] my-3" />
                <p className="font-display text-[0.50rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.38)] mb-2">Contents</p>
                {tierSlots.map(slot => {
                  const p = products.find(pr => pr.id === slotPicks[slot.id]);
                  return (
                    <div key={slot.id} className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 relative flex-shrink-0 rounded-[3px] overflow-hidden bg-[#270b1b]">
                        {p?.image_url && <Image src={p.image_url} alt={p.name} fill className="object-cover" sizes="32px" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-[rgba(245,237,224,0.65)] text-[0.78rem] truncate">{p?.name}</p>
                        {p && productLabel(p) && <p className="font-body font-light text-[rgba(245,237,224,0.32)] text-[0.68rem] truncate">{productLabel(p)}</p>}
                      </div>
                      <span className="font-display text-[0.46rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.35)] flex-shrink-0">{slot.label}</span>
                    </div>
                  );
                })}
                {giftMsg && (
                  <>
                    <div className="h-px bg-[rgba(196,163,115,0.12)] my-3" />
                    <p className="font-display text-[0.50rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.38)] mb-1">Gift Message</p>
                    <p className="font-body font-light italic text-[rgba(245,237,224,0.42)] text-[0.82rem] leading-relaxed">&ldquo;{giftMsg}&rdquo;</p>
                  </>
                )}
                {hidePrices && (
                  <p className="mt-3 font-body font-light text-[rgba(196,163,115,0.38)] text-[0.74rem]">Prices hidden on packing slip.</p>
                )}
              </div>
            </div>

            {validErr && (
              <p className="mb-4 font-body font-light text-[rgba(210,80,80,0.75)] text-[0.82rem]">{validErr}</p>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(3)} className="flex-1 font-display text-[0.58rem] tracking-[0.18em] uppercase text-[rgba(245,237,224,0.40)] border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.35)] rounded-[3px] py-3.5 transition-all duration-200">
                Back
              </button>
              <button
                type="button"
                disabled={validating}
                onClick={handleAddToCart}
                className="flex-1 font-display text-[0.62rem] tracking-[0.22em] uppercase text-brass border border-[rgba(196,163,115,0.35)] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.55)] disabled:opacity-60 disabled:cursor-not-allowed rounded-[3px] py-3.5 transition-all duration-200 active:scale-[0.98]"
              >
                {validating ? "Checking…" : "Add to Cart"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
