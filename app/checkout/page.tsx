"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart/CartContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/funnel/track";

type SavedAddress = {
  id: string; label?: string; customer_name: string; phone?: string;
  street: string; city: string; state: string; pincode: string; is_default: boolean;
};

const DEFAULT_SHIPPING = 99;
const DEFAULT_FREE_THRESHOLD = 999;
const COD_FEE = 10;

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu","Delhi",
  "Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

declare global {
  interface Window { Razorpay: new (opts: RzpOptions) => { open(): void }; }
}
interface RzpOptions {
  key: string; amount: number; currency: string; name: string; description: string;
  order_id: string; prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler(r: RzpSuccess): void;
  modal: { ondismiss(): void };
}
interface RzpSuccess { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string; }

interface CheckoutForm {
  firstName: string; lastName: string; email: string; phone: string;
  street: string; city: string; state: string; pincode: string;
  notes: string;
}
type FormErrors = Partial<Record<keyof CheckoutForm, string>>;

const BLANK: CheckoutForm = {
  firstName: "", lastName: "", email: "", phone: "",
  street: "", city: "", state: "", pincode: "", notes: "",
};

function generateOrderNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `DHYOM-${s}`;
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function validate(f: CheckoutForm): FormErrors {
  const e: FormErrors = {};
  if (!f.firstName.trim()) e.firstName = "First name is required.";
  if (!f.lastName.trim()) e.lastName = "Last name is required.";
  if (!f.email.trim()) { e.email = "Email address is required."; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { e.email = "Enter a valid email address."; }
  if (!f.phone.trim()) { e.phone = "Phone number is required."; }
  else if (!/^\d{10}$/.test(f.phone.replace(/\s/g, ""))) { e.phone = "Enter a valid 10-digit number."; }
  if (!f.street.trim()) e.street = "Street address is required.";
  if (!f.city.trim()) e.city = "City is required.";
  if (!f.state) e.state = "Please select a state.";
  if (!f.pincode.trim()) { e.pincode = "Pincode is required."; }
  else if (!/^\d{6}$/.test(f.pincode.trim())) { e.pincode = "Enter a valid 6-digit pincode."; }
  return e;
}

function StepHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <span className="w-6 h-6 rounded-full border border-[rgba(196,163,115,0.35)] flex items-center justify-center font-display text-brass flex-shrink-0" style={{ fontSize: "0.46rem", letterSpacing: "0.05em" }}>{num}</span>
      <h2 className="font-display text-ivory" style={{ fontSize: "0.78rem", letterSpacing: "0.14em" }}>{title}</h2>
    </div>
  );
}

