import Link from "next/link";
import Image from "next/image";

const navLinks = [
  { label: "Home",    href: "/" },
  { label: "Shop",    href: "/shop" },
  { label: "About",   href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Footer({ logoUrl }: { logoUrl?: string | null }) {
  return (
    <footer className="bg-ink border-t border-[rgba(196,163,115,0.10)]">
      <div className="max-w-5xl mx-auto px-6 py-16 flex flex-col items-center gap-10">

        {/* Logo / Wordmark */}
        <Link href="/" className="flex items-center gap-3 group">
          {logoUrl ? (
            <div className="relative h-8 w-32">
              <Image
                src={logoUrl}
                alt="Dhyom"
                fill
                className="object-contain object-left"
                sizes="128px"
              />
            </div>
          ) : (
            <>
              <div className="w-7 h-7 rounded-full border border-[rgba(196,163,115,0.40)] flex items-center justify-center">
                <span className="font-display text-[0.55rem] tracking-[0.15em] text-brass">D</span>
              </div>
              <span className="font-display text-base tracking-[0.18em] text-brass group-hover:text-ivory transition-colors duration-200">
                DHYOM
              </span>
            </>
          )}
        </Link>

        {/* Tagline */}
        <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-sm tracking-wide text-center -mt-4">
          Bring the Sacred Home
        </p>

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

        {/* Social + legal row */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-10 text-center">
          <a
            href="https://instagram.com/dhyom.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-display text-[0.58rem] tracking-[0.2em] uppercase text-[rgba(196,163,115,0.55)] hover:text-brass transition-colors duration-200"
          >
            Instagram — @dhyom.in
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
