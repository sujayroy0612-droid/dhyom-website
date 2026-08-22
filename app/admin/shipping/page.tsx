"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-display text-[0.48rem] tracking-[0.20em] uppercase text-[rgba(196,163,115,0.55)]">
        {label}
      </label>
      {children}
      {hint && (
        <p className="font-body font-light text-[0.68rem] text-[rgba(245,237,224,0.30)]">{hint}</p>
      )}
    </div>
  );
}

const inputCls =
  "w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-4 py-2.5 font-body font-light text-[0.88rem] text-ivory placeholder:text-[rgba(245,237,224,0.22)] focus:outline-none focus:border-[rgba(196,163,115,0.50)] transition-colors";

export default function ShippingSettingsPage() {
  const [shippingFee,            setShippingFee]            = useState("");
  const [freeShippingThreshold,  setFreeShippingThreshold]  = useState("");
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/store-settings", {
      headers: { authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    if (res.ok) {
      const d = await res.json() as Record<string, string>;
      setShippingFee(d.shipping_fee ?? "80");
      setFreeShippingThreshold(d.free_shipping_threshold ?? "999");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    const fee       = Number(shippingFee);
    const threshold = Number(freeShippingThreshold);
    if (isNaN(fee) || fee < 0)            return setError("Shipping fee must be 0 or more.");
    if (isNaN(threshold) || threshold < 0) return setError("Free shipping threshold must be 0 or more.");

    setSaving(true);
    setError("");
    setSaved(false);

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/store-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ shipping_fee: fee, free_shipping_threshold: threshold }),
    });

    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const j = await res.json().catch(() => ({})) as { error?: string };
      setError(j.error ?? "Save failed");
    }
  }

  return (
    <div className="min-h-screen bg-[#12060e] pt-8 pb-16 px-8">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="font-display text-[0.50rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.38)] mb-2">
            Admin · Store Settings
          </p>
          <h1 className="font-display text-ivory" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", letterSpacing: "0.05em" }}>
            Shipping
          </h1>
          <div className="mt-4 w-10 h-px bg-[rgba(196,163,115,0.22)]" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
          </div>
        ) : (
          <div className="bg-[#1f0b17] border border-[rgba(196,163,115,0.10)] rounded-[6px] p-7 flex flex-col gap-6">

            <Field
              label="Flat Shipping Fee (₹)"
              hint="Applied to every order. Set to 0 for always-free shipping."
            >
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body text-[rgba(196,163,115,0.55)] text-[0.88rem]">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={shippingFee}
                  onChange={e => setShippingFee(e.target.value)}
                  className={inputCls + " pl-8"}
                />
              </div>
            </Field>

            <Field
              label="Free Shipping Above (₹)"
              hint="Orders at or above this amount get free shipping. Set to 0 to disable free-shipping threshold."
            >
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body text-[rgba(196,163,115,0.55)] text-[0.88rem]">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={freeShippingThreshold}
                  onChange={e => setFreeShippingThreshold(e.target.value)}
                  className={inputCls + " pl-8"}
                />
              </div>
            </Field>

            {/* Preview */}
            <div className="rounded-[4px] border border-[rgba(196,163,115,0.10)] bg-[rgba(196,163,115,0.04)] px-5 py-4">
              <p className="font-display text-[0.46rem] tracking-[0.20em] uppercase text-[rgba(196,163,115,0.40)] mb-3">Preview</p>
              {Number(freeShippingThreshold) > 0 ? (
                <>
                  <p className="font-body font-light text-[0.80rem] text-[rgba(245,237,224,0.55)] mb-1">
                    Orders below ₹{Number(freeShippingThreshold).toLocaleString("en-IN")} → shipping ₹{Number(shippingFee).toLocaleString("en-IN")}
                  </p>
                  <p className="font-body font-light text-[0.80rem] text-[rgba(100,215,100,0.70)]">
                    Orders ₹{Number(freeShippingThreshold).toLocaleString("en-IN")} and above → FREE shipping
                  </p>
                </>
              ) : (
                <p className="font-body font-light text-[0.80rem] text-[rgba(245,237,224,0.55)]">
                  All orders → shipping ₹{Number(shippingFee).toLocaleString("en-IN")} (no free-shipping threshold)
                </p>
              )}
            </div>

            {error && (
              <p className="font-body font-light text-[rgba(210,90,90,0.75)] text-[0.75rem]">{error}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="self-start font-display text-[0.50rem] tracking-[0.18em] uppercase rounded-[3px] px-8 py-3 border transition-all active:scale-[0.98] disabled:opacity-40 border-[rgba(196,163,115,0.42)] text-brass hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.65)]"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
            </button>
          </div>
        )}

        {/* Info box */}
        <div className="mt-6 rounded-[4px] border border-[rgba(196,163,115,0.08)] bg-[rgba(196,163,115,0.03)] px-5 py-4">
          <p className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.35)] mb-2">Note</p>
          <p className="font-body font-light text-[0.73rem] text-[rgba(245,237,224,0.35)] leading-relaxed">
            Changes take effect immediately on the cart and checkout pages.
            The announcement bar text is managed separately under Marketing → Announcement Bar.
          </p>
        </div>

      </div>
    </div>
  );
}
