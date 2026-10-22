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
  id?:           string;
  name?:         string;
  price?:        number;
  quantity?:     number;
  label?:        string;
  imageUrl?:     string;
  cartItemId?:   string;
  hamperGroupId?: string;
  hamperGroup?:  string;
  isHamperBox?:  boolean;
  giftMessage?:  string;
  hidePrices?:   boolean;
}

type DisplaySection =
  | { kind: "standalone"; item: RawItem }
  | { kind: "hamperGroup"; groupId: string; groupName: string; giftMessage?: string; hidePrices: boolean; items: RawItem[] };

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

  // Build display sections
  const sections: DisplaySection[] = [];
  const groupMap = new Map<string, { groupName: string; giftMessage?: string; hidePrices: boolean; items: RawItem[] }>();

  for (const item of items) {
    if (item.hamperGroupId) {
      if (!groupMap.has(item.hamperGroupId)) {
        groupMap.set(item.hamperGroupId, {
          groupName:   item.hamperGroup  ?? "Gift Hamper",
          giftMessage: item.isHamperBox  ? item.giftMessage : undefined,
          hidePrices:  item.isHamperBox  ? (item.hidePrices ?? false) : false,
          items: [],
        });
      }
      const g = groupMap.get(item.hamperGroupId)!;
      if (item.isHamperBox && item.giftMessage) g.giftMessage = item.giftMessage;
      if (item.isHamperBox && item.hidePrices)  g.hidePrices  = true;
      g.items.push(item);
    } else {
      sections.push({ kind: "standalone", item });
    }
  }
  for (const [groupId, g] of Array.from(groupMap.entries())) {
    sections.push({ kind: "hamperGroup", groupId, ...g });
  }

  const anyHidePrice = sections.some(s => s.kind === "hamperGroup" && s.hidePrices);

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
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #eee; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; padding: 6px 8px; text-align: left; border: 1px solid #ccc; }
          td { padding: 7px 8px; border: 1px solid #e0e0e0; vertical-align: top; font-size: 11px; }
          .group-header td { background: #f5f0e8; font-weight: bold; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; border-top: 2px solid #c4a373; }
          .gift-msg { margin-top: 4px; font-style: italic; font-size: 10px; color: #666; border-left: 2px solid #c4a373; padding-left: 6px; }
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
            {sections.map((section, si) => {
              if (section.kind === "standalone") {
                const item = section.item;
                const qty   = item.quantity ?? 1;
                const price = item.price    ?? 0;
                return (
                  <tr key={si}>
                    <td>
                      <strong>{item.name ?? ""}</strong>
                      {item.label && <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>{item.label}</div>}
                    </td>
                    <td style={{ textAlign: "center" }}>{qty}</td>
                    {!anyHidePrice && <td style={{ textAlign: "right" }}>₹{price.toLocaleString("en-IN")}</td>}
                    {!anyHidePrice && <td style={{ textAlign: "right" }}>₹{(price * qty).toLocaleString("en-IN")}</td>}
                  </tr>
                );
              }

              // Hamper group
              const { groupName, giftMessage, hidePrices, items: gItems } = section;
              const groupTotal = gItems.reduce((s, i) => s + (i.price ?? 0) * (i.quantity ?? 1), 0);
              return (
                <>
                  <tr key={`${si}-header`} className="group-header">
                    <td colSpan={anyHidePrice ? 2 : 4}>
                      Gift Hamper — {groupName}
                      {giftMessage && <div className="gift-msg">&ldquo;{giftMessage}&rdquo;</div>}
                    </td>
                    {!anyHidePrice && !hidePrices && (
                      <td colSpan={2} style={{ textAlign: "right", fontWeight: "bold", fontSize: "11px" }}>
                        ₹{groupTotal.toLocaleString("en-IN")}
                      </td>
                    )}
                  </tr>
                  {gItems.map((item, ii) => {
                    const qty   = item.quantity ?? 1;
                    const price = item.price    ?? 0;
                    return (
                      <tr key={`${si}-${ii}`}>
                        <td style={{ paddingLeft: "16px" }}>
                          {item.isHamperBox
                            ? <span style={{ color: "#888", fontSize: "10px" }}>Gift Box — {item.name}</span>
                            : <>
                                <strong>{item.name}</strong>
                                {item.label && <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>{item.label}</div>}
                              </>
                          }
                        </td>
                        <td style={{ textAlign: "center" }}>{qty}</td>
                        {!anyHidePrice && <td style={{ textAlign: "right" }}>{hidePrices || item.isHamperBox ? "—" : `₹${price.toLocaleString("en-IN")}`}</td>}
                        {!anyHidePrice && <td style={{ textAlign: "right" }}>{hidePrices || item.isHamperBox ? "—" : `₹${(price * qty).toLocaleString("en-IN")}`}</td>}
                      </tr>
                    );
                  })}
                </>
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
