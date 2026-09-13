"use client";

import { useState } from "react";
import Link from "next/link";

/* ── Mulank: sum digits until single digit ── */
function getMulank(day: number): number {
  let n = day;
  while (n > 9) {
    n = String(n)
      .split("")
      .reduce((a, d) => a + Number(d), 0);
  }
  return n;
}

/* ── Graha data ─────────────────────────────────────────────── */
type GrahaInfo = {
  name: string;
  planet: string;
  stone: string;
  copy: string;
  productSlug: string | null; // null → fallback to /shop/bracelet
};

const GRAHA: Record<number, GrahaInfo> = {
  1: {
    name: "Surya",
    planet: "Sun",
    stone: "Red Garnet",
    copy: "Surya governs clarity, leadership, and the kind of warmth others are drawn toward. Those born on a Sun day carry a natural authority — not loud, but present. Red Garnet worn close to the body amplifies this inner fire and steadies it into purpose.",
    productSlug: null,
  },
  2: {
    name: "Chandra",
    planet: "Moon",
    stone: "Rainbow Moonstone",
    copy: "Chandra governs intuition, cycles, and the quiet intelligence that reads rooms before they speak. Moon-governed people feel everything — deeply. Rainbow Moonstone honours this sensitivity and helps it become wisdom rather than overwhelm.",
    productSlug: null,
  },
  3: {
    name: "Guru",
    planet: "Jupiter",
    stone: "Citrine",
    copy: "Guru governs expansion, abundance, and the instinct to give. Those born on a Jupiter day carry generosity as a first impulse. Citrine, warm and luminous, amplifies this energy and draws the prosperity that naturally returns to open hands.",
    productSlug: null,
  },
  4: {
    name: "Rahu",
    planet: "",
    stone: "Smoky Quartz",
    copy: "Rahu governs desire, transformation, and the parts of yourself that resist being tamed. Those who carry Rahu's energy move through life in unexpected ways. Smoky Quartz grounds this intensity — it transmutes restlessness into discernment.",
    productSlug: null,
  },
  5: {
    name: "Budh",
    planet: "Mercury",
    stone: "Green Aventurine",
    copy: "Budh governs intellect, communication, and the quick mind that sees connections others miss. Mercury-ruled people are adaptable, articulate, and curious. Green Aventurine clears the mind and opens the channels through which your best thinking flows.",
    productSlug: null,
  },
  6: {
    name: "Shukra",
    planet: "Venus",
    stone: "Clear Quartz",
    copy: "Shukra governs beauty, love, and the attunement to everything that makes life worthwhile. Those ruled by Venus find their dharma in relationship — to people, to art, to the sensory world. Clear Quartz amplifies this receptive energy and brings clarity to what you most want to create.",
    productSlug: null,
  },
  7: {
    name: "Ketu",
    planet: "",
    stone: "Labradorite",
    copy: "Ketu governs detachment, spiritual inquiry, and the wisdom that comes only through surrender. Those who carry Ketu energy are seekers — often wiser than they know, and more at home in stillness than in noise. Labradorite honours this depth and protects the sensitivity that comes with it.",
    productSlug: null,
  },
  8: {
    name: "Shani",
    planet: "Saturn",
    stone: "Amethyst",
    copy: "Shani governs discipline, karma, and the deep patience that builds what endures. Saturn people are thorough. What they build, lasts. Amethyst, cool and clear, supports this energy — it calms the mind, sharpens discernment, and makes the long work sustainable.",
    productSlug: null,
  },
  9: {
    name: "Mangal",
    planet: "Mars",
    stone: "Carnelian",
    copy: "Mangal governs courage, action, and the will that moves things forward. Those ruled by Mars are initiators — they begin before others have finished deciding. Carnelian honours this drive. Worn as a bracelet, it channels the warrior's energy into focus rather than force.",
    productSlug: null,
  },
};

const FIELD =
  "bg-transparent border border-[rgba(196,163,115,0.22)] px-4 py-3.5 text-ivory placeholder:text-[rgba(245,237,224,0.18)] focus:outline-none focus:border-[rgba(196,163,115,0.55)] transition-colors duration-200 w-full";

/* ── Main component ─────────────────────────────────────────── */
type Step = "input" | "result";

