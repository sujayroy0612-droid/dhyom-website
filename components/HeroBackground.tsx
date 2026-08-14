"use client";

import { useEffect, useRef } from "react";

interface Props {
  videoSrc: string;
  posterUrl?: string;
}

export default function HeroBackground({ videoSrc, posterUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Desktop: do nothing — static image stays visible
    if (!window.matchMedia("(max-width: 767px)").matches) return;

    const video = videoRef.current;
    if (!video) return;

    // React's `muted` JSX prop is unreliable on Chrome and iOS Safari
    video.muted = true;
    video.play().catch(() => {});
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
      // Hidden on desktop via CSS — no JS needed to hide, and src is already
      // set so the browser may buffer it, but play() is never called on desktop
      className="absolute inset-0 w-full h-full object-cover md:hidden"
    />
  );
}
