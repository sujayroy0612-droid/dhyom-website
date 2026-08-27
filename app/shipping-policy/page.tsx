import type { Metadata } from "next";
import PolicyLayout from "@/components/PolicyLayout";

export const metadata: Metadata = {
  title: "Shipping Policy — Dhyom",
  description: "Dhyom's shipping timelines, charges, and delivery information.",
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

export default function ShippingPolicyPage() {
  return (
    <PolicyLayout eyebrow="Legal" title="Shipping Policy" lastUpdated="14 August 2026">

      <Section title="Delivery Timeframe">
        <p>Orders are typically dispatched within 1–2 business days of confirmation and delivered within 5–7 business days, depending on your location. Delivery times may vary during festive periods or due to courier delays beyond our control.</p>
      </Section>

      {divider}

      <Section title="Shipping Charges">
        <p>Shipping is free on all orders of ₹1,500 or above. Below ₹1,500, shipping is calculated live based on your delivery pincode and the actual courier rate — you see the exact charge at checkout before placing your order.</p>
      </Section>

      {divider}

      <Section title="Order Tracking">
        <p>Once your order is shipped, you will receive tracking details via email/WhatsApp.</p>
      </Section>

      {divider}

      <Section title="Delivery Areas">
        <p>We currently ship across India. If your pin code is not serviceable, you will be notified before payment is processed.</p>
      </Section>

      {divider}

      <Section title="Delays">
        <p>While we strive to meet delivery estimates, Dhyom is not liable for delays caused by the courier partner, weather, natural events, or circumstances beyond our reasonable control.</p>
      </Section>

      {divider}

      <Section title="Contact">
        <p>For shipping queries: <span className="text-[rgba(196,163,115,0.65)]">dhyomecom@gmail.com</span></p>
      </Section>

    </PolicyLayout>
  );
}
