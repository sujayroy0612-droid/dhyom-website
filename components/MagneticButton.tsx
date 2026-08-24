"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useSpring } from "framer-motion";

interface MagneticButtonProps {
  children: React.ReactNode;
  strength?: number; // max pixel pull, default 6
  className?: string;
}

export default function MagneticButton({ children, strength = 6, className }: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(true); // default true (SSR-safe)

  useEffect(() => {
    setIsTouch(window.matchMedia("(hover: none)").matches);
  }, []);

  const x = useSpring(0, { stiffness: 280, damping: 22, mass: 0.4 });
  const y = useSpring(0, { stiffness: 280, damping: 22, mass: 0.4 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    // Scale pull proportionally to distance from center (max = strength)
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = Math.max(rect.width, rect.height) * 0.8;
    const factor = Math.min(dist / maxDist, 1) * strength;
    x.set(dx === 0 ? 0 : (dx / dist) * factor);
    y.set(dy === 0 ? 0 : (dy / dist) * factor);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  if (isTouch) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x, y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}
