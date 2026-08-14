import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { PrintButton } from "./PrintButton";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, global: { fetch: (u, o) => fetch(u, { ...o, cache: "no-store" }) } }
  );
}

interface OrderItem { id: string; name: string; price: number; quantity: number; label?: string }
interface Order {
  id: string; order_number: string; first_name: string; last_name: string;
  email: string; phone: string; shipping_street: string; shipping_city: string;
  shipping_state: string; shipping_pincode: string; order_notes: string | null;
  items: OrderItem[]; subtotal: number; shipping_fee: number; total: number;
  payment_method: "cod" | "online"; payment_status: string; created_at: string;
}
interface Invoice {
  invoice_number: string; taxable_value: number; gst_amount: number;
  total_amount: number; invoice_date: string | null; created_at: string;
}

const SELLER_NAME    = "Sujay, trading as Yukti";
const SELLER_SHORT   = "Yukti";
const SELLER_ADDR    = "Ground Floor, Road Number 8A, near Ideal Public School, Rajiv Nagar, Patna, Bihar – 800024";
const SELLER_GSTIN   = "10EFQPS4606H1ZC";
const SELLER_PAN     = "EFQPS4606H";
const SELLER_STATE   = "Bihar";

function r2(n: number) { return Math.round(n * 100) / 100; }
function inr(n: number) { return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const td: React.CSSProperties = { border: "1px solid #bbb", padding: "4px 6px", fontSize: "10px", verticalAlign: "top" };
const th: React.CSSProperties = { ...td, background: "#e8e8e8", fontWeight: "bold", textAlign: "center" as const, fontSize: "9px", textTransform: "uppercase" as const, letterSpacing: "0.5px" };

export default async function InvoicePage({ params }: { params: { orderNumber: string } }) {
  const { orderNumber } = params;
  const sb = adminClient();

  const oRes = await sb.from("orders").select("*").eq("order_number", orderNumber).single();
  if (!oRes.data) notFound();

  const [iRes, logoRes] = await Promise.all([
    sb.from("invoices").select("*").eq("order_id", oRes.data.id).maybeSingle(),
    sb.from("site_assets").select("image_url").eq("key", "logo").maybeSingle(),
  ]);
  if (!iRes.data) notFound();

  const o        = oRes.data as Order;
  const inv      = iRes.data as Invoice;
  const logoUrl  = logoRes.data?.image_url ?? null;
  const items    = o.items as OrderItem[];

  const isIntraState = o.shipping_state?.toLowerCase().trim() === "bihar";
  const invDate      = fmtDate(inv.invoice_date ?? inv.created_at);
  const ordDate      = fmtDate(o.created_at);
  const totalQty     = items.reduce((s, i) => s + i.quantity, 0);
  const printedAt    = (() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2,"0")}${now.getMinutes().toString().padStart(2,"0")} hrs, ${now.toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"2-digit"})}`;
  })();

  /* Per-item GST (GST-inclusive pricing: back-calculate taxable value) */
  const lineItems = items.map(item => {
    const gross    = r2(item.price * item.quantity);
    const taxable  = r2(gross / 1.05);
    const tax      = r2(gross - taxable);
    return { ...item, gross, taxable, tax, total: gross };
  });

  const shippingFee  = Number(o.shipping_fee ?? 0);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4; margin: 6mm; }
        @media print {
          html, body { background: white !important; color: #111 !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .page-wrap { box-shadow: none !important; }
        }
        body { font-family: Arial, Helvetica, sans-serif; background: #f5f5f5; color: #111; }
        .page-wrap { color: #111 !important; }
        table { border-collapse: collapse; width: 100%; }
      `}} />

      <PrintButton orderNumber={o.order_number} />

      <div className="no-print" style={{ height: "48px", background: "#f5f5f5" }} />
      <div style={{ minHeight: "100vh", background: "#f5f5f5", paddingBottom: "40px" }}>

      {/* ─── A4 page wrapper ─────────────────────────────── */}
      <div className="page-wrap" style={{
        maxWidth: "794px", margin: "0 auto", background: "white",
        boxShadow: "0 0 20px rgba(0,0,0,0.15)", padding: "0",
        color: "#111",
      }}>

        {/* ════════════════════════════════════════════════
            TOP HALF — SHIPPING LABEL
        ════════════════════════════════════════════════ */}
        <div style={{ padding: "10px 14px 6px" }}>

          {/* Header bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #1a0a12", paddingBottom: "6px", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Dhyom" style={{ height: "36px", objectFit: "contain" }} />
              ) : (
                <span style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "4px" }}>DHYOM</span>
              )}
              <span style={{ fontSize: "9px", color: "#666", letterSpacing: "2px", textTransform: "uppercase" }}>Shipping Label</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "10px", color: "#444" }}>Order: <strong>{o.order_number}</strong></span>
              <span style={{
                fontSize: "11px", fontWeight: "bold", padding: "3px 10px", borderRadius: "3px", letterSpacing: "1px",
                background: o.payment_method === "cod" ? "#c0392b" : "#1a7a3a",
                color: "white",
              }}>
                {o.payment_method === "cod" ? "COD" : "PREPAID"}
              </span>
            </div>
          </div>

          {/* Shipping label — compact square sticker */}
          <div style={{ width: "260px", border: "2px solid #111", marginBottom: "8px", fontSize: "10px", lineHeight: "1.55" }}>

            {/* TO */}
            <div style={{ padding: "7px 10px 9px", borderBottom: "1.5px solid #111" }}>
              <div style={{ fontSize: "7px", fontWeight: "bold", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#555", marginBottom: "4px" }}>To</div>
              <div style={{ fontWeight: "bold", fontSize: "13px" }}>{o.first_name} {o.last_name}</div>
              <div style={{ fontSize: "10px" }}>{o.shipping_street}</div>
              <div style={{ fontSize: "10px" }}>{o.shipping_city}, {o.shipping_state}</div>
              <div style={{ fontWeight: "bold", fontSize: "13px", marginTop: "3px" }}>PIN – {o.shipping_pincode}</div>
              <div style={{ fontSize: "10px", marginTop: "2px" }}>Ph: {o.phone}</div>
            </div>

            {/* FROM */}
            <div style={{ padding: "6px 10px 7px", background: "#f5f5f5" }}>
              <div style={{ fontSize: "7px", fontWeight: "bold", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#555", marginBottom: "3px" }}>From</div>
              <div style={{ fontWeight: "bold", fontSize: "10px" }}>{SELLER_SHORT}</div>
              <div style={{ fontSize: "9px" }}>Rajiv Nagar, Road No. 8A, Anand Niketan,</div>
              <div style={{ fontSize: "9px" }}>PATNA – 800024, Bihar</div>
              <div style={{ fontSize: "8.5px", color: "#555", marginTop: "2px" }}>GSTIN: {SELLER_GSTIN}</div>
            </div>

          </div>

          {/* SKU / Items table */}
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "6px" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: "30px", textAlign: "left" }}>#</th>
                <th style={{ ...th, textAlign: "left" }}>Description</th>
                <th style={{ ...th, width: "40px" }}>QTY</th>
                <th style={{ ...th, width: "70px" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i}>
                  <td style={{ ...td }}>{i + 1}</td>
                  <td style={{ ...td }}>
                    <span style={{ fontWeight: "bold" }}>{item.name}</span>
                    {item.label && <span style={{ color: "#666", fontSize: "9px" }}> | {item.label}</span>}
                  </td>
                  <td style={{ ...td, textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ ...td, textAlign: "right" }}>₹{inr(item.gross)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Label footer */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#888", marginTop: "2px" }}>
            <span>Not for resale.</span>
            <span>Printed at {printedAt}</span>
          </div>
        </div>

        {/* ════════ TEAR LINE ════════ */}
        <div style={{ margin: "6px 0", borderTop: "2px dashed #444", position: "relative", textAlign: "center" }}>
          <span style={{ background: "white", padding: "0 10px", fontSize: "9px", color: "#555", position: "relative", top: "-8px", letterSpacing: "1px" }}>
            ✂ &nbsp;&nbsp; TEAR HERE &nbsp;&nbsp; ✂
          </span>
        </div>

        {/* ════════════════════════════════════════════════
            BOTTOM HALF — TAX INVOICE
        ════════════════════════════════════════════════ */}
        <div style={{ padding: "6px 14px 10px" }}>

          {/* Invoice header row */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "start", gap: "10px", borderBottom: "1px solid #ccc", paddingBottom: "6px", marginBottom: "6px" }}>
            <div style={{ fontWeight: "bold", fontSize: "13px", letterSpacing: "1px", border: "1.5px solid #1a0a12", padding: "3px 10px", whiteSpace: "nowrap" as const }}>
              TAX INVOICE
            </div>
            <div style={{ fontSize: "10px", lineHeight: "1.55" }}>
              <div><strong>Order ID:</strong> {o.order_number}</div>
              <div><strong>Order Date:</strong> {ordDate}</div>
            </div>
            <div style={{ fontSize: "10px", lineHeight: "1.55", textAlign: "right" as const }}>
              <div><strong>Invoice No:</strong> {inv.invoice_number}</div>
              <div><strong>Invoice Date:</strong> {invDate}</div>
              <div><strong>GSTIN:</strong> {SELLER_GSTIN}</div>
              <div><strong>PAN:</strong> {SELLER_PAN}</div>
            </div>
          </div>

          {/* Shipping Address (large) | Sold By + Items (small) */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0", border: "1px solid #bbb", marginBottom: "8px", fontSize: "10px", lineHeight: "1.55" }}>

            {/* Shipping address — wide left */}
            <div style={{ padding: "7px 10px", borderRight: "1px solid #bbb" }}>
              <div style={{ fontSize: "8px", fontWeight: "bold", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#666", marginBottom: "4px" }}>Shipping / Billing Address</div>
              <div style={{ fontWeight: "bold", fontSize: "12px" }}>{o.first_name} {o.last_name}</div>
              <div>{o.shipping_street}</div>
              <div>{o.shipping_city}, {o.shipping_state} – {o.shipping_pincode}</div>
              {o.phone && <div>Ph: {o.phone}</div>}
            </div>

            {/* Sold By + items list — narrow right */}
            <div style={{ padding: "7px 10px" }}>
              <div style={{ fontSize: "8px", fontWeight: "bold", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#666", marginBottom: "3px" }}>Sold By</div>
              <div style={{ fontWeight: "bold" }}>{SELLER_SHORT}</div>
              <div style={{ fontSize: "9px" }}>Patna, {SELLER_STATE}</div>
              <div style={{ fontSize: "9px" }}>GSTIN: {SELLER_GSTIN}</div>

              {/* Items list below sold by */}
              <div style={{ borderTop: "1px solid #ddd", marginTop: "6px", paddingTop: "5px" }}>
                <div style={{ fontSize: "8px", fontWeight: "bold", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#666", marginBottom: "3px" }}>Items</div>
                {lineItems.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", marginBottom: "1px", gap: "4px" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{item.name}</span>
                    <span style={{ flexShrink: 0, fontWeight: "bold" }}>×{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Line items GST table */}
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "6px", fontSize: "9.5px" }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left", width: "28%" }}>Product</th>
                <th style={{ ...th, width: "8%" }}>Qty</th>
                <th style={{ ...th, width: "11%" }}>Amount (₹)</th>
                <th style={{ ...th, width: "12%" }}>Taxable Value (₹)</th>
                {isIntraState ? (
                  <>
                    <th style={{ ...th, width: "9%" }}>CGST 2.5% (₹)</th>
                    <th style={{ ...th, width: "9%" }}>SGST 2.5% (₹)</th>
                  </>
                ) : (
                  <th style={{ ...th, width: "10%" }}>IGST 5% (₹)</th>
                )}
                <th style={{ ...th, width: "9%" }}>CESS (₹)</th>
                <th style={{ ...th, width: "11%" }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i}>
                  <td style={{ ...td }}>
                    <div style={{ fontWeight: "bold", fontSize: "9px" }}>{item.name}</div>
                    {item.label && <div style={{ color: "#555", fontSize: "8.5px" }}>{item.label}</div>}
                  </td>
                  <td style={{ ...td, textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ ...td, textAlign: "right" }}>{inr(item.gross)}</td>
                  <td style={{ ...td, textAlign: "right" }}>{inr(item.taxable)}</td>
                  {isIntraState ? (
                    <>
                      <td style={{ ...td, textAlign: "right" }}>{inr(r2(item.tax / 2))}</td>
                      <td style={{ ...td, textAlign: "right" }}>{inr(r2(item.tax - r2(item.tax / 2)))}</td>
                    </>
                  ) : (
                    <td style={{ ...td, textAlign: "right" }}>{inr(item.tax)}</td>
                  )}
                  <td style={{ ...td, textAlign: "right" }}>0.00</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: "bold" }}>{inr(item.total)}</td>
                </tr>
              ))}
              {shippingFee > 0 && (
                <tr>
                  <td style={{ ...td, fontStyle: "italic" as const, color: "#555" }}>Shipping Charges</td>
                  <td style={{ ...td, textAlign: "center" }}>1</td>
                  <td style={{ ...td, textAlign: "right" }}>{inr(shippingFee)}</td>
                  <td style={{ ...td, textAlign: "right" }}>{inr(shippingFee)}</td>
                  {isIntraState ? (
                    <><td style={{ ...td, textAlign: "right" }}>0.00</td><td style={{ ...td, textAlign: "right" }}>0.00</td></>
                  ) : (
                    <td style={{ ...td, textAlign: "right" }}>0.00</td>
                  )}
                  <td style={{ ...td, textAlign: "right" }}>0.00</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: "bold" }}>{inr(shippingFee)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f0f0f0" }}>
                <td style={{ ...td, fontWeight: "bold" }}>TOTAL QTY: {totalQty}</td>
                <td style={{ ...td }}></td>
                <td colSpan={isIntraState ? 5 : 4} style={{ ...td, textAlign: "right", fontWeight: "bold" }}>
                  TOTAL PRICE: ₹{inr(Number(o.total))} &nbsp; (All values in INR)
                </td>
                <td style={{ ...td }}></td>
              </tr>
            </tfoot>
          </table>

          {/* Footer: registered address + signature */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: "9px", color: "#444", borderTop: "1px solid #ddd", paddingTop: "5px" }}>
            <div style={{ maxWidth: "60%", lineHeight: "1.5" }}>
              <div><strong>Seller Registered Address:</strong> {SELLER_NAME}, {SELLER_ADDR}</div>
              <div style={{ marginTop: "3px", color: "#888" }}>E. &amp; O.E.</div>
            </div>
            <div style={{ textAlign: "right" as const, lineHeight: "1.5" }}>
              <div style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "14px" }}>{SELLER_SHORT}</div>
              <div style={{ borderTop: "1px solid #666", paddingTop: "2px", fontSize: "8px", color: "#666" }}>Authorized Signature</div>
            </div>
          </div>

          {/* Payment note */}
          <div style={{ marginTop: "6px", fontSize: "9px", color: "#555", borderTop: "1px solid #eee", paddingTop: "4px" }}>
            Payment Method: <strong>{o.payment_method === "cod" ? "Cash on Delivery" : "Online Payment (Razorpay)"}</strong>
            &nbsp;|&nbsp; Payment Status: <strong style={{ textTransform: "capitalize" as const }}>{o.payment_status}</strong>
            &nbsp;|&nbsp; This is a computer-generated invoice. No physical signature required.
          </div>

        </div>
      </div>
      </div>
    </>
  );
}
