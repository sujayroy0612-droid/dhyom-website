import type { ReactNode } from "react";

interface Props {
  eyebrow: string;
  title: string;
  lastUpdated?: string;
  children: ReactNode;
}

export default function PolicyLayout({ eyebrow, title, lastUpdated, children }: Props) {
  return (
    <div className="min-h-screen bg-black-plum">

      {/* Header */}
      <section className="bg-damson pt-28 pb-16 px-6 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(107,42,72,0.30) 0%, transparent 70%)" }}
        />
        <div className="max-w-2xl mx-auto relative text-center">
          <p className="font-display text-[0.58rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.50)] mb-4">
            {eyebrow}
          </p>
          <h1
            className="font-display text-ivory"
            style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "0.05em" }}
          >
            {title}
          </h1>
          {lastUpdated && (
            <p className="font-body font-light italic text-[rgba(245,237,224,0.30)] text-sm mt-4">
              Last updated: {lastUpdated}
            </p>
          )}
          <div className="w-10 h-px bg-[rgba(196,163,115,0.35)] mt-5 mx-auto" />
        </div>
      </section>

      {/* Body */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto flex flex-col gap-10">
          {children}
        </div>
      </section>

    </div>
  );
}
