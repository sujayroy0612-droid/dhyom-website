"use client";

import Image from "next/image";
import { useScroll, useTransform, motion, useReducedMotion } from "framer-motion";

interface Props {
  src: string;
}

export default function HeroParallaxBg({ src }: Props) {
  const shouldReduce = useReducedMotion();
  const { scrollY } = useScroll();
  // Shift bg up by 30% of scroll distance — subtle parallax
  const y = useTransform(scrollY, [0, 600], [0, -120]);

  if (shouldReduce) {
    return (
      <Image
        src={src}
        alt=""
        fill
        priority
        quality={90}
        className="hidden md:block object-cover object-[center_60%]"
        sizes="100vw"
      />
    );
  }

  return (
    <motion.div
      className="absolute inset-0 hidden md:block"
      style={{ y }}
    >
      <Image
        src={src}
        alt=""
        fill
        priority
        quality={90}
        className="object-cover object-[center_60%]"
        sizes="100vw"
      />
    </motion.div>
  );
}
