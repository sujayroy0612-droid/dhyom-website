"use client";

import { useEffect, useState } from "react";

const CONSENT_KEY = "cookie-consent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function applyGrant() {
  window.gtag?.("consent", "update", {
    ad_storage: "granted",
    analytics_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
  if (typeof window.fbq === "function") window.fbq("consent", "grant");
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored === "granted") {
        applyGrant();
      } else if (!stored) {
        setVisible(true);
      }
      // "denied" → defaults are already denied; nothing to do
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    try { localStorage.setItem(CONSENT_KEY, "granted"); } catch {}
    applyGrant();
    setVisible(false);
  }

  function reject() {
    try { localStorage.setItem(CONSENT_KEY, "denied"); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-[rgba(196,163,115,0.18)] bg-ink/95 backdrop-blur-sm"
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="font-body text-[rgba(245,237,224,0.65)] text-sm leading-snug">
          We use cookies for analytics and personalised marketing.{" "}
          <a
            href="/privacy-policy"
            className="text-brass underline underline-offset-2 hover:text-ivory transition-colors"
          >
            Privacy Policy
          </a>
          .
        </p>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={reject}
            className="font-display text-[0.6rem] tracking-[0.18em] uppercase text-[rgba(245,237,224,0.40)] hover:text-ivory transition-colors duration-150 px-3 py-1.5"
          >
            Reject
          </button>
          <button
            onClick={accept}
            className="font-display text-[0.6rem] tracking-[0.18em] uppercase text-ink bg-brass hover:bg-ivory transition-colors duration-150 px-4 py-1.5"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
