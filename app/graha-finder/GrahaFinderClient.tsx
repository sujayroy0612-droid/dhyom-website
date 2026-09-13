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
    copy: "Born to begin. Not to follow. Surya is the Sun — in Vedic tradition the graha of the self, the one light that borrows from nothing. Its uparatna is red garnet: the same fire, made wearable. Deep red. Worn at the wrist, closest to the pulse.",
    productSlug: "red-garnet-bracelet",
  },
  2: {
    name: "Chandra",
    planet: "Moon",
    stone: "Rainbow Moonstone",
    copy: "The mind moves. The moon taught it how. Chandra is the Moon. Tradition gives it charge of the mind — memory, mood, the quiet interior. Its uparatna is moonstone, which hides a blue flash inside white and shows it only in movement.",
    productSlug: "rainbow-moonstone-bracelet",
  },
  3: {
    name: "Guru",
    planet: "Jupiter",
    stone: "Citrine",
    copy: "Wisdom is not given. It is grown. Guru is Brihaspati — teacher of the gods, the graha of expansion and counsel. Its uparatna is citrine: golden, warm, unmistakable against the skin.",
    productSlug: "citrine-bracelet",
  },
  4: {
    name: "Rahu",
    planet: "",
    stone: "Smoky Quartz",
    copy: "Every path has a shadow. Some walk it deliberately. Rahu is the shadow graha, the one without a body. Tradition places it with the unconventional, the sudden, the thing not yet named. Its uparatna is smoky quartz — clear stone, darkened by the earth itself.",
    productSlug: "smoky-quartz-bracelet",
  },
  5: {
    name: "Budh",
    planet: "Mercury",
    stone: "Green Aventurine",
    copy: "Thought, before it becomes a word. Budh is Mercury — the graha of intellect, exchange and the spoken word. Its uparatna is green aventurine: soft green, undyed, quiet.",
    productSlug: "green-aventurine-bracelet",
  },
  6: {
    name: "Shukra",
    planet: "Venus",
    stone: "Clear Quartz",
    copy: "Devotion, and the eye that recognises it. Shukra is Venus — the graha of art, beauty and devotion. Its uparatna is clear quartz: no colour, all clarity. The stone that holds nothing back.",
    productSlug: "clear-quartz-bracelet",
  },
  7: {
    name: "Ketu",
    planet: "",
    stone: "Labradorite",
    copy: "Some are born looking outward. Some are not. Ketu is the second shadow graha, the headless one. Tradition places it with detachment and the inner search. Its uparatna is labradorite: grey until it catches light, then blue.",
    productSlug: "labradorite-bracelet",
  },
  8: {
    name: "Shani",
    planet: "Saturn",
    stone: "Amethyst",
    copy: "Time is not the obstacle. It is the method. Shani is Saturn — the slowest graha, keeper of time and discipline. Its uparatna is amethyst: even violet, undyed. The colour of patience.",
    productSlug: "amethyst-bracelet",
  },
  9: {
    name: "Mangal",
    planet: "Mars",
    stone: "Carnelian",
    copy: "Courage is a decision. Made early, made often. Mangal is Mars — the graha of fire, action and courage. Its uparatna is carnelian: burnt orange, warmed through. Worn by those who move first.",
    productSlug: "carnelian-bracelet",
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
      ? `/shop/bracelet/navagraha/${result.info.productSlug}`
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
