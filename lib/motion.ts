import type { Variants } from "framer-motion";

export const EASE = [0.25, 0.1, 0.25, 1] as const;
export const EASE_OUT = [0.0, 0.0, 0.2, 1] as const;

// On-mount: hero-level fade + upward drift (slower, deliberate)
export const heroItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.85, ease: EASE_OUT } },
};

// Scroll-triggered: section / card entrance
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.5,  ease: EASE_OUT } },
};

// Stagger container for hero
export const heroContainer: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.14 } },
};

// Stagger container for scroll grids
export const staggerContainer: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
