"use client";

import { useState } from "react";

interface Props {
  subcategory: string;
  onClose: () => void;
}

export default function BulkGiftingModal({ subcategory, onClose }: Props) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", num_boxes: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.num_boxes.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bulk-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, subcategory }),
      });
      if (!res.ok) throw new Error("failed");
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again or WhatsApp us.");
    } finally {
      setSubmitting(false);
    }
  }

  const INPUT = "w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.18)] hover:border-[rgba(196,163,115,0.32)] focus:border-[rgba(196,163,115,0.55)] rounded-[3px] px-3 py-2.5 font-body font-light text-[rgba(245,237,224,0.80)] text-sm focus:outline-none transition-colors placeholder:text-[rgba(245,237,224,0.18)]";
  const LABEL = "block font-display text-[0.40rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.55)] mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-[#1a0a12] border border-[rgba(196,163,115,0.22)] rounded-[6px] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[rgba(245,237,224,0.30)] hover:text-[rgba(245,237,224,0.70)] transition-colors text-lg leading-none"
        >
          ×
        </button>

        {done ? (
          <div className="py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-[rgba(100,215,100,0.10)] border border-[rgba(100,215,100,0.28)] flex items-center justify-center mx-auto mb-4">
              <span className="text-[rgba(100,215,100,0.80)] text-lg">✓</span>
            </div>
            <p className="font-display text-ivory mb-2" style={{ letterSpacing: "0.04em" }}>Inquiry Received</p>
            <p className="font-body font-light text-[rgba(245,237,224,0.45)] text-sm">
              Thank you! We&apos;ll reach out within 24 hours to discuss your bulk order.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 font-display text-[0.44rem] tracking-[0.16em] uppercase text-brass border border-[rgba(196,163,115,0.35)] hover:bg-[rgba(196,163,115,0.08)] px-5 py-2 rounded-[3px] transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <p className="font-display text-ivory mb-1" style={{ fontSize: "0.92rem", letterSpacing: "0.04em" }}>Bulk Gifting Enquiry</p>
            <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-sm mb-6">
              Tell us what you need — we&apos;ll get back to you with pricing and timelines.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => set("name", e.target.value)}
                    placeholder="Your name"
                    className={INPUT}
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className={LABEL}>Number of Boxes *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.num_boxes}
                    onChange={e => set("num_boxes", e.target.value)}
                    placeholder="e.g. 50"
                    className={INPUT}
                  />
                </div>
              </div>

              <div>
                <label className={LABEL}>Phone *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className={INPUT}
                  autoComplete="tel"
                />
              </div>

              <div>
                <label className={LABEL}>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                  placeholder="you@company.com"
                  className={INPUT}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className={LABEL}>Additional Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => set("notes", e.target.value)}
                  placeholder="Custom branding, delivery date, specific products…"
                  className={`${INPUT} resize-none`}
                />
              </div>

              {error && (
                <p className="font-body text-[rgba(220,80,80,0.80)] text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full font-display text-[0.50rem] tracking-[0.18em] uppercase bg-[rgba(196,163,115,0.10)] border border-[rgba(196,163,115,0.40)] hover:bg-[rgba(196,163,115,0.18)] hover:border-brass text-brass py-3 rounded-[3px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              >
                {submitting ? "Sending…" : "Submit Enquiry →"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
