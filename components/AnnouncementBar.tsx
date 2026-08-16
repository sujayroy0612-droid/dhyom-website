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
    if (pathname.startsWith("/admin") || pathname.startsWith("/fragrance-guide")) return;

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    (async () => {
      const { data: settings } = await sb
        .from("announcement_bar")
        .select("enabled, speed")
        .single();

      if (!settings?.enabled) return;

      const { data: messages } = await sb
        .from("announcement_messages")
        .select("id, text, link_url, sort_order")
        .eq("active", true)
        .order("sort_order");

      if (messages?.length) {
        setData({ speed: settings.speed ?? 30, messages });
      }
    })();
  }, [pathname]);

  if (!data) return null;

  const { speed, messages } = data;

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
        zIndex: 40,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={`animate-marquee${paused ? " animate-marquee-paused" : ""}`}
        style={{ display: "inline-flex", alignItems: "center", animationDuration: `${speed}s`, willChange: "transform" }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", paddingLeft: "2rem" }}>{strip}</span>
        <span style={{ display: "inline-flex", alignItems: "center", paddingLeft: "2rem" }}>{strip}</span>
      </div>
    </div>
  );
}
