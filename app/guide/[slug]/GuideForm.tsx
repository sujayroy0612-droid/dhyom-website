"use client";

import { useState, FormEvent } from "react";

type Status = "idle" | "loading" | "follow" | "sending" | "done" | "error";

export default function GuideForm({ slug }: { slug: string }) {
  const [email,    setEmail]    = useState("");
  const [status,   setStatus]   = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus("follow");
  }

  async function sendGuide() {
    setStatus("sending");
    setErrorMsg("");
    try {
      const res  = await fetch(`/api/guide/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
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

  function handleFollowClick() {
    window.open("https://instagram.com/dhyom.in", "_blank", "noopener,noreferrer");
    sendGuide();
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

  if (status === "follow" || status === "sending" || status === "error") {
    return (
      <div className="border border-[rgba(196,163,115,0.22)] bg-[rgba(196,163,115,0.04)] rounded-[4px] px-8 py-8 w-full flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <p className="font-display text-[0.58rem] tracking-[0.24em] uppercase text-brass">
            One last step
          </p>
          <p className="font-body font-light text-ivory text-base leading-[1.8]">
            Follow us on Instagram to receive your guide.
          </p>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.40)] text-sm">
            We share rituals, stories, and drops there too.
          </p>
        </div>

        <button
          onClick={handleFollowClick}
          disabled={status === "sending"}
          className="inline-flex items-center gap-2.5 bg-brass text-ink font-display text-[0.65rem] tracking-[0.22em] uppercase rounded-[3px] px-7 py-3 hover:bg-[#d4b383] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
          </svg>
          {status === "sending" ? "Sending your guide···" : "Follow @dhyom.in"}
        </button>

        <p className="font-body text-[0.75rem] text-[rgba(245,237,224,0.25)]">
          Already following?{" "}
          <button
            onClick={sendGuide}
            disabled={status === "sending"}
            className="underline text-[rgba(196,163,115,0.55)] hover:text-brass transition-colors duration-150 disabled:opacity-50"
          >
            Send me the guide
          </button>
        </p>

        {errorMsg && (
          <p className="font-body font-light italic text-[rgba(205,75,75,0.68)] text-[0.82rem]">
            {errorMsg}
          </p>
        )}
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
