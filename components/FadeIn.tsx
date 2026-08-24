"use client";

// On-mount fade — used for hero elements (not scroll-triggered)
import { motion, useReducedMotion } from "framer-motion";
import { heroItem } from "@/lib/motion";

interface Props {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export default function FadeIn({ children, delay = 0, className }: Props) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: heroItem.hidden,
        show: {
          ...(heroItem.show as object),
          transition: { duration: 0.85, ease: [0.0, 0.0, 0.2, 1], delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
