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

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  label?: string;
}

interface Order {
  id: string;
  order_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  shipping_street: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  payment_method: "cod" | "online";
  payment_status: string;
  created_at: string;
}

interface Invoice {
  invoice_number: string;
  taxable_value: number;
  gst_amount: number;
  total_amount: number;
  invoice_date: string | null;
  created_at: string;
}

const SELLER_NAME    = "Sujay";
const SELLER_TRADE   = "Yukti";
const SELLER_GSTIN   = "10EFQPS4606H1ZC";
const SELLER_ADDRESS = "Ground Floor, Road Number 8A, near Ideal Public School, Rajiv Nagar, Patna, Bihar – 800024";
const SELLER_STATE   = "Bihar";

function rupees(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

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

  const order   = oRes.data as Order;
  const invoice = iRes.data as Invoice;
  const logoUrl = logoRes.data?.image_url ?? null;

  const isIntraState = order.shipping_state?.toLowerCase().trim() === "bihar";
  const halfGst      = Math.round(invoice.gst_amount * 50) / 100;
  const halfGst2     = Math.round((invoice.gst_amount - halfGst) * 100) / 100;
  const invDate      = fmtDate(invoice.invoice_date ?? invoice.created_at);
  const ordDate      = fmtDate(order.created_at);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: white !important; }
          .no-print { display: none !important; }
        }
      `}} />

      <PrintButton orderNumber={order.order_number} />

      <div className="min-h-screen bg-[#f2ede5] pt-14 pb-12 print:pt-0 print:pb-0 print:bg-white">
        <div
          className="max-w-[794px] mx-auto bg-white print:max-w-none print:shadow-none"
          style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.10)" }}
        >

          {/* ── Brand header ───────────────────────────────────────── */}
          <div className="flex items-start justify-between px-10 pt-10 pb-8 border-b-2 border-[#C4A373]">
            <div>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Dhyom" style={{ height: "60px", objectFit: "contain", objectPosition: "left" }} />
              ) : (
                <h1
                  className="text-[2.2rem] font-bold tracking-[0.28em] text-[#1a0a12]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  DHYOM
                </h1>
              )}
              <div className="mt-4 text-[0.72rem] text-[#1a0a12] leading-relaxed">
                <p className="font-semibold">{SELLER_NAME}, trading as {SELLER_TRADE}</p>
                <p>GSTIN: {SELLER_GSTIN}</p>
                <p className="mt-0.5">{SELLER_ADDRESS}</p>
                <p>State: {SELLER_STATE}</p>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block border-2 border-[#1a0a12] px-5 py-2 mb-5">
                <p className="text-[1rem] font-bold tracking-[0.18em] text-[#1a0a12] uppercase">Tax Invoice</p>
              </div>
              <div className="text-[0.72rem] text-[#3a2a1a] space-y-1">
                <MetaRow label="Invoice No." value={invoice.invoice_number} bold />
                <MetaRow label="Invoice Date" value={invDate} />
                <MetaRow label="Order No." value={order.order_number} />
                <MetaRow label="Order Date" value={ordDate} />
              </div>
            </div>
          </div>

          {/* ── Bill to / Ship to ──────────────────────────────────── */}
          <div className="px-10 py-6 border-b border-[#e0d5c5]">
            <p className="text-[0.56rem] tracking-[0.22em] uppercase text-[#3a2a1a] font-semibold mb-3">
              Bill To / Ship To
            </p>
            <div className="bg-[#faf6f0] border border-[#e8dece] rounded px-5 py-4 text-[0.76rem] text-[#3a2a1a] leading-relaxed inline-block min-w-[260px]">
              <p className="font-bold text-[0.88rem] text-[#1a0a12]">{order.first_name} {order.last_name}</p>
              <p className="mt-1">{order.shipping_street}</p>
              <p>{order.shipping_city}, {order.shipping_state} – {order.shipping_pincode}</p>
              <p className="mt-1">Ph: {order.phone}</p>
              {order.email && <p>{order.email}</p>}
            </div>
          </div>

          {/* ── Line items ─────────────────────────────────────────── */}
          <div className="px-10 py-6 border-b border-[#e0d5c5]">
            <table className="w-full text-[0.74rem] border-collapse">
              <thead>
                <tr style={{ background: "#1a0a12" }}>
                  <th className="px-4 py-3 text-left text-[0.58rem] tracking-[0.14em] uppercase text-[#C4A373] font-medium w-8">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-[0.58rem] tracking-[0.14em] uppercase text-[#C4A373] font-medium">
                    Description
                  </th>
                  <th className="px-4 py-3 text-center text-[0.58rem] tracking-[0.14em] uppercase text-[#C4A373] font-medium w-14">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-[0.58rem] tracking-[0.14em] uppercase text-[#C4A373] font-medium w-24">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-right text-[0.58rem] tracking-[0.14em] uppercase text-[#C4A373] font-medium w-28">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {(order.items as OrderItem[]).map((item, i) => (
                  <tr key={i} className={i % 2 === 0 ? "" : "bg-[#faf6f0]"}>
                    <td className="px-4 py-3 text-[#3a2a1a]">{i + 1}</td>
                    <td className="px-4 py-3 text-[#1a0a12]">
                      <p className="font-medium">{item.name}</p>
                      {item.label && (
                        <p className="text-[0.64rem] text-[#3a2a1a] mt-0.5">{item.label}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-[#3a2a1a]">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-[#3a2a1a]">{rupees(item.price)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#1a0a12]">
                      {rupees(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Totals ─────────────────────────────────────────────── */}
          <div className="px-10 py-6 border-b border-[#e0d5c5] flex justify-end">
            <div className="w-72 text-[0.74rem]">
              <TotalRow label="Taxable Value" value={rupees(invoice.taxable_value)} />
              {isIntraState ? (
                <>
                  <TotalRow label="CGST @ 2.5%" value={rupees(halfGst)} />
                  <TotalRow label="SGST @ 2.5%" value={rupees(halfGst2)} />
                </>
              ) : (
                <TotalRow label="IGST @ 5%" value={rupees(invoice.gst_amount)} />
              )}
              {Number(order.shipping_fee) > 0 && (
                <TotalRow label="Shipping Charges" value={rupees(Number(order.shipping_fee))} />
              )}
              <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-[#C4A373] bg-[#1a0a12] -mx-0.5 px-3 py-3 rounded-b">
                <span className="font-bold tracking-[0.10em] uppercase text-[0.68rem] text-[#C4A373]">Total</span>
                <span className="font-bold text-[0.92rem] text-white">{rupees(Number(order.total))}</span>
              </div>
            </div>
          </div>

          {/* ── Payment ────────────────────────────────────────────── */}
          <div className="px-10 py-5 border-b border-[#e0d5c5] flex gap-12 text-[0.72rem]">
            <div>
              <p className="text-[0.56rem] tracking-[0.18em] uppercase text-[#3a2a1a] mb-1">Payment Method</p>
              <p className="font-semibold text-[#1a0a12]">
                {order.payment_method === "cod" ? "Cash on Delivery" : "Online Payment (Razorpay)"}
              </p>
            </div>
            <div>
              <p className="text-[0.56rem] tracking-[0.18em] uppercase text-[#3a2a1a] mb-1">Payment Status</p>
              <p className="font-semibold text-[#1a0a12] capitalize">{order.payment_status}</p>
            </div>
          </div>

          {/* ── Footer ─────────────────────────────────────────────── */}
          <div className="px-10 py-6 text-center">
            <p className="text-[0.64rem] text-[#3a2a1a] tracking-[0.06em]">
              This is a computer-generated invoice. No physical signature is required.
            </p>
            <p className="text-[0.58rem] text-[#3a2a1a] mt-1.5 tracking-wide">
              DHYOM — Handcrafted with care. Delivered with reverence.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}

function MetaRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-end gap-6">
      <span className="text-[#3a2a1a]">{label}</span>
      <span className={`w-36 text-right ${bold ? "font-bold text-[#1a0a12]" : "text-[#3a2a1a]"}`}>{value}</span>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-[#e8dece]">
      <span className="text-[#1a0a12] font-medium">{label}</span>
      <span className="text-[#1a0a12] font-medium">{value}</span>
    </div>
  );
}
