import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact — Dhyom",
  description: "Get in touch with Dhyom — orders, questions, or bulk enquiries.",
};

const WA_URL      = "https://wa.me/918986995277?text=Hi%21%20I%20have%20a%20question%20about%20Dhyom%20products.";
const WA_DISPLAY  = "+91 89869 95277";
const EMAIL       = "dhyomecom@gmail.com";
const radial      = "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(107,42,72,0.30) 0%, transparent 70%)";

const WA_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-black-plum">

      {/* ── Header ── */}
      <section className="bg-damson pt-28 pb-20 px-6 relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: radial }} />
        <div className="max-w-2xl mx-auto relative">
          <p className="font-display text-[0.58rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.50)] mb-5">
            Contact
          </p>
          <h1
            className="font-display text-ivory"
            style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", letterSpacing: "0.05em", lineHeight: 1.15 }}
          >
            Get in Touch
          </h1>
          <p className="mt-5 font-body font-light italic text-[rgba(245,237,224,0.45)] text-[1rem] leading-[1.85] max-w-md">
            We&rsquo;re here to help with orders, questions, or anything else you&rsquo;d like to know.
          </p>
          <div className="mt-6 w-10 h-px bg-[rgba(196,163,115,0.35)]" />
        </div>
      </section>

      {/* ── Contact details ── */}
      <section className="px-6 pt-16 pb-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-8">

          {/* Email + WhatsApp */}
          <div className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-full border border-[rgba(196,163,115,0.22)] flex items-center justify-center flex-shrink-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(196,163,115,0.65)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m2 7 10 7 10-7" />
                </svg>
              </div>
              <div>
                <p className="font-display text-[0.48rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.45)] mb-0.5">Email</p>
                <a
                  href={`mailto:${EMAIL}`}
                  className="font-body font-light text-[rgba(245,237,224,0.72)] text-[0.98rem] hover:text-ivory transition-colors duration-200"
                >
                  {EMAIL}
                </a>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-ink" style={{ background: "#C4A373" }}>
                {WA_ICON}
              </div>
              <div>
                <p className="font-display text-[0.48rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.45)] mb-0.5">WhatsApp</p>
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body font-light text-[rgba(245,237,224,0.72)] text-[0.98rem] hover:text-ivory transition-colors duration-200"
                >
                  {WA_DISPLAY}
                </a>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-2">
            <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-[0.90rem] leading-[1.85]">
              Based in Patna, Bihar.
            </p>
            <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-[0.90rem] leading-[1.85]">
              For order-specific queries, please include your order number so we can help faster.
            </p>
          </div>

        </div>
      </section>

      {/* ── Inquiry form ── */}
      <section className="px-6 pt-10 pb-24">
        <div className="max-w-2xl mx-auto flex flex-col gap-8">

          <div className="h-px bg-[rgba(196,163,115,0.12)]" />

          <div className="flex flex-col gap-2">
            <h2
              className="font-display text-brass"
              style={{ fontSize: "0.62rem", letterSpacing: "0.28em", textTransform: "uppercase" }}
            >
              Send a Message
            </h2>
            <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-[0.88rem]">
              General questions and bulk order requests welcome.
            </p>
          </div>

          <ContactForm />

        </div>
      </section>

    </div>
  );
}
