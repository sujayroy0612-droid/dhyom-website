"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { label: "Home",    href: "/" },
  { label: "Shop",    href: "/shop" },
  { label: "About",   href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[rgba(26,10,20,0.92)] backdrop-blur-md border-b border-[rgba(196,163,115,0.14)]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo / Wordmark */}
        <Link href="/" className="flex items-center gap-3 group">
          {/* Placeholder ring — swap for <Image> asset when ready */}
          <div className="w-7 h-7 rounded-full border border-[rgba(196,163,115,0.5)] flex items-center justify-center">
            <span className="font-display text-[0.55rem] tracking-[0.15em] text-brass">D</span>
          </div>
          <span className="font-display text-base tracking-[0.18em] text-brass group-hover:text-ivory transition-colors duration-200">
            DHYOM
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "font-display text-[0.62rem] tracking-[0.2em] uppercase transition-colors duration-200",
                  active
                    ? "text-brass"
                    : "text-[rgba(245,237,224,0.50)] hover:text-ivory",
                ].join(" ")}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-[rgba(245,237,224,0.5)] hover:text-ivory transition-colors"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
            {menuOpen ? (
              <>
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </>
            ) : (
              <>
                <line x1="3" y1="6"  x2="17" y2="6"  />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="14" x2="17" y2="14" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-[rgba(196,163,115,0.12)] bg-damson px-6 py-5 flex flex-col gap-5">
          {navLinks.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={[
                  "font-display text-[0.62rem] tracking-[0.2em] uppercase transition-colors duration-200",
                  active ? "text-brass" : "text-[rgba(245,237,224,0.50)] hover:text-ivory",
                ].join(" ")}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
