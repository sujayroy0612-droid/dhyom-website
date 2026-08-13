import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createServerClient } from "@/lib/supabase/server";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  label: string;
  imageUrl: string;
}

interface OrderRecord {
  order_number: string;
  first_name: string;
  last_name: string;
  email: string;
  shipping_street: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;
  order_notes: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  payment_method: "cod" | "online";
  payment_status: "pending" | "paid" | "failed";
  order_status: string;
  created_at: string;
}

interface PageProps {
  params: { orderNumber: string };
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderNumber } = params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .single();

  if (error || !data) notFound();

  const order = data as OrderRecord;

  return (
    <div className="min-h-screen bg-black-plum">
      <div className="pt-24 pb-20 max-w-2xl mx-auto px-6">

        {/* ── Header ── */}
        <div className="text-center mb-12">
          <div className="w-14 h-14 rounded-full border border-[rgba(196,163,115,0.22)] flex items-center justify-center mx-auto mb-8">
            <svg
              width="20"
              height="16"
              viewBox="0 0 20 16"
              fill="none"
              stroke="rgba(196,163,115,0.75)"
              strokeWidth="1.4"
            >
              <path d="M1 8l5.5 6L19 1" />
            </svg>
          </div>

          <p className="font-display text-[0.56rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.40)] mb-3">
            Order Placed
          </p>
          <h1
            className="font-display text-ivory"
            style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", letterSpacing: "0.05em" }}
          >
            Thank you, {order.first_name}
          </h1>
          <div className="mt-4 mx-auto w-10 h-px bg-[rgba(196,163,115,0.22)]" />
          <p className="mt-6 font-body font-light italic text-[rgba(245,237,224,0.42)] text-base leading-[1.85]">
            Your order has been received and is being prepared with care.
          </p>
        </div>

        {/* ── Order number ── */}
        <div className="bg-damson border border-[rgba(196,163,115,0.14)] rounded-[6px] px-6 py-5 mb-5 text-center">
          <p className="font-display text-[0.52rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.40)] mb-2">
            Order Reference
          </p>
          <p
            className="font-display text-brass"
            style={{ fontSize: "1.1rem", letterSpacing: "0.08em" }}
          >
            {order.order_number}
          </p>
          <p className="font-body font-light text-[rgba(245,237,224,0.32)] text-[0.8rem] mt-2">
            A confirmation has been noted for {order.email}
          </p>
        </div>

        {/* ── Items & totals ── */}
        <div className="bg-damson border border-[rgba(196,163,115,0.14)] rounded-[6px] overflow-hidden mb-5">
          <div className="px-5 pt-4 pb-3.5 border-b border-[rgba(196,163,115,0.10)]">
            <h2
              className="font-display text-ivory"
              style={{ fontSize: "0.75rem", letterSpacing: "0.10em" }}
            >
              Items Ordered
            </h2>
          </div>

          <div className="divide-y divide-[rgba(196,163,115,0.08)]">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 flex-shrink-0 bg-[#270b1b] rounded-[3px] border border-[rgba(196,163,115,0.10)] flex items-center justify-center overflow-hidden relative">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <span className="font-display text-[0.28rem] tracking-[0.1em] uppercase text-[rgba(196,163,115,0.18)]">
                        D
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    {item.label && (
                      <p className="font-display text-[0.44rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.38)] mb-0.5 truncate">
                        {item.label}
                      </p>
                    )}
                    <p
                      className="font-display text-ivory truncate"
                      style={{ fontSize: "0.82rem", letterSpacing: "0.04em" }}
                    >
                      {item.name}
                    </p>
                    <p className="font-body font-light text-[rgba(245,237,224,0.35)] text-[0.75rem] mt-0.5">
                      Qty {item.quantity}
                    </p>
                  </div>
                </div>
                <span
                  className="font-display text-brass flex-shrink-0"
                  style={{ fontSize: "0.87rem", letterSpacing: "0.04em" }}
                >
                  ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-5 pt-3.5 pb-5 border-t border-[rgba(196,163,115,0.10)] flex flex-col gap-2.5">
            <div className="flex justify-between items-baseline">
              <span className="font-body font-light text-[rgba(245,237,224,0.45)] text-[0.85rem]">
                Subtotal
              </span>
              <span
                className="font-display text-ivory"
                style={{ fontSize: "0.85rem", letterSpacing: "0.04em" }}
              >
                ₹{order.subtotal.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="font-body font-light text-[rgba(245,237,224,0.45)] text-[0.85rem]">
                Shipping
              </span>
              <span
                className="font-display text-ivory"
                style={{ fontSize: "0.85rem", letterSpacing: "0.04em" }}
              >
                ₹{order.shipping_fee.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="h-px bg-[rgba(196,163,115,0.12)]" />
            <div className="flex justify-between items-baseline">
              <span
                className="font-display text-ivory"
                style={{ fontSize: "0.85rem", letterSpacing: "0.08em" }}
              >
                Total
              </span>
              <span
                className="font-display text-brass"
                style={{ fontSize: "1.05rem", letterSpacing: "0.04em" }}
              >
                ₹{order.total.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* ── Delivery details ── */}
        <div className="bg-damson border border-[rgba(196,163,115,0.14)] rounded-[6px] px-5 py-5 mb-12">
          <h2
            className="font-display text-ivory mb-3.5"
            style={{ fontSize: "0.75rem", letterSpacing: "0.10em" }}
          >
            Delivery Details
          </h2>
          <p className="font-body font-light text-[rgba(245,237,224,0.52)] text-[0.9rem] leading-[1.85]">
            {order.first_name} {order.last_name}
            <br />
            {order.shipping_street}
            <br />
            {order.shipping_city}, {order.shipping_state} — {order.shipping_pincode}
          </p>
          {order.order_notes && (
            <p className="font-body font-light italic text-[rgba(245,237,224,0.35)] text-[0.84rem] mt-3">
              Note: {order.order_notes}
            </p>
          )}
          <div className="mt-4 pt-4 border-t border-[rgba(196,163,115,0.10)] flex items-center gap-3">
            <span className="font-display text-[0.48rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.38)]">
              {order.payment_method === "cod" ? "Cash on Delivery" : "Paid Online"}
            </span>
            <span className="text-[rgba(196,163,115,0.18)] text-[0.6rem]">·</span>
            <span className="font-display text-[0.48rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.38)]">
              {order.order_status}
            </span>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="text-center">
          <Link
            href="/shop"
            className="inline-flex items-center gap-3 font-display text-[0.6rem] tracking-[0.22em] uppercase text-brass hover:text-ivory border border-[rgba(196,163,115,0.30)] hover:border-[rgba(245,237,224,0.38)] px-8 py-3.5 rounded-[3px] transition-all duration-200 active:scale-[0.98]"
          >
            Continue Shopping
          </Link>
        </div>

      </div>
    </div>
  );
}
