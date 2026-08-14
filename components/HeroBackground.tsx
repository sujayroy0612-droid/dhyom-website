"use client";

import { useEffect, useRef } from "react";

interface Props {
  videoSrc: string;
  posterUrl?: string;
}

export default function HeroBackground({ videoSrc, posterUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // React's `muted` JSX prop is unreliable on both Chrome and iOS Safari.
    // Setting it directly on the DOM node is required for autoplay to work.
    video.muted = true;
    video.play().catch(() => {
      // Autoplay still blocked — poster stays visible as fallback
    });
  }, []);

  return (
    <video
      ref={videoRef}
      src={videoSrc}
      autoPlay
      loop
      muted
      playsInline
      poster={posterUrl}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}
