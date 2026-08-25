"use client";

import Image from "next/image";
import { useScroll, useTransform, motion, useReducedMotion } from "framer-motion";

interface Props {
  src: string;
}

// How far the image shifts upward at max scroll (px).
// The container extends this far below the section so the bg never shows.
const PARALLAX = 40;

export default function HeroParallaxBg({ src }: Props) {
  const shouldReduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, -PARALLAX]);

  if (shouldReduce) {
    return (
      <Image
        src={src}
        alt=""
        fill
        priority
        quality={90}
        className="hidden md:block object-cover object-[center_65%]"
        sizes="100vw"
      />
    );
  }

  return (
    <motion.div
      className="absolute hidden md:block"
      // Extend bottom by PARALLAX so the upward shift never reveals bg-damson
      style={{ y, top: 0, left: 0, right: 0, bottom: -PARALLAX }}
    >
      <Image
        src={src}
        alt=""
        fill
        priority
        quality={90}
        className="object-cover object-[center_65%]"
        sizes="100vw"
      />
    </motion.div>
  );
}
