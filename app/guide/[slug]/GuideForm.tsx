"use client";

import { useState, FormEvent } from "react";

export default function GuideForm({ slug }: { slug: string }) {
  const [email,    setEmail]    = useState("");
  const [status,   setStatus]   = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res  = await fetch(`/api/guide/${slug}`, {
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

  if (status === "done") {
    return (
      <div className="border border-[rgba(196,163,115,0.22)] bg-[rgba(196,163,115,0.04)] rounded-[4px] px-8 py-6 w-full">
        <p className="font-body font-light italic text-[rgba(245,237,224,0.68)] text-base leading-[1.8]">
          Check your inbox — your guide is on its way.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
          placeholder="your@email.com"
          disabled={status === "loading"}
          className="flex-1 bg-[rgba(245,237,224,0.06)] border border-[rgba(196,163,115,0.28)] rounded-[3px] px-4 py-3.5 font-body font-light text-ivory text-[0.95rem] placeholder:text-[rgba(245,237,224,0.20)] focus:outline-none focus:border-[rgba(196,163,115,0.55)] transition-colors duration-150 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="md:flex-shrink-0 bg-brass text-ink font-display text-[0.65rem] tracking-[0.22em] uppercase rounded-[3px] px-8 py-3.5 hover:bg-[#d4b383] transition-colors duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {status === "loading" ? "···" : "Send Me the Guide"}
        </button>
      </form>
      {errorMsg && (
        <p className="font-body font-light italic text-[rgba(205,75,75,0.68)] text-[0.82rem] text-center">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
