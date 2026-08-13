"use client";

// Scroll-triggered fade — used for homepage sections, shop grids, etc.
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

interface Props {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  once?: boolean;
}

export default function FadeInView({ children, delay = 0, className, once = true }: Props) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-60px" }}
      variants={{
        hidden: fadeUp.hidden,
        show: {
          ...(fadeUp.show as object),
          transition: { duration: 0.5, ease: [0.0, 0.0, 0.2, 1], delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
