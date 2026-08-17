"use client";

import { motion } from "framer-motion";

const AMAZON_URL =
  "https://www.amazon.in/stores/DHYOM/page/1AD78961-3772-4711-8015-04282B274B61?lp_asin=B0GVPX8632&ref_=ast_bln&store_ref=bl_ast_dp_brandlogo_sto&bl_grd_status=override";

export default function AmazonBadge() {
  return (
    <motion.a
      href={AMAZON_URL}
      target="_blank"
      rel="noopener"
      aria-label="Shop Dhyom on Amazon — 4.8 stars"
      className="fixed left-4 z-[999] flex flex-col items-center justify-center rounded-full w-10 h-10 md:w-14 md:h-14"
      style={{
        top: "calc(var(--bar-height, 0px) + 96px)",
        background: "#C4A373",
        border: "2px solid rgba(196,163,115,0.55)",
        outline: "2px solid rgba(26,10,20,0.18)",
        outlineOffset: "2px",
        gap: "2px",
        textDecoration: "none",
        color: "inherit",
      }}
      /* Pulsing ring — identical rhythm to WhatsApp button */
      animate={{
        boxShadow: [
          "0 4px 14px rgba(0,0,0,0.60), 0 0 0 0px rgba(196,163,115,0.50)",
          "0 4px 14px rgba(0,0,0,0.60), 0 0 0 10px rgba(196,163,115,0.00)",
          "0 4px 14px rgba(0,0,0,0.60), 0 0 0 0px rgba(196,163,115,0.00)",
        ],
      }}
      transition={{
        duration: 1.6,
        repeat: Infinity,
        repeatDelay: 4.5,
        ease: "easeOut",
      }}
      whileHover={{
        y: -2,
        boxShadow: "0 8px 22px rgba(0,0,0,0.70)",
      }}
      whileTap={{ scale: 0.93 }}
    >
      <span style={{ color: "#1A0A14", fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1 }}
            className="text-[8px] md:text-[13px]">
        amazon
      </span>
      <span aria-hidden
            style={{ color: "#1A0A14", opacity: 0.85, lineHeight: 1 }}
            className="text-[6px] md:text-[9px]">
        ★★★★★
      </span>
      <span style={{ color: "#1A0A14", fontWeight: 700, lineHeight: 1 }}
            className="text-[7px] md:text-[11px]">
        4.8
      </span>
    </motion.a>
  );
}
