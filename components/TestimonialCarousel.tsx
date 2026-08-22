"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  product_name?: string | null;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 12 12" fill={i <= rating ? "#C4A373" : "none"} stroke="#C4A373" strokeWidth="1" aria-hidden="true">
          <path d="M6 1l1.4 3h3.1L8 6l1 3L6 7.5 3 9l1-3-2.5-2h3.1L6 1z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialCarousel({ reviews }: { reviews: Review[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft]   = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    return () => el.removeEventListener("scroll", updateArrows);
  }, [updateArrows]);

  function scroll(dir: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.offsetWidth + 24 : 340;
    el.scrollBy({ left: dir === "right" ? step : -step, behavior: "smooth" });
  }

  return (
    <div className="relative">
      {/* Left arrow */}
      <button
        onClick={() => scroll("left")}
        aria-label="Previous"
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full border border-[rgba(196,163,115,0.25)] bg-[#1f0914] flex items-center justify-center transition-opacity duration-200 hover:border-[rgba(196,163,115,0.55)] ${canLeft ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#C4A373" strokeWidth="1.5">
          <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Scroll track */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {reviews.map((review) => (
          <div
            key={review.id}
            data-card
            className="flex-none w-[85vw] sm:w-[44vw] lg:w-[32vw] max-w-[400px] snap-start bg-[#1f0914] border border-[rgba(196,163,115,0.13)] rounded-[6px] p-8 flex flex-col hover:border-[rgba(196,163,115,0.30)] transition-colors duration-300"
          >
            <Stars rating={review.rating} />

            <p
              className="font-body font-light italic text-[rgba(245,237,224,0.72)] leading-[1.85] flex-1 mt-5 mb-6"
              style={{ fontSize: "clamp(0.92rem, 1.3vw, 1rem)" }}
            >
              &ldquo;{review.review_text}&rdquo;
            </p>

            <div className="border-t border-[rgba(196,163,115,0.10)] pt-5 flex flex-col gap-2">
              {review.product_name && (
                <p className="font-body font-light text-[0.78rem] text-brass tracking-wide">
                  {review.product_name}
                </p>
              )}
              <p
                className="font-display text-ivory"
                style={{ fontSize: "0.60rem", letterSpacing: "0.20em", textTransform: "uppercase" }}
              >
                — {review.customer_name}
              </p>
              <p className="font-body text-[0.68rem] text-[rgba(245,237,224,0.28)] mt-1">
                ✦ as seen on amazon.in
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll("right")}
        aria-label="Next"
        className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full border border-[rgba(196,163,115,0.25)] bg-[#1f0914] flex items-center justify-center transition-opacity duration-200 hover:border-[rgba(196,163,115,0.55)] ${canRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#C4A373" strokeWidth="1.5">
          <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Fade hint on right */}
      {canRight && (
        <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-ink to-transparent" />
      )}
    </div>
  );
}
