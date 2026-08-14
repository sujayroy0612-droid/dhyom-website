"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  videoSrc: string;
  posterUrl?: string;
}

/**
 * Renders a full-cover autoplay video on screens ≥ 768 px (tablet/desktop).
 * On mobile the src is never set, so no video bytes are downloaded.
 * The static <Image> rendered behind this in page.tsx stays visible on mobile
 * and serves as the fallback if the browser blocks autoplay on desktop.
 */
export default function HeroBackground({ videoSrc, posterUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Skip video entirely on mobile/small screens
    if (window.matchMedia("(max-width: 767px)").matches) return;

    const video = videoRef.current;
    if (!video) return;

    video.src = videoSrc;
    video.load();
    video.play().catch(() => {
      // Autoplay blocked by browser — poster / static image stays visible
    });

    setVisible(true);
  }, [videoSrc]);

  return (
    // Always mount the element so the ref is available on hydration;
    // keep it invisible until src is set to avoid a black flash.
    <video
      ref={videoRef}
      loop
      muted
      playsInline
      poster={posterUrl}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
      style={{ opacity: visible ? 1 : 0 }}
    />
  );
}
