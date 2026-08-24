"use client";

import { useRef, useState, useEffect, Children } from "react";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion";

interface Props {
  children: React.ReactNode;
  /** Tailwind classes applied to the desktop grid — e.g. "grid-cols-2 lg:grid-cols-3 gap-7" */
  gridClassName: string;
  /** Optional class on the outer wrapper (e.g. "max-w-4xl mx-auto") */
  className?: string;
}

export default function CardGrid({ children, gridClassName, className }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = Children.count(children);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      setActive(Math.round((el.scrollLeft / max) * (count - 1)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [count]);

  function goTo(i: number) {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: (i / Math.max(count - 1, 1)) * max, behavior: "smooth" });
  }

  return (
    <div className={className}>

      {/* ── Mobile: horizontal swipe carousel (< md) ── */}
      <div className="md:hidden">
        <div
          ref={scrollRef}
          className="carousel-scroll flex overflow-x-auto gap-4 -mx-6 px-6 pb-1"
          style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
        >
          {Children.map(children, (child) => (
            <div className="flex-none snap-start" style={{ width: "85vw" }}>
              {child}
            </div>
          ))}
        </div>

        {count > 1 && (
          <div className="flex justify-center items-center gap-2 mt-5">
            {Array.from({ length: count }, (_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to item ${i + 1} of ${count}`}
                className="rounded-full border-0 p-0 cursor-pointer transition-all duration-300"
                style={{
                  width: i === active ? 16 : 6,
                  height: 6,
                  background: i === active ? "rgb(196,163,115)" : "rgba(196,163,115,0.28)",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop: stagger grid (md+) ── */}
      <motion.div
        className={`hidden md:grid ${gridClassName}`}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={staggerContainer}
      >
        {Children.map(children, (child, i) => (
          <motion.div key={i} variants={fadeUp} className="h-full w-full min-w-0">
            {child}
          </motion.div>
        ))}
      </motion.div>

    </div>
  );
}
