import type { Metadata } from "next";
import PolicyLayout from "@/components/PolicyLayout";

export const metadata: Metadata = {
  title: "Return & Refund Policy — Dhyom",
  description: "Dhyom's return eligibility, refund timelines, and exchange process.",
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

export default function ReturnRefundPolicyPage() {
  return (
    <PolicyLayout eyebrow="Legal" title="Return & Refund Policy" lastUpdated="August 2026">

      <Section title="1. Return Eligibility">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="2. Non-Returnable Items">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="3. How to Initiate a Return">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="4. Refund Timeline">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="5. Damaged or Incorrect Items">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="6. Exchanges">
        <p>[Content to be added]</p>
      </Section>

    </PolicyLayout>
  );
}
