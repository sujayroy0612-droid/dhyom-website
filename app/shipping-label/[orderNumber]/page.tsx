import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { LabelActions } from "./LabelActions";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, global: { fetch: (u, o) => fetch(u, { ...o, cache: "no-store" }) } }
  );
}

const FROM_NAME    = "Sujay (Yukti)";
const FROM_ADDR1   = "Ground Floor, Road Number 8A";
const FROM_ADDR2   = "near Ideal Public School, Rajiv Nagar";
const FROM_CITY    = "Patna, Bihar – 800024";
const FROM_PHONE   = "+91 95230 54071";

export default async function ShippingLabelPage({ params }: { params: { orderNumber: string } }) {
  const { orderNumber } = params;
  const sb = adminClient();

  const oRes = await sb.from("orders").select("*").eq("order_number", orderNumber).single();
  if (!oRes.data) notFound();

  const iRes = await sb.from("invoices").select("invoice_number").eq("order_id", oRes.data.id).maybeSingle();

  const o = oRes.data;
  const invoiceNumber = iRes?.data?.invoice_number ?? null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A5; margin: 8mm; }
        @media print {
          html, body { background: white !important; }
          .no-print { display: none !important; }
        }
      `}} />

      <LabelActions orderNumber={o.order_number} />

      <div className="min-h-screen bg-[#e8e8e8] pt-14 pb-12 flex items-start justify-center print:pt-0 print:pb-0 print:bg-white print:block">
        <div
          className="bg-white w-full max-w-[420px] print:max-w-none"
          style={{ fontFamily: "Arial, sans-serif", boxShadow: "0 2px 16px rgba(0,0,0,0.12)" }}
        >

          {/* Header bar */}
          <div style={{ background: "#1a0a12", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#C4A373", fontSize: "13px", fontWeight: "bold", letterSpacing: "3px" }}>DHYOM</span>
            <span style={{ color: "rgba(196,163,115,0.55)", fontSize: "10px", letterSpacing: "1px" }}>SHIPPING LABEL</span>
          </div>

          {/* Order number — big scannable */}
          <div style={{ borderBottom: "2px solid #1a0a12", padding: "12px 16px", textAlign: "center", background: "#fafafa" }}>
            <div style={{ fontSize: "11px", color: "#888", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "2px" }}>Order Number</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", letterSpacing: "3px", color: "#1a0a12" }}>{o.order_number}</div>
            {invoiceNumber && (
              <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>Invoice: {invoiceNumber}</div>
            )}
          </div>

          {/* FROM / TO blocks */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #ddd" }}>

            {/* FROM */}
            <div style={{ padding: "12px 14px", borderRight: "1px solid #ddd" }}>
              <div style={{ fontSize: "9px", fontWeight: "bold", letterSpacing: "2px", color: "#888", textTransform: "uppercase", marginBottom: "6px" }}>From</div>
              <div style={{ fontSize: "11px", color: "#1a0a12", lineHeight: "1.6" }}>
                <div style={{ fontWeight: "bold" }}>{FROM_NAME}</div>
                <div>{FROM_ADDR1}</div>
                <div>{FROM_ADDR2}</div>
                <div>{FROM_CITY}</div>
                <div style={{ marginTop: "4px", color: "#555" }}>{FROM_PHONE}</div>
              </div>
            </div>

            {/* TO */}
            <div style={{ padding: "12px 14px", background: "#fffef8" }}>
              <div style={{ fontSize: "9px", fontWeight: "bold", letterSpacing: "2px", color: "#333", textTransform: "uppercase", marginBottom: "6px" }}>To</div>
              <div style={{ fontSize: "12px", color: "#1a0a12", lineHeight: "1.6" }}>
                <div style={{ fontWeight: "bold", fontSize: "13px" }}>{o.first_name} {o.last_name}</div>
                <div>{o.shipping_street}</div>
                <div>{o.shipping_city}</div>
                <div>{o.shipping_state}</div>
                <div style={{ fontWeight: "bold", fontSize: "13px", marginTop: "4px" }}>PIN: {o.shipping_pincode}</div>
                <div style={{ marginTop: "4px", color: "#444" }}>Ph: {o.phone}</div>
              </div>
            </div>

          </div>

          {/* COD / Payment */}
          <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #ddd" }}>
            <div style={{ fontSize: "11px", color: "#555" }}>
              Payment: <strong style={{ color: "#1a0a12" }}>{o.payment_method === "cod" ? "CASH ON DELIVERY" : "PREPAID"}</strong>
            </div>
            <div style={{ fontSize: "11px", color: "#555" }}>
              Amount: <strong style={{ color: "#1a0a12" }}>₹{Number(o.total).toLocaleString("en-IN")}</strong>
            </div>
          </div>

          {/* Items summary */}
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #ddd" }}>
            <div style={{ fontSize: "9px", letterSpacing: "1px", textTransform: "uppercase", color: "#888", marginBottom: "5px" }}>Contents</div>
            {(o.items as { name: string; quantity: number }[]).map((item, i) => (
              <div key={i} style={{ fontSize: "11px", color: "#333", display: "flex", justifyContent: "space-between" }}>
                <span>{item.name}</span>
                <span>× {item.quantity}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: "8px 16px", textAlign: "center" }}>
            <div style={{ fontSize: "9px", color: "#aaa", letterSpacing: "1px" }}>
              Fragile — Handle with care · dhyom.in
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
