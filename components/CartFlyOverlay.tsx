"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartFly, type FlyItem } from "@/context/CartFlyContext";

interface ResolvedFly extends FlyItem {
  toX: number;
  toY: number;
}

const SIZE = 52;

export default function CartFlyOverlay() {
  const { flyItems, cartRef, removeFlyItem } = useCartFly();
  const [resolved, setResolved] = useState<ResolvedFly[]>([]);

  useEffect(() => {
    for (const item of flyItems) {
      if (resolved.find((r) => r.id === item.id)) continue;
      const cartEl = cartRef.current;
      if (!cartEl) { removeFlyItem(item.id); continue; }
      const rect = cartEl.getBoundingClientRect();
      const toX = rect.left + rect.width / 2;
      const toY = rect.top + rect.height / 2;
      setResolved((prev) => [...prev, { ...item, toX, toY }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyItems]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]" aria-hidden="true">
      <AnimatePresence>
        {resolved.map((item) => {
          const arcMidX = (item.fromX + item.toX) / 2;
          const arcMidY = Math.min(item.fromY, item.toY) - 90;
          return (
            <motion.div
              key={item.id}
              initial={{ x: item.fromX - SIZE / 2, y: item.fromY - SIZE / 2, scale: 1, opacity: 1 }}
              animate={{
                x: [item.fromX - SIZE / 2, arcMidX - SIZE / 2, item.toX - SIZE / 2],
                y: [item.fromY - SIZE / 2, arcMidY - SIZE / 2, item.toY - SIZE / 2],
                scale: [1, 0.85, 0.3],
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 0.52, ease: [0.2, 0, 0.6, 1], times: [0, 0.42, 1] }}
              style={{
                position: "fixed",
                left: 0,
                top: 0,
                width: SIZE,
                height: SIZE,
                borderRadius: "50%",
                overflow: "hidden",
                border: "1.5px solid rgba(196,163,115,0.65)",
                background: "#1e0716",
                boxShadow: "0 4px 20px rgba(196,163,115,0.20)",
              }}
              onAnimationComplete={() => {
                removeFlyItem(item.id);
                setResolved((prev) => prev.filter((r) => r.id !== item.id));
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
