"use client";

// Stagger container — wraps a grid so children fade in one after another on scroll
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion";

interface GridProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerGrid({ children, className }: GridProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={staggerContainer}
    >
      {children}
    </motion.div>
  );
}

interface ItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: ItemProps) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}
