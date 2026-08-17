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
      className="fixed left-4 z-[999] flex flex-col items-center justify-center rounded-full no-underline
                 w-[44px] h-[44px] md:w-[52px] md:h-[52px]"
      style={{
        top: "80px",
        background: "#C4A373",
        boxShadow: "0 4px 14px rgba(0,0,0,0.6)",
        gap: "2px",
        textDecoration: "none",
        color: "inherit",
      }}
      whileHover={{
        y: -2,
        boxShadow: "0 8px 22px rgba(0,0,0,0.70)",
      }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <span style={{ color: "#1A0A14", fontWeight: 800, fontSize: "9px", letterSpacing: "-0.5px", lineHeight: 1 }}
            className="md:text-[10px]">
        amazon
      </span>
      <span aria-hidden
            style={{ color: "#1A0A14", fontSize: "7px", opacity: 0.85, lineHeight: 1 }}
            className="md:text-[8px]">
        ★★★★★
      </span>
      <span style={{ color: "#1A0A14", fontWeight: 700, fontSize: "9px", lineHeight: 1 }}
            className="md:text-[10px]">
        4.8
      </span>
    </motion.a>
  );
}
