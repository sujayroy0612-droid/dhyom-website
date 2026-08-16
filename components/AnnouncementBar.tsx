"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import type { AnnouncementData } from "@/lib/supabase/announcement";

const DOT = (
  <span
    aria-hidden
    style={{ color: "rgba(196,163,115,0.35)", margin: "0 14px", userSelect: "none" }}
  >
    ·
  </span>
);

function MessageItem({ text, link_url }: { text: string; link_url: string | null }) {
  const inner = (
    <span
      style={{
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: "0.52rem",
        letterSpacing: "0.18em",
        textTransform: "uppercase" as const,
        color: "#C4A373",
        fontWeight: 400,
        whiteSpace: "nowrap" as const,
      }}
    >
      {text}
    </span>
  );

  if (link_url) {
    return (
      <Link
        href={link_url}
        style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
      >
        {inner}
      </Link>
    );
  }
  return <span style={{ display: "inline-flex", alignItems: "center" }}>{inner}</span>;
}

export default function AnnouncementBar({ data }: { data: AnnouncementData | null }) {
  const pathname = usePathname();
  const [paused, setPaused] = useState(false);

  // Hide on admin pages and landing pages
  if (!data || pathname.startsWith("/admin") || pathname.startsWith("/fragrance-guide")) {
    return null;
  }

  const { speed, messages } = data;

  // Build a single row of messages with dot separators
  const strip = messages.map((m) => (
    <span key={m.id} style={{ display: "inline-flex", alignItems: "center" }}>
      <MessageItem text={m.text} link_url={m.link_url} />
      {DOT}
    </span>
  ));

  return (
    <div
      style={{
        height: "36px",
        background: "#1A0A14",
        borderBottom: "1px solid rgba(196,163,115,0.12)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        position: "relative",
        zIndex: 50,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Double-render for seamless loop: animation shifts -50% then resets */}
      <div
        className={`animate-marquee${paused ? " animate-marquee-paused" : ""}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          animationDuration: `${speed}s`,
          willChange: "transform",
        }}
      >
        {/* Copy 1 */}
        <span style={{ display: "inline-flex", alignItems: "center", paddingLeft: "2rem" }}>
          {strip}
        </span>
        {/* Copy 2 — identical, sits immediately after copy 1 */}
        <span style={{ display: "inline-flex", alignItems: "center", paddingLeft: "2rem" }}>
          {strip}
        </span>
      </div>
    </div>
  );
}
