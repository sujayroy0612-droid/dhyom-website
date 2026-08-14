import type { Metadata } from "next";
import PolicyLayout from "@/components/PolicyLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — Dhyom",
  description: "How Dhyom collects, uses, and protects your personal information.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-ivory" style={{ fontSize: "1rem", letterSpacing: "0.08em" }}>
        {title}
      </h2>
      <div className="font-body font-light text-[rgba(245,237,224,0.55)] text-[0.95rem] leading-[1.9] flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="text-[rgba(196,163,115,0.45)] flex-shrink-0 select-none">—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const divider = <div className="h-px bg-[rgba(196,163,115,0.10)]" />;

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout eyebrow="Legal" title="Privacy Policy" lastUpdated="14 August 2026">

      {/* Intro */}
      <p className="font-body font-light text-[rgba(245,237,224,0.55)] text-[0.95rem] leading-[1.9]">
        Dhyom (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;), operated by Sujay, trading as Yukti, is committed to protecting your privacy. This policy explains how we collect, use, and protect your personal information when you use dhyom.in.
      </p>

      {divider}

      <Section title="Information We Collect">
        <Bullets items={[
          "Contact details you provide at checkout: name, email, phone number, shipping address",
          "Payment information, processed securely by Razorpay — we do not store your card, UPI, or banking details on our servers",
          "Browsing behaviour on our site (via standard analytics/cookies) to improve your experience",
        ]} />
      </Section>

      {divider}

      <Section title="How We Use Your Information">
        <Bullets items={[
          "To process and deliver your orders",
          "To send order confirmations, shipping updates, and customer support communication",
          "To send occasional newsletters, only if you've opted in — you can unsubscribe anytime",
          "We do not sell or rent your personal information to third parties",
        ]} />
      </Section>

      {divider}

      <Section title="Data Security">
        <p>We use industry-standard measures to protect your data. Payment processing is handled entirely by Razorpay, a PCI-DSS compliant payment gateway.</p>
      </Section>

      {divider}

      <Section title="Your Rights">
        <p>You may request access to, correction of, or deletion of your personal data by writing to dhyomecom@gmail.com.</p>
      </Section>

      {divider}

      <Section title="Grievance Officer">
        <p>For any privacy-related concerns, contact:</p>
        <div className="flex flex-col gap-1 font-body font-light text-[rgba(245,237,224,0.42)] text-[0.90rem] leading-[1.8]">
          <span>Sujay, trading as Yukti</span>
          <span>Email: dhyomecom@gmail.com</span>
          <span>Ground Floor, Road Number 8A, near Ideal Public School, Rajiv Nagar, Patna, Bihar – 800024</span>
        </div>
      </Section>

    </PolicyLayout>
  );
}
