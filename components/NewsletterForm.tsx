"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    const { error } = await supabase.from("contacts").insert({ email: trimmed, tag: "newsletter" });
    setStatus(error ? "error" : "done");
  }

  if (status === "done") {
    return (
      <p className="font-body font-light italic text-[rgba(245,237,224,0.55)] text-base text-center">
        Thank you. Your ritual guide is on its way.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="flex items-center bg-[rgba(245,237,224,0.06)] border border-[rgba(196,163,115,0.28)] rounded-full p-1.5 gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={status === "loading"}
          className="flex-1 min-w-0 bg-transparent text-ivory placeholder-[rgba(245,237,224,0.28)] text-sm font-body font-light pl-4 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex-shrink-0 font-display text-[0.60rem] tracking-[0.2em] uppercase text-brass border border-[rgba(196,163,115,0.35)] rounded-full px-6 py-2.5 hover:bg-[rgba(196,163,115,0.07)] transition-all duration-200 disabled:opacity-40 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
        >
          {status === "loading" ? "…" : "Join"}
        </button>
      </div>
      {status === "error" && (
        <p className="font-body text-xs text-[rgba(196,163,115,0.55)] text-center mt-3">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}
