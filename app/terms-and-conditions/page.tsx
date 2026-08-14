import type { Metadata } from "next";
import PolicyLayout from "@/components/PolicyLayout";

export const metadata: Metadata = {
  title: "Terms & Conditions — Dhyom",
  description: "Terms and conditions governing the use of Dhyom's website and services.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2
        className="font-display text-ivory"
        style={{ fontSize: "1rem", letterSpacing: "0.08em" }}
      >
        {title}
      </h2>
      <div className="font-body font-light text-[rgba(245,237,224,0.55)] text-[0.95rem] leading-[1.9] flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}

const divider = <div className="h-px bg-[rgba(196,163,115,0.10)]" />;

export default function TermsAndConditionsPage() {
  return (
    <PolicyLayout eyebrow="Legal" title="Terms & Conditions" lastUpdated="August 2026">

      <Section title="1. Acceptance of Terms">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="2. Products and Pricing">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="3. Orders and Payment">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="4. Intellectual Property">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="5. Limitation of Liability">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="6. Changes to Terms">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="7. Governing Law">
        <p>[Content to be added]</p>
      </Section>

    </PolicyLayout>
  );
}
