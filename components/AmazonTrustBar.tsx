"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const AMAZON_URL =
  "https://www.amazon.in/stores/DHYOM/page/1AD78961-3772-4711-8015-04282B274B61?lp_asin=B0GVPX8632&ref_=ast_bln&store_ref=bl_ast_dp_brandlogo_sto&bl_grd_status=override";

const HIDE_ON = ["/admin", "/fragrance-guide"];
const BAR_H = "34px";

function Sep() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: "1px",
        height: "12px",
        background: "#3D1428",
        flexShrink: 0,
      }}
    />
  );
}

export default function AmazonTrustBar() {
  const pathname = usePathname();
  const hidden = HIDE_ON.some((r) => pathname.startsWith(r));

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--amazon-bar-height",
      hidden ? "0px" : BAR_H
    );
  }, [hidden]);

  if (hidden) return null;

  return (
    <a
      href={AMAZON_URL}
      target="_blank"
      rel="noopener"
      aria-label="Dhyom on Amazon — 4.8 stars, 42 reviews"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 52,
        height: BAR_H,
        background: "#1A0A14",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        textDecoration: "none",
        color: "inherit",
      }}
      className="hover:opacity-80 transition-opacity duration-150"
    >
      {/* amazon ↗ */}
      <span style={{ color: "#FF9900", fontWeight: 700, fontSize: "13px", lineHeight: 1 }}>
        amazon ↗
      </span>

      <Sep />

      {/* ★★★★★ */}
      <span aria-hidden style={{ color: "#FF9900", fontSize: "11px", lineHeight: 1, letterSpacing: "1px" }}>
        ★★★★★
      </span>

      {/* 4.8 */}
      <span style={{ color: "#C4A373", fontWeight: 500, fontSize: "12px", lineHeight: 1 }}>
        4.8
      </span>

      {/* (42 reviews) */}
      <span style={{ color: "rgba(245,237,224,0.40)", fontSize: "11px", lineHeight: 1 }}>
        (42 reviews)
      </span>

      {/* second separator — hidden below 400px */}
      <span className="max-[400px]:hidden" aria-hidden>
        <Sep />
      </span>

      {/* Shop on Amazon → — hidden below 400px */}
      <span
        className="max-[400px]:hidden"
        style={{
          color: "#C4A373",
          fontSize: "11px",
          textDecoration: "underline",
          textUnderlineOffset: "2px",
          lineHeight: 1,
        }}
      >
        Shop on Amazon →
      </span>
    </a>
  );
}
