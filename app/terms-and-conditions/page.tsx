import type { Metadata } from "next";
import PolicyLayout from "@/components/PolicyLayout";

export const metadata: Metadata = {
  title: "Terms & Conditions — Dhyom",
  description: "Terms and conditions governing the use of Dhyom's website and services.",
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

const divider = <div className="h-px bg-[rgba(196,163,115,0.10)]" />;

export default function TermsAndConditionsPage() {
  return (
    <PolicyLayout eyebrow="Legal" title="Terms & Conditions" lastUpdated="14 August 2026">

      {/* Intro */}
      <p className="font-body font-light text-[rgba(245,237,224,0.55)] text-[0.95rem] leading-[1.9]">
        Welcome to dhyom.in, operated by Sujay, trading as Yukti (GSTIN: 10EFQPS4606H1ZC). By accessing or using this website, you agree to the following terms.
      </p>

      {divider}

      <Section title="Use of Website">
        <p>This site is intended for customers purchasing genuine products for personal or gifting use. You agree not to misuse the site, attempt unauthorized access, or use it for any unlawful purpose.</p>
      </Section>

      {divider}

      <Section title="Product Information">
        <p>We make every effort to display accurate product descriptions, images, and pricing. Minor variations in colour or appearance may occur due to the handcrafted nature of some products and photography/screen differences.</p>
      </Section>

      {divider}

      <Section title="Pricing & Payment">
        <p>All prices are listed in Indian Rupees (INR) and are inclusive of applicable GST unless stated otherwise. Payment is accepted via Razorpay (cards, UPI, net banking). All orders are prepaid — Cash on Delivery is not available.</p>
      </Section>

      {divider}

      <Section title="Order Acceptance">
        <p>An order is confirmed only once payment is successfully processed. We reserve the right to cancel any order due to stock unavailability, pricing errors, or suspected fraudulent activity, in which case a full refund will be issued.</p>
      </Section>

      {divider}

      <Section title="Intellectual Property">
        <p>All content on this site — including the Dhyom name, logo, product photography, and written content — is the property of Sujay, trading as Yukti, and may not be reproduced without permission.</p>
      </Section>

      {divider}

      <Section title="Limitation of Liability">
        <p>Dhyom is not liable for indirect or consequential damages arising from the use of our products or website, beyond the value of the order placed.</p>
      </Section>

      {divider}

      <Section title="Governing Law">
        <p>These terms are governed by the laws of India, with jurisdiction in Patna, Bihar.</p>
      </Section>

      {divider}

      <Section title="Contact">
        <p>Sujay, trading as Yukti — <span className="text-[rgba(196,163,115,0.65)]">dhyomecom@gmail.com</span></p>
      </Section>

    </PolicyLayout>
  );
}
