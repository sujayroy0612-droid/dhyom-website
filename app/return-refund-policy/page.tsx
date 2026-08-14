import type { Metadata } from "next";
import PolicyLayout from "@/components/PolicyLayout";

export const metadata: Metadata = {
  title: "Return & Refund Policy — Dhyom",
  description: "Dhyom's return eligibility, refund timelines, and exchange process.",
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

export default function ReturnRefundPolicyPage() {
  return (
    <PolicyLayout eyebrow="Legal" title="Return & Refund Policy" lastUpdated="14 August 2026">

      <Section title="Replacement / Refund Window">
        <p>We offer a 7-day replacement or refund window from the date of delivery.</p>
      </Section>

      {divider}

      <Section title="Eligibility">
        <Bullets items={[
          "Product must be unused, in its original packaging, and in the same condition you received it",
          "Applies to: damaged items received, incorrect items shipped, or manufacturing defects",
          "Does not apply to: products damaged due to misuse after delivery, or change-of-mind returns on used items",
        ]} />
      </Section>

      {divider}

      <Section title="How to Request a Return">
        <p>Email dhyomecom@gmail.com within 7 days of delivery with your order number and photos of the issue (if applicable). We&rsquo;ll respond within 2 business days with next steps.</p>
      </Section>

      {divider}

      <Section title="Refund Process">
        <p>Once your return is approved and the item is received back (if applicable), refunds are processed to your original payment method within 5–7 business days.</p>
      </Section>

      {divider}

      <Section title="Order Cancellation">
        <p>Orders can be cancelled only before they are dispatched. Once shipped, an order cannot be cancelled — the return process applies instead.</p>
      </Section>

      {divider}

      <Section title="Contact">
        <p>For return/refund requests: <span className="text-[rgba(196,163,115,0.65)]">dhyomecom@gmail.com</span></p>
      </Section>

    </PolicyLayout>
  );
}
