import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Image from "next/image";
import { PrintButton } from "@/app/invoice/[orderNumber]/PrintButton";
import { fetchSiteAssets } from "@/lib/supabase/site-assets";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, global: { fetch: (u, o) => fetch(u, { ...o, cache: "no-store" }) } }
  );
}

// ── Constants — identical to online invoice ───────────────────────────────────
const SELLER_SHORT = "Yukti";
const SELLER_NAME  = "Sujay, trading as Yukti";
const SELLER_ADDR  = "Ground Floor, Road Number 8A, near Ideal Public School, Rajiv Nagar, Patna, Bihar – 800024";
const SELLER_GSTIN = "10EFQPS4606H1ZC";
const SELLER_PAN   = "EFQPS4606H";
const SELLER_STATE = "Bihar";

function r2(n: number) { return Math.round(n * 100) / 100; }
function inr(n: number) { return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const td: React.CSSProperties = { border: "1px solid #bbb", padding: "4px 6px", fontSize: "10px", verticalAlign: "top" };
const th: React.CSSProperties = { ...td, background: "#e8e8e8", fontWeight: "bold", textAlign: "center" as const, fontSize: "9px", textTransform: "uppercase" as const, letterSpacing: "0.5px" };

const CHANNEL_LABELS: Record<string, string> = {
  wholesale:         "Wholesale",
  corporate_gifting: "Corporate / Gifting",
  dm_order:          "DM Order",
  exhibition:        "Exhibition / Pop-up",
};

export default async function OfflineInvoicePage({ params }: { params: { id: string } }) {
  const sb = adminClient();

  const [oRes, assets] = await Promise.all([
    sb.from("offline_sales_orders")
      .select(`
        id, sale_date, channel, customer_name, location,
        payment_mode, payment_status, amount_paid,
        invoice_number, invoice_date,
        offline_sales_items (
          id, product_id, quantity, unit_price, line_total,
          products ( id, name, price )
        )
      `)
      .eq("id", params.id)
      .single(),
    fetchSiteAssets().catch(() => ({})),
  ]);

  if (!oRes.data || !oRes.data.invoice_number) notFound();

  const o       = oRes.data;
  const logoUrl = (assets as Record<string, string | null>).logo ?? null;
  const items   = (o.offline_sales_items ?? []) as {
    id: string; product_id: string; quantity: number; unit_price: number; line_total: number;
    products: { id: string; name: string; price: number } | null;
  }[];

  // Treat all offline sales as intra-state (Bihar) — seller is in Bihar; most
  // wholesale/exhibition/DM sales are local. Adjust if cross-state billing needed.
  const isIntraState = true;

  const invDate  = fmtDate(o.invoice_date!);
  const saleDate = fmtDate(o.sale_date);
  const orderTotal = items.reduce((s, i) => s + Number(i.line_total), 0);
  const totalQty   = items.reduce((s, i) => s + i.quantity, 0);

  // Back-calculate GST from GST-inclusive unit prices (same logic as online invoice)
  const lineItems = items.map(item => {
    const gross   = r2(Number(item.line_total));
    const taxable = r2(gross / 1.05);
    const tax     = r2(gross - taxable);
    const name    = item.products?.name ?? item.product_id;
    return { name, quantity: item.quantity, gross, taxable, tax, total: gross };
  });

  const paymentModeLabel = o.payment_mode.replace("_", " ");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4; margin: 6mm; }
        header, footer,
        [style*="position: fixed"],
        [style*="position:fixed"] { display: none !important; }
        main { padding-top: 0 !important; }
        @media print {
          html, body { background: white !important; color: #111 !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .page-wrap { box-shadow: none !important; }
        }
        body { font-family: Arial, Helvetica, sans-serif; background: #f5f5f5; color: #111; }
        .page-wrap { color: #111 !important; }
        table { border-collapse: collapse; width: 100%; }
      `}} />

      <PrintButton orderNumber={o.invoice_number!} />

      <div className="no-print" style={{ height: "64px", background: "#f5f5f5" }} />
      <div style={{ minHeight: "100vh", background: "#f5f5f5", paddingBottom: "40px" }}>

      {/* ─── A4 page wrapper ──────────────────────────────── */}
      <div className="page-wrap" style={{
        maxWidth: "794px", margin: "0 auto", background: "white",
        boxShadow: "0 0 20px rgba(0,0,0,0.15)", padding: "0", color: "#111",
      }}>
        <div style={{ padding: "12px 14px 10px" }}>

          {/* Brand logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px", paddingBottom: "8px", borderBottom: "1px solid #e0e0e0" }}>
            {logoUrl ? (
              <Image src={logoUrl} alt="Dhyom" width={140} height={44} style={{ objectFit: "contain" }} />
            ) : (
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: "22px", letterSpacing: "6px", color: "#1a0a12", fontWeight: "bold" }}>DHYOM</span>
            )}
          </div>

          {/* Invoice header */}
          <div style={{ borderBottom: "1px solid #ccc", paddingBottom: "6px", marginBottom: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" as const, gap: "6px" }}>
              <div style={{ fontWeight: "bold", fontSize: "13px", letterSpacing: "1px", border: "1.5px solid #1a0a12", padding: "3px 10px", whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                TAX INVOICE
              </div>
              <div style={{ fontSize: "10px", lineHeight: "1.55", textAlign: "right" as const }}>
                <div><strong>Invoice No:</strong> {o.invoice_number}</div>
                <div><strong>Invoice Date:</strong> {invDate}</div>
                <div><strong>GSTIN:</strong> {SELLER_GSTIN}</div>
                <div><strong>PAN:</strong> {SELLER_PAN}</div>
              </div>
            </div>
            <div style={{ fontSize: "10px", lineHeight: "1.55", marginTop: "4px" }}>
              <div><strong>Channel:</strong> {CHANNEL_LABELS[o.channel] ?? o.channel}</div>
              <div><strong>Sale Date:</strong> {saleDate}</div>
            </div>
          </div>

          {/* Billing info | Sold By */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0", border: "1px solid #bbb", marginBottom: "8px", fontSize: "10px", lineHeight: "1.55" }}>

            {/* Buyer — left */}
            <div style={{ padding: "7px 10px", borderRight: "1px solid #bbb" }}>
              <div style={{ fontSize: "8px", fontWeight: "bold", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#666", marginBottom: "4px" }}>Bill To</div>
              <div style={{ fontWeight: "bold", fontSize: "12px" }}>{o.customer_name}</div>
              {o.location && <div style={{ color: "#444" }}>{o.location}</div>}
            </div>

            {/* Sold By + items — right */}
            <div style={{ padding: "7px 10px" }}>
              <div style={{ fontSize: "8px", fontWeight: "bold", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#666", marginBottom: "3px" }}>Sold By</div>
              <div style={{ fontWeight: "bold" }}>{SELLER_SHORT}</div>
              <div style={{ fontSize: "9px" }}>Patna, {SELLER_STATE}</div>
              <div style={{ fontSize: "9px" }}>GSTIN: {SELLER_GSTIN}</div>

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

          {/* GST line-items table — identical columns to online invoice */}
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
            </tbody>
            <tfoot>
              <tr style={{ background: "#f0f0f0" }}>
                <td style={{ ...td, fontWeight: "bold" }}>TOTAL QTY: {totalQty}</td>
                <td style={{ ...td }}></td>
                <td colSpan={isIntraState ? 5 : 4} style={{ ...td, textAlign: "right", fontWeight: "bold" }}>
                  TOTAL PRICE: ₹{inr(orderTotal)} &nbsp; (All values in INR)
                </td>
                <td style={{ ...td }}></td>
              </tr>
            </tfoot>
          </table>

          {/* Footer */}
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
            Payment Mode: <strong style={{ textTransform: "capitalize" as const }}>{paymentModeLabel}</strong>
            &nbsp;|&nbsp; Payment Status: <strong style={{ textTransform: "capitalize" as const }}>{o.payment_status}</strong>
            &nbsp;|&nbsp; Amount Collected: <strong>₹{inr(Number(o.amount_paid))}</strong>
            &nbsp;|&nbsp; This is a computer-generated invoice. No physical signature required.
          </div>

        </div>
      </div>
      </div>
    </>
  );
}
