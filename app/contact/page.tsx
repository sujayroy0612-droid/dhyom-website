import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact — Dhyom",
  description: "Get in touch with Dhyom. We're available on WhatsApp for any questions about your order or our products.",
};

const WA_URL =
  "https://wa.me/918986995277?text=Hi%21%20I%20have%20a%20question%20about%20Dhyom%20products.";

const WA_NUMBER_DISPLAY = "+91 89869 95277";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-black-plum">

      {/* ── Header ── */}
      <section className="bg-damson pt-28 pb-16 px-6 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(107,42,72,0.30) 0%, transparent 70%)",
          }}
        />
        <div className="max-w-2xl mx-auto relative text-center">
          <p className="font-display text-[0.58rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.50)] mb-4">
            We're Here
          </p>
          <h1
            className="font-display text-ivory"
            style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "0.05em" }}
          >
            Get in Touch
          </h1>
          <div className="w-10 h-px bg-[rgba(196,163,115,0.35)] mt-5 mx-auto" />
        </div>
      </section>

      {/* ── Main content ── */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto flex flex-col gap-10">

          {/* WhatsApp — primary contact */}
          <div className="bg-damson border border-[rgba(196,163,115,0.18)] rounded-[6px] overflow-hidden">
            <div className="p-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">

              {/* WA icon circle */}
              <div
                className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.30)]"
                style={{ background: "#C4A373" }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </div>

              {/* Text + CTA */}
              <div className="flex-1 flex flex-col gap-4">
                <div>
                  <p className="font-display text-[0.54rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.50)] mb-1">
                    WhatsApp
                  </p>
                  <h2
                    className="font-display text-ivory"
                    style={{ fontSize: "1.15rem", letterSpacing: "0.04em" }}
                  >
                    Chat with Us
                  </h2>
                  <p className="font-body font-light italic text-[rgba(245,237,224,0.45)] text-[0.95rem] mt-1.5 leading-relaxed">
                    The fastest way to reach us — product questions, order
                    status, or anything else. We typically reply within a
                    few hours.
                  </p>
                  <p className="font-display text-brass text-[0.75rem] tracking-[0.06em] mt-2">
                    {WA_NUMBER_DISPLAY}
                  </p>
                </div>

                <Link
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start inline-flex items-center gap-2.5 font-display text-[0.60rem] tracking-[0.20em] uppercase text-ink bg-brass hover:bg-[#d4b383] px-6 py-2.5 rounded-full transition-colors duration-200 active:scale-[0.97]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Open WhatsApp
                </Link>
              </div>
            </div>
          </div>

          {/* Hours note */}
          <div className="text-center">
            <p className="font-display text-[0.54rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.38)] mb-2">
              Support Hours
            </p>
            <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-[0.95rem]">
              Monday – Saturday, 10 am – 7 pm IST
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-[rgba(196,163,115,0.10)]" />

          {/* Quick links */}
          <div className="text-center flex flex-col gap-5">
            <p className="font-display text-[0.54rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.38)]">
              Looking for something?
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/shop"
                className="font-display text-[0.58rem] tracking-[0.18em] uppercase text-brass hover:text-ivory border border-[rgba(196,163,115,0.25)] hover:border-[rgba(245,237,224,0.35)] px-5 py-2.5 rounded-[3px] transition-all duration-200"
              >
                Browse Products
              </Link>
              <Link
                href="/cart"
                className="font-display text-[0.58rem] tracking-[0.18em] uppercase text-brass hover:text-ivory border border-[rgba(196,163,115,0.25)] hover:border-[rgba(245,237,224,0.35)] px-5 py-2.5 rounded-[3px] transition-all duration-200"
              >
                View Cart
              </Link>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