const inputBase = "w-full bg-[rgba(245,237,224,0.04)] border rounded-[3px] px-4 py-3 font-body font-light text-ivory text-[0.95rem] placeholder:text-[rgba(245,237,224,0.20)] focus:outline-none transition-colors duration-150";
const inputNormal = `${inputBase} border-[rgba(196,163,115,0.20)] focus:border-[rgba(196,163,115,0.48)]`;
const inputError  = `${inputBase} border-[rgba(210,80,80,0.40)] focus:border-[rgba(210,80,80,0.60)]`;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-display text-[0.52rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">{label}</label>
      {children}
      {error && <p className="font-body font-light text-[rgba(205,75,75,0.68)] text-[0.76rem]">{error}</p>}
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, totalItems, hydrated, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();

  /* ── Step A state ── */
  const [step,        setStep]        = useState<"lead" | "form">("lead");
  const [leadEmail,   setLeadEmail]   = useState("");
  const [leadPhone,   setLeadPhone]   = useState("");
  const [leadError,   setLeadError]   = useState("");
  const [leadSaving,  setLeadSaving]  = useState(false);
  const [leadHoneypot, setLeadHoneypot] = useState("");

  /* ── Step B state ── */
  const [form,         setForm]         = useState<CheckoutForm>(BLANK);
  const [errors,       setErrors]       = useState<FormErrors>({});
  const [submitting,   setSubmitting]   = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentType,  setPaymentType]  = useState<"online" | "partial_cod">("online");

  const orderPlacedRef = useRef(false);

  /* ── Saved addresses (logged-in users) ── */
  const [savedAddresses,    setSavedAddresses]    = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("saved_addresses").select("*").eq("user_id", user.id)
      .order("is_default", { ascending: false }).order("created_at")
      .then(({ data }) => {
        const addrs = (data ?? []) as SavedAddress[];
        setSavedAddresses(addrs);
        const def = addrs.find((a) => a.is_default) ?? addrs[0];
        if (def) {
          setSelectedAddressId(def.id);
          setForm((prev) => ({
            ...prev,
            firstName: def.customer_name.split(" ")[0] ?? "",
            lastName:  def.customer_name.split(" ").slice(1).join(" ") ?? "",
            phone:     def.phone ?? prev.phone,
            street:    def.street,
            city:      def.city,
            state:     def.state,
            pincode:   def.pincode,
          }));
        }
      });
  }, [user]);

  /* Skip lead step for logged-in users — email already known */
  useEffect(() => {
    if (authLoading || !user || step !== "lead") return;
    const email = user.email ?? "";
    setLeadEmail(email);
    setForm((prev) => ({ ...prev, email }));
    trackEvent("checkout_started");
    void fetch("/api/checkout-started", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, phone: null, hp: "" }),
    });
    setStep("form");
  }, [user, authLoading, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const [shippingFee,           setShippingFee]           = useState(DEFAULT_SHIPPING);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(DEFAULT_FREE_THRESHOLD);

  useEffect(() => {
    fetch("/api/store-settings")
      .then(r => r.json())
      .then((d: { shipping_fee?: string; free_shipping_threshold?: string }) => {
        if (d.shipping_fee)            setShippingFee(Number(d.shipping_fee));
        if (d.free_shipping_threshold) setFreeShippingThreshold(Number(d.free_shipping_threshold));
      })
      .catch(() => {});
  }, []);

  const isFreeShip     = freeShippingThreshold > 0 && subtotal >= freeShippingThreshold;
  const shippingCost   = isFreeShip ? 0 : shippingFee;
  const codFeeApplied  = paymentType === "partial_cod" ? COD_FEE : 0;
  const fullPaymentTotal = subtotal + shippingCost;
  const total          = fullPaymentTotal + codFeeApplied;
  // For partial COD: charge exactly 50% online, rest on delivery
  const amountToCharge       = paymentType === "partial_cod" ? Math.round(total / 2) : total;
  const amountDueCod         = paymentType === "partial_cod" ? total - amountToCharge : 0;
  // Stable preview for the radio label (computed regardless of selection)
  const partialCodBaseTotal  = subtotal + shippingCost + COD_FEE;
  const partialCodPreviewNow = Math.round(partialCodBaseTotal / 2);

  useEffect(() => {
    if (hydrated && items.length === 0 && !orderPlacedRef.current) router.replace("/cart");
  }, [hydrated, items.length, router]);

  /* ── Step A: capture lead ── */
  async function handleLeadSubmit(e: FormEvent) {
    e.preventDefault();
    const email = leadEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLeadError("Please enter a valid email address.");
      return;
    }
    if (leadHoneypot) { setLeadSaving(false); setStep("form"); return; } // silent bot drop
    setLeadSaving(true);
    // Save to contacts before proceeding — fire-and-forget, never block UX
    void fetch("/api/checkout-started", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, phone: leadPhone.trim() || null, hp: leadHoneypot }),
    });
    trackEvent("checkout_started");
    setForm((prev) => ({ ...prev, email, phone: leadPhone.trim() }));
    setLeadSaving(false);
    setStep("form");
  }

  /* ── Step B: place order ── */
  function set(field: keyof CheckoutForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      document.querySelector<HTMLElement>("[data-err]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    setPaymentError(null);

    const orderNumber = generateOrderNumber();
    const base = {
      order_number: orderNumber,
      customer_id: user?.id ?? null,
      customer_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: `${form.street.trim()}, ${form.city.trim()}, ${form.state} - ${form.pincode.trim()}`,
      shipping_street: form.street.trim(),
      shipping_city: form.city.trim(),
      shipping_state: form.state,
      shipping_pincode: form.pincode.trim(),
      order_notes: form.notes.trim() || null,
      items: JSON.parse(JSON.stringify(items)),
      subtotal,
      shipping_fee: shippingCost,
      discount: 0,
      total,
      payment_method: "online",
      payment_type: paymentType,
      cod_convenience_fee: codFeeApplied,
      amount_paid_online: amountToCharge,
      amount_due_cod: amountDueCod,
      order_status: "pending",
    };

    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountToCharge, orderNumber }),
      });
      if (!res.ok) { const body = await res.json(); throw new Error(body.error ?? "Failed to create payment order"); }
      const { razorpayOrderId } = await res.json();
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("gateway-unavailable");

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: Math.round(amountToCharge * 100),
        currency: "INR",
        name: "Dhyom",
        description: "Sacred Home & Pooja Décor",
        order_id: razorpayOrderId,
        prefill: { name: `${form.firstName.trim()} ${form.lastName.trim()}`, email: form.email.trim(), contact: form.phone.trim() },
        theme: { color: "#3D1428" },
        handler: async (response: RzpSuccess) => {
          // Verify signature server-side and insert order via service role —
          // prevents fake "payment completed" calls that bypass Razorpay.
          const verifyRes = await fetch("/api/verify-payment", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              base,
              amountToCharge,
              notifyData: {
                orderNumber,
                customerName: base.customer_name,
                phone: base.phone,
                email: base.email,
                address: base.address,
                items: base.items,
                total: base.total,
                paymentStatus: paymentType === "partial_cod" ? "Partial COD (50% paid online)" : "Paid (Razorpay)",
                paymentType,
                amountPaidOnline: amountToCharge,
                amountDueCod,
              },
            }),
          });
          if (!verifyRes.ok) {
            setPaymentError(`Payment received (ID: ${response.razorpay_payment_id}) but the order record could not be saved. Please contact us with this reference.`);
            setSubmitting(false);
            return;
          }
          trackEvent("purchase_completed");
          orderPlacedRef.current = true;
          clearCart();
          router.push(`/checkout/offer/${orderNumber}`);
        },
        modal: {
          ondismiss: () => {
            setPaymentError("Payment was not completed. Your cart is saved — you can try again when ready.");
            setSubmitting(false);
          },
        },
      });
      rzp.open();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setPaymentError(
        msg === "gateway-unavailable"
          ? "The payment gateway is temporarily unavailable. Please try again shortly."
          : "Unable to initiate payment. Please try again."
      );
      setSubmitting(false);
    }
  }

  /* ── Loading guard ── */
  if (!hydrated || (items.length === 0 && !orderPlacedRef.current)) {
    return (
      <div className="min-h-screen bg-black-plum flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
      </div>
    );
  }

  /* ══ Step A — Lead capture ═══════════════════════════════ */
  if (step === "lead") {
    return (
      <div className="min-h-screen bg-black-plum">
        <div className="pt-28 pb-20 max-w-md mx-auto px-6">
          <div className="mb-10">
            <p className="font-display text-[0.56rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.38)] mb-3">Checkout</p>
            <h1 className="font-display text-ivory" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", letterSpacing: "0.05em" }}>
              Begin your order
            </h1>
            <div className="mt-4 w-10 h-px bg-[rgba(196,163,115,0.22)]" />
            <p className="mt-5 font-body font-light italic text-[rgba(245,237,224,0.38)] text-[0.95rem] leading-[1.85]">
              We&rsquo;ll hold your place while you fill in the details.
            </p>
          </div>

          <form onSubmit={handleLeadSubmit} noValidate className="flex flex-col gap-6">
            <Field label="Email Address" error={leadError}>
              <input
                type="email"
                value={leadEmail}
                onChange={(e) => { setLeadEmail(e.target.value); setLeadError(""); }}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                className={leadError ? inputError : inputNormal}
                data-err={leadError ? "1" : undefined}
              />
            </Field>

            <Field label="Phone (optional)" error={undefined}>
              <input
                type="tel"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile number"
                autoComplete="tel"
                maxLength={10}
                className={inputNormal}
              />
            </Field>

            {/* Honeypot — invisible to humans, bots will fill it */}
            <input
              type="text"
              value={leadHoneypot}
              onChange={(e) => setLeadHoneypot(e.target.value)}
              autoComplete="off"
              tabIndex={-1}
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}
            />

            <button
              type="submit"
              disabled={leadSaving}
              className="w-full flex items-center justify-center gap-2.5 font-display text-[0.65rem] tracking-[0.22em] uppercase text-brass border border-[rgba(196,163,115,0.40)] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.60)] rounded-[3px] py-4 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {leadSaving ? "···" : "Continue"}
              <svg width="13" height="10" viewBox="0 0 13 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 5h11M7.5 1l4 4-4 4" /></svg>
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link href="/cart" className="font-display text-[0.52rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.35)] hover:text-[rgba(196,163,115,0.62)] transition-colors duration-200">
              ← Back to Cart
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ══ Step B — Full form ══════════════════════════════════ */
  const submitLabel = submitting
    ? "Processing..."
    : paymentType === "partial_cod"
      ? `Pay ₹${amountToCharge.toLocaleString("en-IN")} Now — Order Total ₹${total.toLocaleString("en-IN")}`
      : `Place Order — ₹${total.toLocaleString("en-IN")}`;

  return (
    <div className="min-h-screen bg-black-plum">
      <div className="pt-24 pb-20 max-w-6xl mx-auto px-6">

        <div className="mb-10">
          <p className="font-display text-[0.56rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.38)] mb-3">Almost there</p>
          <h1 className="font-display text-ivory" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", letterSpacing: "0.05em" }}>Checkout</h1>
          <div className="mt-4 w-10 h-px bg-[rgba(196,163,115,0.22)]" />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-14 items-start">

            <div className="flex-1 min-w-0 flex flex-col gap-10">

              {/* 1. Contact */}
              <section>
                <StepHeader num="1" title="Contact Information" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="First Name" error={errors.firstName}>
                    <input type="text" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Aarav" autoComplete="given-name" className={errors.firstName ? inputError : inputNormal} data-err={errors.firstName ? "1" : undefined} />
                  </Field>
                  <Field label="Last Name" error={errors.lastName}>
                    <input type="text" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Sharma" autoComplete="family-name" className={errors.lastName ? inputError : inputNormal} />
                  </Field>
                  <Field label="Email" error={errors.email}>
                    <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" autoComplete="email" className={errors.email ? inputError : inputNormal} />
                  </Field>
                  <Field label="Phone" error={errors.phone}>
                    <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))} placeholder="10-digit mobile number" autoComplete="tel" maxLength={10} className={errors.phone ? inputError : inputNormal} />
                  </Field>
                </div>
              </section>

              <div className="h-px bg-[rgba(196,163,115,0.10)]" />

              {/* 2. Shipping */}
              <section>
                <StepHeader num="2" title="Shipping Address" />

                {/* Saved address picker (logged-in only) */}
                {savedAddresses.length > 0 && (
                  <div className="mb-5 flex flex-col gap-2">
                    <p className="font-display text-[0.52rem] tracking-[0.20em] uppercase text-[rgba(196,163,115,0.45)] mb-1">Saved Addresses</p>
                    {savedAddresses.map((a) => (
                      <label
                        key={a.id}
                        className={`flex items-start gap-3 px-4 py-3 rounded-[4px] border cursor-pointer transition-colors duration-150 ${selectedAddressId === a.id ? "border-[rgba(196,163,115,0.45)] bg-[rgba(196,163,115,0.06)]" : "border-[rgba(196,163,115,0.16)] hover:border-[rgba(196,163,115,0.28)]"}`}
                      >
                        <input
                          type="radio"
                          name="savedAddress"
                          checked={selectedAddressId === a.id}
                          onChange={() => {
                            setSelectedAddressId(a.id);
                            setForm((prev) => ({
                              ...prev,
                              firstName: a.customer_name.split(" ")[0] ?? "",
                              lastName:  a.customer_name.split(" ").slice(1).join(" ") ?? "",
                              phone:     a.phone ?? prev.phone,
                              street:    a.street,
                              city:      a.city,
                              state:     a.state,
                              pincode:   a.pincode,
                            }));
                          }}
                          className="mt-0.5 accent-[#C4A373]"
                        />
                        <div>
                          {a.label && <p className="font-display text-[0.50rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.50)]">{a.label}</p>}
                          <p className="font-body font-light text-ivory text-[0.88rem]">{a.customer_name}</p>
                          <p className="font-body font-light text-[rgba(245,237,224,0.45)] text-[0.82rem]">{a.street}, {a.city} — {a.pincode}</p>
                        </div>
                      </label>
                    ))}
                    <label
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-[4px] border cursor-pointer transition-colors duration-150 ${selectedAddressId === null ? "border-[rgba(196,163,115,0.45)] bg-[rgba(196,163,115,0.06)]" : "border-[rgba(196,163,115,0.16)] hover:border-[rgba(196,163,115,0.28)]"}`}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        checked={selectedAddressId === null}
                        onChange={() => { setSelectedAddressId(null); setForm((prev) => ({ ...prev, street: "", city: "", state: "", pincode: "" })); }}
                        className="accent-[#C4A373]"
                      />
                      <span className="font-body font-light text-[rgba(245,237,224,0.55)] text-[0.88rem]">Use a different address</span>
                    </label>
                    <div className="h-px bg-[rgba(196,163,115,0.10)] mt-1 mb-2" />
                  </div>
                )}

                <div className="flex flex-col gap-5">
                  <Field label="Street Address" error={errors.street}>
                    <input type="text" value={form.street} onChange={(e) => set("street", e.target.value)} placeholder="Flat / house / block, street, area" autoComplete="street-address" className={errors.street ? inputError : inputNormal} />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="City" error={errors.city}>
                      <input type="text" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Mumbai" autoComplete="address-level2" className={errors.city ? inputError : inputNormal} />
                    </Field>
                    <Field label="State" error={errors.state}>
                      <select value={form.state} onChange={(e) => set("state", e.target.value)} className={[(errors.state ? inputError : inputNormal), "appearance-none cursor-pointer", !form.state ? "text-[rgba(245,237,224,0.20)]" : ""].join(" ")}>
                        <option value="" disabled>Select state</option>
                        {INDIAN_STATES.map((s) => <option key={s} value={s} className="bg-damson text-ivory">{s}</option>)}
                      </select>
                    </Field>
                    <Field label="Pincode" error={errors.pincode}>
                      <input type="text" value={form.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} placeholder="400001" autoComplete="postal-code" maxLength={6} className={errors.pincode ? inputError : inputNormal} />
                    </Field>
                  </div>
                  <Field label="Order Notes (optional)" error={undefined}>
                    <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Special delivery instructions, gift messages..." rows={3} className={`${inputNormal} resize-none`} />
                  </Field>
                </div>
              </section>

              <div className="h-px bg-[rgba(196,163,115,0.10)]" />

              {/* 3. Payment */}
              <section>
                <StepHeader num="3" title="Payment" />
                <div className="flex flex-col gap-3">

                  {/* Pay in Full */}
                  <label className={`flex items-start gap-4 px-5 py-4 rounded-[4px] border cursor-pointer transition-colors duration-150 ${paymentType === "online" ? "border-[rgba(196,163,115,0.45)] bg-[rgba(196,163,115,0.06)]" : "border-[rgba(196,163,115,0.18)] bg-transparent hover:border-[rgba(196,163,115,0.28)]"}`}>
                    <input type="radio" name="paymentType" value="online" checked={paymentType === "online"} onChange={() => setPaymentType("online")} className="mt-1 accent-[#C4A373]" />
                    <div className="flex-1">
                      <p className="font-display text-ivory" style={{ fontSize: "0.72rem", letterSpacing: "0.10em" }}>Pay in Full</p>
                      <p className="font-body font-light text-[rgba(245,237,224,0.42)] text-[0.80rem] mt-0.5">Pay the full amount now via Razorpay. UPI, cards, net banking.</p>
                    </div>
                    <span className="font-display text-brass text-[0.80rem] flex-shrink-0">₹{fullPaymentTotal.toLocaleString("en-IN")}</span>
                  </label>

                  {/* 50/50 Partial COD */}
                  <label className={`flex items-start gap-4 px-5 py-4 rounded-[4px] border cursor-pointer transition-colors duration-150 ${paymentType === "partial_cod" ? "border-[rgba(196,163,115,0.45)] bg-[rgba(196,163,115,0.06)]" : "border-[rgba(196,163,115,0.18)] bg-transparent hover:border-[rgba(196,163,115,0.28)]"}`}>
                    <input type="radio" name="paymentType" value="partial_cod" checked={paymentType === "partial_cod"} onChange={() => setPaymentType("partial_cod")} className="mt-1 accent-[#C4A373]" />
                    <div className="flex-1">
                      <p className="font-display text-ivory" style={{ fontSize: "0.72rem", letterSpacing: "0.10em" }}>Pay 50% Now, 50% on Delivery</p>
                      <p className="font-body font-light text-[rgba(245,237,224,0.42)] text-[0.80rem] mt-0.5 leading-[1.7]">
                        Pay half online now, and the remaining half in cash when your order arrives.
                        A convenience fee of ₹{COD_FEE} applies, covering additional handling for split payments.
                      </p>
                    </div>
                    <span className="font-display text-brass text-[0.80rem] flex-shrink-0 whitespace-nowrap">₹{partialCodPreviewNow.toLocaleString("en-IN")} now</span>
                  </label>

                </div>
              </section>

              {paymentError && (
                <div className="bg-[rgba(196,163,115,0.05)] border border-[rgba(196,163,115,0.16)] rounded-[4px] px-5 py-4">
                  <p className="font-body font-light text-[rgba(245,237,224,0.62)] text-[0.88rem] leading-[1.75]">{paymentError}</p>
                </div>
              )}

              <button type="submit" disabled={submitting} className="lg:hidden w-full flex items-center justify-center gap-2.5 font-display text-[0.65rem] tracking-[0.22em] uppercase text-brass border border-[rgba(196,163,115,0.40)] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.60)] rounded-[3px] py-4 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {submitLabel}
              </button>
            </div>

            {/* Right: order review */}
            <div className="w-full lg:w-[340px] xl:w-[370px] flex-shrink-0 lg:sticky lg:top-24">
              <div className="bg-damson border border-[rgba(196,163,115,0.14)] rounded-[6px] overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-[rgba(196,163,115,0.10)]">
                  <h2 className="font-display text-ivory" style={{ fontSize: "0.78rem", letterSpacing: "0.1em" }}>Order Review</h2>
                  <p className="font-display text-[0.48rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.38)] mt-1">{totalItems} {totalItems === 1 ? "item" : "items"}</p>
                </div>
                <div className="divide-y divide-[rgba(196,163,115,0.08)]">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3.5 px-5 py-3.5">
                      <div className="w-11 h-11 flex-shrink-0 bg-[#270b1b] rounded-[3px] border border-[rgba(196,163,115,0.10)] flex items-center justify-center overflow-hidden relative">
                        {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="44px" /> : <span className="font-display text-[0.3rem] tracking-[0.1em] uppercase text-[rgba(196,163,115,0.18)]">D</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-ivory truncate leading-tight" style={{ fontSize: "0.78rem", letterSpacing: "0.04em" }}>{item.name}</p>
                        {item.label && <p className="font-display text-[0.44rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.38)] mt-0.5 truncate">{item.label}</p>}
                        <p className="font-body font-light text-[rgba(245,237,224,0.35)] text-[0.75rem] mt-0.5">Qty {item.quantity} · ₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-5 pt-4 pb-5 border-t border-[rgba(196,163,115,0.10)] flex flex-col gap-3">
                  <div className="flex justify-between items-baseline">
                    <span className="font-body font-light text-[rgba(245,237,224,0.48)] text-[0.87rem]">Subtotal</span>
                    <span className="font-display text-ivory" style={{ fontSize: "0.87rem", letterSpacing: "0.04em" }}>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-body font-light text-[rgba(245,237,224,0.48)] text-[0.87rem]">Shipping</span>
                    {isFreeShip ? (
                      <span className="font-display text-[rgba(100,215,100,0.80)]" style={{ fontSize: "0.87rem", letterSpacing: "0.04em" }}>FREE</span>
                    ) : (
                      <span className="font-display text-ivory" style={{ fontSize: "0.87rem", letterSpacing: "0.04em" }}>₹{shippingCost.toLocaleString("en-IN")}</span>
                    )}
                  </div>
                  {paymentType === "partial_cod" && (
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-baseline">
                        <span className="font-body font-light text-[rgba(245,237,224,0.48)] text-[0.87rem]">Partial COD fee</span>
                        <span className="font-display text-ivory" style={{ fontSize: "0.87rem", letterSpacing: "0.04em" }}>₹{COD_FEE}</span>
                      </div>
                      <p className="font-body font-light text-[rgba(245,237,224,0.28)] text-[0.70rem] leading-snug">
                        Covers additional handling for split payments.
                      </p>
                    </div>
                  )}
                  <div className="h-px bg-[rgba(196,163,115,0.12)]" />
                  <div className="flex justify-between items-baseline">
                    <span className="font-display text-ivory" style={{ fontSize: "0.85rem", letterSpacing: "0.08em" }}>Total</span>
                    <span className="font-display text-brass" style={{ fontSize: "1.1rem", letterSpacing: "0.04em" }}>₹{total.toLocaleString("en-IN")}</span>
                  </div>
                  {paymentType === "partial_cod" && (
                    <>
                      <div className="flex justify-between items-baseline">
                        <span className="font-body font-light text-[rgba(245,237,224,0.48)] text-[0.82rem]">Pay now (50%)</span>
                        <span className="font-display text-brass" style={{ fontSize: "0.87rem", letterSpacing: "0.04em" }}>₹{amountToCharge.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="font-body font-light text-[rgba(245,237,224,0.48)] text-[0.82rem]">Due on delivery</span>
                        <span className="font-display text-[rgba(245,237,224,0.65)]" style={{ fontSize: "0.87rem", letterSpacing: "0.04em" }}>₹{amountDueCod.toLocaleString("en-IN")}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="px-5 pb-5">
                  <button type="submit" disabled={submitting} className="hidden lg:flex w-full items-center justify-center gap-2.5 font-display text-[0.62rem] tracking-[0.22em] uppercase text-brass border border-[rgba(196,163,115,0.40)] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.60)] rounded-[3px] py-3.5 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitLabel}
                  </button>
                </div>
              </div>
              <Link href="/cart" className="mt-4 flex items-center gap-2 font-display text-[0.52rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.35)] hover:text-[rgba(196,163,115,0.62)] transition-colors duration-200">
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M9 4H1M4 1L1 4l3 3" /></svg>
                Back to Cart
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
