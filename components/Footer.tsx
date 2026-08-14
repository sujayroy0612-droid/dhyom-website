import Link from "next/link";
import Image from "next/image";

const navLinks = [
  { label: "Home",    href: "/" },
  { label: "Shop",    href: "/shop" },
  { label: "About",   href: "/about" },
  { label: "Contact", href: "/contact" },
];

const legalLinks = [
  { label: "Privacy Policy",       href: "/privacy-policy" },
  { label: "Terms & Conditions",   href: "/terms-and-conditions" },
  { label: "Shipping Policy",      href: "/shipping-policy" },
  { label: "Return & Refund",      href: "/return-refund-policy" },
];

export default function Footer({ logoUrl }: { logoUrl?: string | null }) {
  return (
    <footer className="bg-ink border-t border-[rgba(196,163,115,0.10)]">
      <div className="max-w-5xl mx-auto px-6 py-16 flex flex-col items-center gap-10">

        {/* Logo + Tagline */}
        <div className="flex flex-col items-center gap-2">
          <Link href="/" className="flex flex-col items-center group">
            {logoUrl ? (
              <div className="relative h-20 w-56">
                <Image
                  src={logoUrl}
                  alt="Dhyom"
                  fill
                  className="object-contain object-center"
                  sizes="224px"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full border border-[rgba(196,163,115,0.40)] flex items-center justify-center">
                  <span className="font-display text-[0.55rem] tracking-[0.15em] text-brass">D</span>
                </div>
                <span className="font-display text-base tracking-[0.18em] text-brass group-hover:text-ivory transition-colors duration-200">
                  DHYOM
                </span>
              </div>
            )}
          </Link>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-sm tracking-wide text-center">
            Bring the Sacred Home
          </p>
        </div>

        {/* Nav */}
        <nav className="flex flex-wrap justify-center gap-8">
          {navLinks.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="font-display text-[0.58rem] tracking-[0.22em] uppercase text-[rgba(245,237,224,0.38)] hover:text-ivory transition-colors duration-200"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Brass rule */}
        <div className="w-16 h-px bg-[rgba(196,163,115,0.22)]" />

        {/* Legal links */}
        <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {legalLinks.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="font-display text-[0.50rem] tracking-[0.16em] uppercase text-[rgba(245,237,224,0.22)] hover:text-[rgba(245,237,224,0.48)] transition-colors duration-200"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Thin separator */}
        <div className="w-full max-w-xs h-px bg-[rgba(196,163,115,0.08)]" />

        {/* Social + copyright */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-10 text-center">
          <a
            href="https://instagram.com/dhyom.in"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow Dhyom on Instagram"
            className="flex items-center gap-2 text-[rgba(196,163,115,0.55)] hover:text-brass transition-colors duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
            </svg>
            <span className="font-display text-[0.58rem] tracking-[0.2em] uppercase">Follow us</span>
          </a>
          <span className="hidden sm:block w-px h-3 bg-[rgba(196,163,115,0.18)]" />
          <p className="font-display text-[0.55rem] tracking-[0.18em] uppercase text-[rgba(245,237,224,0.22)]">
            © {new Date().getFullYear()} Dhyom. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}
