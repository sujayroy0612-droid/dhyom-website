"use client";

import { useEffect, useRef } from "react";

interface Props {
  videoSrc: string;
  posterUrl?: string;
}

export default function HeroBackground({ videoSrc, posterUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Skip on mobile — static image underneath handles that
    if (window.matchMedia("(max-width: 767px)").matches) return;

    const video = videoRef.current;
    if (!video) return;

    // React's `muted` JSX prop is unreliable — set it directly on the DOM node
    // so Chrome's autoplay policy (which requires muted) is satisfied
    video.muted = true;
    video.src = videoSrc;
    video.load();
    video.play().catch(() => {
      // Autoplay still blocked — poster / static image shows as fallback
    });
  }, [videoSrc]);

  return (
    <video
      ref={videoRef}
      loop
      muted
      playsInline
      poster={posterUrl}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}
