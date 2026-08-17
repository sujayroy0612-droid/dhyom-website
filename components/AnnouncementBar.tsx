"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Message = { id: string; text: string; link_url: string | null };
type BarData = { speed: number; messages: Message[] } | null;

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
      <Link href={link_url} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
        {inner}
      </Link>
    );
  }
  return <span style={{ display: "inline-flex", alignItems: "center" }}>{inner}</span>;
}

export default function AnnouncementBar() {
  const pathname  = usePathname();
  const [data,    setData]   = useState<BarData>(null);
  const [paused,  setPaused] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/fragrance-guide")) {
      document.documentElement.style.setProperty("--bar-height", "0px");
      return;
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    (async () => {
      const { data: settings } = await sb
        .from("announcement_bar")
        .select("enabled, speed")
        .single();

      if (!settings?.enabled) {
        document.documentElement.style.setProperty("--bar-height", "0px");
        return;
      }

      const { data: messages } = await sb
        .from("announcement_messages")
        .select("id, text, link_url, sort_order")
        .eq("active", true)
        .order("sort_order");

      if (messages?.length) {
        setData({ speed: settings.speed ?? 30, messages });
        document.documentElement.style.setProperty("--bar-height", "36px");
      } else {
        document.documentElement.style.setProperty("--bar-height", "0px");
      }
    })();

    return () => {
      document.documentElement.style.setProperty("--bar-height", "0px");
    };
  }, [pathname]);

  if (!data) return null;

  const { speed, messages } = data;

  // Repeat each message 10× per half so the strip is always wider than the viewport,
  // ensuring the translateX(-50%) marquee has no visible gap even with a single short message.
  const loopItems = Array.from({ length: 10 }, (_, rep) =>
    messages.map((m) => (
      <span key={`${rep}-${m.id}`} style={{ display: "inline-flex", alignItems: "center" }}>
        <MessageItem text={m.text} link_url={m.link_url} />
        {DOT}
      </span>
    ))
  ).flat();

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "36px",
        background: "#1A0A14",
        borderBottom: "1px solid rgba(196,163,115,0.12)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        zIndex: 51,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={`animate-marquee${paused ? " animate-marquee-paused" : ""}`}
        style={{ display: "inline-flex", alignItems: "center", animationDuration: `${speed}s`, willChange: "transform" }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", paddingLeft: "2rem" }}>{loopItems}</span>
        <span style={{ display: "inline-flex", alignItems: "center", paddingLeft: "2rem" }}>{loopItems}</span>
      </div>
    </div>
  );
}
