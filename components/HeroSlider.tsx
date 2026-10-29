"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import MagneticButton from "./MagneticButton";
import HeroParallaxBg from "./HeroParallaxBg";
import HeroBackground from "./HeroBackground";

export interface HeroSlide {
  eyebrow: string;
  headline: string;
  headlineAccent?: string;
  subtext?: string;
  buttonLabel: string;
  buttonHref: string;
  imageUrl?: string | null;
  backgroundGradient?: boolean;
  secondaryLink?: { text: string; href: string };
  bannerText?: string | null;
  headingTag?: "h1" | "h2";
  textAlign?: "left" | "center"; // "left" activates the split desktop / stacked mobile layout
}

interface Props {
  slides: HeroSlide[];
  heroDesktopBg?: string | null;
  heroMobilePoster?: string | null;
}

const INTERVAL  = 6000;
const HALF_FADE = 300;

export default function HeroSlider({ slides, heroDesktopBg, heroMobilePoster }: Props) {
  const [current, setCurrent]  = useState(0);
  const [opacity, setOpacity]  = useState(1);
  const [reducedMotion, setRM] = useState(false);
  const transitioning = useRef(false);
  const hovering      = useRef(false);
  const touching      = useRef(false);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX   = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setRM(mq.matches);
    const h = (e: MediaQueryListEvent) => setRM(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const goTo = useCallback((idx: number) => {
    if (transitioning.current || idx === current) return;
    if (reducedMotion) { setCurrent(idx); return; }
    transitioning.current = true;
    setOpacity(0);
    setTimeout(() => {
      setCurrent(idx);
      setOpacity(1);
      setTimeout(() => { transitioning.current = false; }, HALF_FADE);
    }, HALF_FADE);
  }, [current, reducedMotion]);

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, slides.length, goTo]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, slides.length, goTo]);

  useEffect(() => {
    if (reducedMotion) return;
    timerRef.current = setTimeout(() => {
      if (!hovering.current && !touching.current) next();
    }, INTERVAL);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, reducedMotion, next]);

  function onTouchStart(e: React.TouchEvent) {
    touching.current = true;
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    touching.current = false;
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) { if (delta > 0) next(); else prev(); }
    touchStartX.current = null;
  }

  const slide = slides[current];
  const Heading = (slide.headingTag ?? "h2") as "h1" | "h2";
  const fadeStyle = reducedMotion ? {} : { opacity, transition: `opacity ${HALF_FADE}ms ease-in-out` };
  const isLeft = slide.textAlign === "left";

  return (
    <section
      className="relative bg-damson overflow-hidden"
      onMouseEnter={() => { hovering.current = true; }}
      onMouseLeave={() => { hovering.current = false; }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── SLIDE CONTENT ──────────────────────────────────── */}
      <div style={fadeStyle}>
        {isLeft ? (
          /* ── LEFT-ALIGNED LAYOUT (slide with photo) ─────── */
          <>
            {/* DESKTOP (md+): image fills slide, text on left */}
            <div className="hidden md:block relative w-full min-h-screen">

              {/* Background image — right-aligned so hamper is always visible */}
              {slide.imageUrl && (
                <Image
                  src={slide.imageUrl}
                  alt=""
                  fill
                  priority
                  className="object-cover"
                  style={{ objectPosition: "right center" }}
                  sizes="100vw"
                />
              )}

              {/* Dark maroon gradient from left → text always readable */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to right, rgba(39,11,27,0.97) 0%, rgba(39,11,27,0.90) 22%, rgba(39,11,27,0.70) 38%, rgba(39,11,27,0.32) 54%, transparent 72%)",
                }}
              />
              {/* Vignette top/bottom */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(39,11,27,0.55) 0%, transparent 18%, transparent 80%, rgba(39,11,27,0.45) 100%)",
                }}
              />

              {/* Text block — left side, vertically centered */}
              <div className="absolute top-1/2 -translate-y-1/2 left-8 lg:left-14 xl:left-20 2xl:left-28 flex flex-col items-start gap-4 md:gap-5 max-w-[44%] xl:max-w-[40%]">
                <p
                  className="font-display text-[0.60rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.65)]"
                >
                  {slide.eyebrow}
                </p>

                <Heading
                  className="font-display text-ivory"
                  style={{
                    fontSize: "clamp(2rem, 3.6vw, 3.75rem)",
                    letterSpacing: "0.05em",
                    lineHeight: 1.12,
                  }}
                >
                  {slide.headline}
                  {slide.headlineAccent && (
                    <><br /><span className="text-brass">{slide.headlineAccent}</span></>
                  )}
                </Heading>

                {slide.subtext && (
                  <p
                    className="font-body font-light italic text-[rgba(245,237,224,0.60)]"
                    style={{ fontSize: "clamp(1.0rem, 1.3vw, 1.15rem)", lineHeight: 1.6 }}
                  >
                    {slide.subtext}
                  </p>
                )}

                <MagneticButton strength={6}>
                  <Link
                    href={slide.buttonHref}
                    className="inline-flex items-center justify-center font-display uppercase tracking-[0.22em] rounded-full transition-colors duration-200 active:scale-[0.98] px-8 py-2.5 text-[0.65rem] bg-brass text-ink border border-brass hover:bg-[#d4b383] hover:border-[#d4b383]"
                  >
                    {slide.buttonLabel}
                  </Link>
                </MagneticButton>

                {slide.secondaryLink && (
                  <a
                    href={slide.secondaryLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body font-light italic text-[rgba(196,163,115,0.65)] text-sm hover:text-brass hover:underline transition-colors duration-200"
                  >
                    {slide.secondaryLink.text}
                  </a>
                )}
              </div>
            </div>

            {/* MOBILE (<md): stacked layout — image on top, text below */}
            <div className="flex flex-col md:hidden min-h-screen">

              {/* Image frame — 1:1 square, scale(1.1) zooms to box area, translateY shifts it
                  slightly down so the hamper is centred in the frame with a bit of breathing
                  room above the lid. overflow-hidden clips the scaled image edges. */}
              <div className="relative w-full flex-shrink-0 overflow-hidden" style={{ aspectRatio: "1/1" }}>
                {slide.imageUrl && (
                  <Image
                    src={slide.imageUrl}
                    alt=""
                    fill
                    priority
                    className="object-cover"
                    style={{
                      objectPosition: "right center",
                      transform: "scale(1.1) translateY(4%)",
                      transformOrigin: "right center",
                    }}
                    sizes="100vw"
                  />
                )}
                {/* Gradient at bottom blending into text section */}
                <div
                  className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
                  style={{ background: "linear-gradient(to bottom, transparent, rgba(39,11,27,1))" }}
                />
              </div>

              {/* Text section */}
              <div
                className="flex-1 flex flex-col items-start gap-4 px-5 pt-5 pb-8"
                style={{ background: "rgb(39,11,27)" }}
              >
                <p className="font-display text-[0.58rem] tracking-[0.26em] uppercase text-[rgba(196,163,115,0.60)]">
                  {slide.eyebrow}
                </p>

                <Heading
                  className="font-display text-ivory"
                  style={{ fontSize: "clamp(1.75rem, 7vw, 2.4rem)", letterSpacing: "0.05em", lineHeight: 1.14 }}
                >
                  {slide.headline}
                  {slide.headlineAccent && (
                    <><br /><span className="text-brass">{slide.headlineAccent}</span></>
                  )}
                </Heading>

                {slide.subtext && (
                  <p
                    className="font-body font-light italic text-[rgba(245,237,224,0.55)]"
                    style={{ fontSize: "clamp(0.94rem, 4vw, 1.05rem)", lineHeight: 1.6 }}
                  >
                    {slide.subtext}
                  </p>
                )}

                <Link
                  href={slide.buttonHref}
                  className="w-full text-center font-display uppercase tracking-[0.20em] rounded-full transition-colors duration-200 active:scale-[0.98] px-6 py-3 text-[0.65rem] bg-brass text-ink border border-brass hover:bg-[#d4b383]"
                >
                  {slide.buttonLabel}
                </Link>

                {slide.secondaryLink && (
                  <a
                    href={slide.secondaryLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body font-light italic text-[rgba(196,163,115,0.60)] text-sm hover:text-brass hover:underline transition-colors duration-200"
                  >
                    {slide.secondaryLink.text}
                  </a>
                )}
              </div>
            </div>
          </>
        ) : (
          /* ── CENTERED LAYOUT (original hero style) ────────── */
          <div className="relative flex flex-col items-center justify-center min-h-screen text-center px-6">

            {/* Background */}
            <div className="absolute inset-0">
              {slide.imageUrl ? (
                <Image
                  src={slide.imageUrl}
                  alt=""
                  fill
                  priority={current === 0}
                  className="object-cover"
                  sizes="100vw"
                />
              ) : slide.backgroundGradient ? (
                null
              ) : (
                <>
                  {heroDesktopBg && (
                    <HeroParallaxBg
                      src={heroDesktopBg.replace("/upload/", "/upload/c_limit,w_2400,q_auto:best,f_auto/")}
                    />
                  )}
                  <HeroBackground
                    videoSrc="/videos/hero-video.mp4"
                    posterUrl={heroMobilePoster ?? undefined}
                  />
                </>
              )}
            </div>

            {/* Gradient overlays */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(61,20,40,0.82) 0%, rgba(61,20,40,0.48) 28%, rgba(61,20,40,0.42) 50%, rgba(61,20,40,0.50) 72%, rgba(61,20,40,0.82) 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 70% 55% at 50% 38%, rgba(107,42,72,0.38) 0%, transparent 70%)",
              }}
            />

            {/* Candle glow for video/parallax slide */}
            {!slide.imageUrl && !slide.backgroundGradient && (
              <div
                aria-hidden="true"
                className="absolute pointer-events-none hidden md:block"
                style={{
                  left: "68%", top: "42%", width: "32vw", height: "52vh",
                  transform: "translate(-50%, -50%)",
                  background:
                    "radial-gradient(ellipse 55% 60% at 50% 50%, rgba(201,162,39,0.22) 0%, rgba(201,162,39,0.10) 40%, rgba(201,162,39,0.02) 70%, transparent 100%)",
                  animation: "candle-breathe 4.2s ease-in-out infinite",
                }}
              />
            )}

            {/* Content */}
            <div className="relative flex flex-col items-center">
              <p className="font-display text-[0.62rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.60)] mb-7">
                {slide.eyebrow}
              </p>

              <Heading
                className="font-display text-ivory mb-6 max-w-3xl"
                style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)", letterSpacing: "0.05em", lineHeight: 1.12 }}
              >
                {slide.headline}
                {slide.headlineAccent && (
                  <><br /><span className="text-brass">{slide.headlineAccent}</span></>
                )}
              </Heading>

              {slide.subtext && (
                <p className="font-body font-light italic text-[rgba(245,237,224,0.55)] text-base mb-8 max-w-lg">
                  {slide.subtext}
                </p>
              )}

              <MagneticButton strength={7}>
                <Link
                  href={slide.buttonHref}
                  className="inline-flex items-center justify-center font-display uppercase tracking-[0.22em] rounded-full transition-colors duration-200 active:scale-[0.98] px-8 py-2.5 text-[0.65rem] bg-brass text-ink border border-brass hover:bg-[#d4b383] hover:border-[#d4b383]"
                >
                  {slide.buttonLabel}
                </Link>
              </MagneticButton>

              {slide.bannerText && (
                <p className="mt-4 font-display text-[0.50rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">
                  {slide.bannerText}
                </p>
              )}

              {slide.secondaryLink && (
                <a
                  href={slide.secondaryLink.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 font-body font-light italic text-[rgba(196,163,115,0.70)] text-sm hover:text-brass hover:underline transition-colors duration-200"
                >
                  {slide.secondaryLink.text}
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Arrow buttons (desktop only) ───────────────────── */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="hidden md:flex absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center text-[rgba(196,163,115,0.40)] hover:text-brass transition-colors duration-200 z-10"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="hidden md:flex absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center text-[rgba(196,163,115,0.40)] hover:text-brass transition-colors duration-200 z-10"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* ── Dot indicators ─────────────────────────────────── */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={[
                "rounded-full transition-all duration-300",
                i === current
                  ? "w-5 h-1.5 bg-brass"
                  : "w-1.5 h-1.5 bg-[rgba(196,163,115,0.35)] hover:bg-[rgba(196,163,115,0.60)]",
              ].join(" ")}
            />
          ))}
        </div>
      )}
    </section>
  );
}
