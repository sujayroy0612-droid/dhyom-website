import type { Metadata } from "next";
import PolicyLayout from "@/components/PolicyLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — Dhyom",
  description: "How Dhyom collects, uses, and protects your personal information.",
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

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout eyebrow="Legal" title="Privacy Policy" lastUpdated="August 2026">

      <Section title="1. Information We Collect">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="2. How We Use Your Information">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="3. Sharing of Information">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="4. Data Security">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="5. Cookies">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="6. Your Rights">
        <p>[Content to be added]</p>
      </Section>

      {divider}

      <Section title="7. Contact Us">
        <p>[Content to be added]</p>
      </Section>

    </PolicyLayout>
  );
}
