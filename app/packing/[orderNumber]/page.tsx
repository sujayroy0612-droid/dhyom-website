import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

interface RawItem {
  kind?: string;
  id?: string;
  name?: string;
  tierName?: string;
  boxName?: string;
  price?: number;
  quantity?: number;
  label?: string;
  imageUrl?: string;
  giftMessage?: string;
  hidePrices?: boolean;
  selections?: { slotLabel: string; productName: string; productLabel?: string }[];
}

export default async function PackingSlipPage({ params }: { params: { orderNumber: string } }) {
  const { orderNumber } = params;
  const sb = adminClient();

  const { data: order, error } = await sb
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .single();

  if (error || !order) notFound();

  const items = (order.items ?? []) as RawItem[];

  // Any hamper in the order with hidePrices=true → hide prices globally
  const anyHidePrice = items.some(i => i.kind === "hamper" && i.hidePrices);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Packing Slip — {orderNumber}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Georgia, serif; font-size: 12px; color: #111; background: #fff; padding: 32px; max-width: 720px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
          .brand { font-size: 22px; letter-spacing: 0.12em; font-weight: bold; }
          .sub { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #666; margin-top: 2px; }
          .meta p { margin-bottom: 3px; font-size: 11px; }
          .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; font-weight: bold; margin-bottom: 4px; }
          .addr-block { display: flex; gap: 24px; border: 1px solid #ccc; padding: 12px; margin-bottom: 16px; }
          .addr-block > div { flex: 1; }
          .addr-block h3 { font-size: 15px; margin-bottom: 4px; }
          .divider { border-top: 1px solid #ddd; margin: 12px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #eee; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; padding: 6px 8px; text-align: left; border: 1px solid #ccc; }
          td { padding: 7px 8px; border: 1px solid #e0e0e0; vertical-align: top; font-size: 11px; }
          .hamper-selections { margin-top: 4px; padding-top: 4px; border-top: 1px dashed #ddd; }
          .hamper-slot { font-size: 10px; color: #555; margin-bottom: 2px; }
          .gift-msg { margin-top: 4px; font-style: italic; font-size: 10px; color: #666; border-left: 2px solid #ccc; padding-left: 6px; }
          .footer { border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; color: #888; }
          @media print { body { padding: 16px; } button { display: none; } }
        `}</style>
      </head>
      <body>
        <div className="header">
          <div>
            <div className="brand">DHYOM</div>
            <div className="sub">Sacred Home &amp; Pooja Décor</div>
          </div>
          <div className="meta" style={{ textAlign: "right" }}>
            <p><strong>Packing Slip</strong></p>
            <p>Order: <strong>{order.order_number}</strong></p>
            <p>Date: {fmtDate(order.created_at)}</p>
            <p>Status: {order.order_status}</p>
          </div>
        </div>

        <div className="addr-block">
          <div>
            <div className="label">Ship To</div>
            <h3>{order.customer_name}</h3>
            <p>{order.address}</p>
            <p>Ph: {order.phone}</p>
            {order.email && <p>{order.email}</p>}
          </div>
          <div>
            <div className="label">Ship From</div>
            <p><strong>Yukti (Dhyom)</strong></p>
            <p>Patna, Bihar – 800024</p>
            <p>hello@dhyom.in</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: "50%" }}>Item</th>
              <th style={{ width: "15%", textAlign: "center" }}>Qty</th>
              {!anyHidePrice && <th style={{ width: "20%", textAlign: "right" }}>Unit Price</th>}
              {!anyHidePrice && <th style={{ width: "15%", textAlign: "right" }}>Total</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const isHamper    = item.kind === "hamper";
              const displayName = isHamper ? `${item.tierName} Hamper` : (item.name ?? "");
              const qty         = item.quantity ?? 1;
              const price       = item.price ?? 0;
              const hideThis    = isHamper && item.hidePrices;

              return (
                <tr key={i}>
                  <td>
                    {isHamper && <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", marginBottom: "2px" }}>Gift Hamper · {item.boxName}</div>}
                    <strong>{displayName}</strong>
                    {item.label && <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>{item.label}</div>}
                    {isHamper && item.selections && item.selections.length > 0 && (
                      <div className="hamper-selections">
                        {item.selections.map((s, si) => (
                          <div key={si} className="hamper-slot">
                            <span style={{ color: "#999" }}>{s.slotLabel}:</span> {s.productName}{s.productLabel ? ` · ${s.productLabel}` : ""}
                          </div>
                        ))}
                      </div>
                    )}
                    {isHamper && item.giftMessage && (
                      <div className="gift-msg">&ldquo;{item.giftMessage}&rdquo;</div>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>{qty}</td>
                  {!anyHidePrice && <td style={{ textAlign: "right" }}>{hideThis ? "—" : `₹${price.toLocaleString("en-IN")}`}</td>}
                  {!anyHidePrice && <td style={{ textAlign: "right" }}>{hideThis ? "—" : `₹${(price * qty).toLocaleString("en-IN")}`}</td>}
                </tr>
              );
            })}
          </tbody>
          {!anyHidePrice && (
            <tfoot>
              <tr>
                <td colSpan={2} style={{ textAlign: "right", fontWeight: "bold", borderTop: "2px solid #ccc" }}>Subtotal</td>
                <td colSpan={2} style={{ textAlign: "right", fontWeight: "bold", borderTop: "2px solid #ccc" }}>₹{Number(order.subtotal ?? 0).toLocaleString("en-IN")}</td>
              </tr>
              {Number(order.shipping_fee ?? 0) > 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: "right" }}>Shipping</td>
                  <td colSpan={2} style={{ textAlign: "right" }}>₹{Number(order.shipping_fee).toLocaleString("en-IN")}</td>
                </tr>
              )}
              <tr>
                <td colSpan={2} style={{ textAlign: "right", fontWeight: "bold" }}>Total</td>
                <td colSpan={2} style={{ textAlign: "right", fontWeight: "bold", fontSize: "13px" }}>₹{Number(order.total ?? 0).toLocaleString("en-IN")}</td>
              </tr>
            </tfoot>
          )}
        </table>

        {order.order_notes && (
          <div style={{ marginBottom: "16px", padding: "10px", border: "1px solid #e0d8a0", background: "#fefce8", fontSize: "11px" }}>
            <div className="label" style={{ marginBottom: "4px" }}>Order Notes</div>
            <p>{order.order_notes}</p>
          </div>
        )}

        <div className="footer">
          <p>Payment: {order.payment_method === "cod" ? "Cash on Delivery" : "Online (Razorpay)"} · Status: {order.payment_status}</p>
          <p style={{ marginTop: "4px" }}>Please pack carefully. Handle with care. Dhyom — Patna, Bihar.</p>
        </div>

        <button
          onClick={() => window.print()}
          style={{ marginTop: "24px", padding: "10px 24px", background: "#111", color: "#fff", border: "none", cursor: "pointer", fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}
        >
          Print
        </button>
      </body>
    </html>
  );
}