export default function GrahaFinderClient() {
  const [step, setStep] = useState<Step>("input");
  const [day, setDay] = useState("");
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [result, setResult] = useState<{ mulank: number; info: GrahaInfo } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hp) return;
    setFieldError("");

    const dayNum = parseInt(day, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      setFieldError("Please enter a valid day between 1 and 31.");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFieldError("Please enter a valid email address.");
      return;
    }

    const m = getMulank(dayNum);
    const info = GRAHA[m];

    setResult({ mulank: m, info });
    setStep("result");

    fetch("/api/graha-finder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmedEmail, day: dayNum, mulank: m, graha: info.name, stone: info.stone, hp }),
    }).catch(() => {});
  }

  function reset() {
    setStep("input");
    setDay("");
    setEmail("");
    setResult(null);
    setFieldError("");
  }

  if (step === "result" && result) {
    const productHref = result.info.productSlug
      ? `/shop/bracelet/rudraksh/${result.info.productSlug}`
      : "/shop/bracelet";
    return <ResultView mulank={result.mulank} info={result.info} productHref={productHref} onReset={reset} />;
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto flex flex-col gap-6">

      {/* Day field */}
      <div className="flex flex-col gap-2">
        <label className="font-display text-[0.58rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.55)]">
          Day of Birth
        </label>
        <input
          type="number"
          min={1}
          max={31}
          value={day}
          onChange={e => setDay(e.target.value)}
          placeholder="e.g. 23"
          required
          className={
            FIELD +
            " font-display text-xl tracking-widest [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          }
        />
        <p className="font-body font-light italic text-[0.72rem] text-[rgba(245,237,224,0.28)]">
          Just the day — not the full date of birth.
        </p>
      </div>

      {/* Email field */}
      <div className="flex flex-col gap-2">
        <label className="font-display text-[0.58rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.55)]">
          Your Email
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className={FIELD + " font-body font-light text-base"}
        />
        <p className="font-body font-light italic text-[0.72rem] text-[rgba(245,237,224,0.28)]">
          To receive your reading and stone recommendation.
        </p>
      </div>

      {/* Honeypot */}
      <input
        type="text"
        value={hp}
        onChange={e => setHp(e.target.value)}
        tabIndex={-1}
        aria-hidden
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", height: 0, width: 0 }}
      />

      {fieldError && (
        <p className="font-body font-light text-[0.82rem] italic" style={{ color: "rgba(220,100,80,0.85)" }}>
          {fieldError}
        </p>
      )}

      <button
        type="submit"
        className="mt-1 w-full border border-[rgba(196,163,115,0.40)] bg-[rgba(196,163,115,0.06)] text-brass font-display text-[0.68rem] tracking-[0.28em] uppercase py-4 hover:bg-[rgba(196,163,115,0.13)] hover:border-[rgba(196,163,115,0.70)] transition-colors duration-200"
      >
        Reveal My Graha
      </button>
    </form>
  );
}

/* ── Result view ────────────────────────────────────────────── */
function ResultView({
  mulank,
  info,
  productHref,
  onReset,
}: {
  mulank: number;
  info: GrahaInfo;
  productHref: string;
  onReset: () => void;
}) {
  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center gap-8">

      {/* Mulank label */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-px bg-[rgba(196,163,115,0.22)]" />
        <span className="font-display text-[0.52rem] tracking-[0.32em] uppercase text-[rgba(196,163,115,0.40)]">
          Mulank {mulank}
        </span>
        <div className="w-10 h-px bg-[rgba(196,163,115,0.22)]" />
      </div>

      {/* Graha name */}
      <div className="flex flex-col items-center gap-2">
        <h2
          className="font-display text-ivory"
          style={{ fontSize: "clamp(3rem, 10vw, 5rem)", letterSpacing: "0.09em", lineHeight: 1 }}
        >
          {info.name}
        </h2>
        {info.planet && (
          <p className="font-display text-[0.56rem] tracking-[0.3em] uppercase text-[rgba(196,163,115,0.45)]">
            {info.planet}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="w-10 h-px bg-[rgba(196,163,115,0.28)]" />

      {/* Stone */}
      <div className="flex flex-col items-center gap-2">
        <p className="font-display text-[0.52rem] tracking-[0.26em] uppercase text-[rgba(245,237,224,0.30)]">
          Your Stone
        </p>
        <p
          className="font-display text-brass"
          style={{ fontSize: "clamp(1.4rem, 4.5vw, 2rem)", letterSpacing: "0.07em" }}
        >
          {info.stone}
        </p>
      </div>

      {/* Rule */}
      <div className="w-full h-px bg-[rgba(196,163,115,0.10)]" />

      {/* Copy */}
      <p className="font-body font-light italic text-[rgba(245,237,224,0.58)] text-base leading-[1.95] max-w-md">
        {info.copy}
      </p>

      {/* CTA */}
      <Link
        href={productHref}
        className="inline-block bg-brass text-[#1A0A14] font-display text-[0.66rem] tracking-[0.28em] uppercase px-10 py-4 hover:bg-[rgba(196,163,115,0.85)] transition-colors duration-200"
      >
        View This Bracelet
      </Link>

      {/* Reset */}
      <button
        onClick={onReset}
        className="font-display text-[0.52rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.32)] hover:text-[rgba(196,163,115,0.60)] transition-colors duration-200"
      >
        Calculate Again
      </button>
    </div>
  );
}
