"use client";

import { useState, FormEvent } from "react";

export default function FragranceGuidePage() {
  const [email, setEmail]       = useState("");
  const [status, setStatus]     = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res  = await fetch("/api/fragrance-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-black-plum flex flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-md mx-auto flex flex-col items-center text-center gap-8">

        {/* Wordmark */}
        <p
          className="font-display text-brass"
          style={{ fontSize: "0.62rem", letterSpacing: "0.35em", textTransform: "uppercase" }}
        >
          Dhyom
        </p>

        <div className="w-8 h-px bg-[rgba(196,163,115,0.30)]" />

        {/* Headline */}
        <h1
          className="font-display text-ivory"
          style={{ fontSize: "clamp(1.7rem, 5vw, 2.6rem)", letterSpacing: "0.05em", lineHeight: 1.12, fontWeight: 400 }}
        >
          What Your Fragrance<br />Says About You
        </h1>

        {/* Sub-line */}
        <p className="font-body font-light italic text-[rgba(245,237,224,0.55)] text-base leading-[1.8] max-w-sm">
          The scent you reach for is never an accident. Discover the personality behind each
          Dhyom fragrance — and find yours.
        </p>

        {/* Form or success */}
        {status === "done" ? (
          <div className="border border-[rgba(196,163,115,0.22)] bg-[rgba(196,163,115,0.04)] rounded-[4px] px-8 py-6">
            <p className="font-body font-light italic text-[rgba(245,237,224,0.68)] text-base leading-[1.8]">
              Check your inbox — your guide is on its way.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
              placeholder="your@email.com"
              disabled={status === "loading"}
              className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.28)] rounded-[3px] px-4 py-3.5 font-body font-light text-ivory text-[0.95rem] placeholder:text-[rgba(245,237,224,0.20)] focus:outline-none focus:border-[rgba(196,163,115,0.55)] transition-colors duration-150 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full font-display text-[0.65rem] tracking-[0.22em] uppercase text-brass border border-[rgba(196,163,115,0.40)] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.60)] rounded-[3px] py-4 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "···" : "Send Me the Guide"}
            </button>
            {errorMsg && (
              <p className="font-body font-light italic text-[rgba(205,75,75,0.68)] text-[0.82rem] text-center">
                {errorMsg}
              </p>
            )}
          </form>
        )}

        {/* Reassurance */}
        {status !== "done" && (
          <p className="font-body text-[0.72rem] text-[rgba(245,237,224,0.22)] leading-relaxed">
            No spam. Unsubscribe anytime.
          </p>
        )}

      </div>
    </div>
  );
}
