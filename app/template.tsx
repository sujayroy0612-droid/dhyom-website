"use client";

import { motion } from "framer-motion";

// Soft cross-fade + tiny upward drift on every page navigation.
// template.tsx re-mounts on each route change (unlike layout.tsx which persists),
// so this fires naturally without needing AnimatePresence.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}
