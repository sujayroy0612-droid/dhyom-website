import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const SELLER_SHORT  = "Yukti";
const SELLER_STATE  = "Bihar";
const SELLER_GSTIN  = "10EFQPS4606H1ZC";
const SELLER_PAN    = "EFQPS4606H";
const SELLER_NAME   = "Sujay, trading as Yukti";
const SELLER_ADDR   =
  "Ground Floor, Road Number 8A, near Ideal Public School, Rajiv Nagar, Patna, Bihar – 800024";

const B = "Helvetica-Bold";
const R = "Helvetica";

const s = StyleSheet.create({
  page:        { fontFamily: R, fontSize: 9, color: "#111", paddingTop: 28, paddingBottom: 28, paddingLeft: 36, paddingRight: 36 },
  row:         { flexDirection: "row" },
  col:         { flexDirection: "column" },
  // Header
  headerWrap:  { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#aaa", paddingBottom: 6, marginBottom: 8 },
  invoiceTag:  { fontFamily: B, fontSize: 12, letterSpacing: 1, borderWidth: 1.5, borderColor: "#111", paddingHorizontal: 10, paddingVertical: 3, marginBottom: 5, alignSelf: "flex-start" },
  bold:        { fontFamily: B },
  right:       { textAlign: "right" },
  center:      { textAlign: "center" },
  // Address block
  addrBlock:   { flexDirection: "row", borderWidth: 1, borderColor: "#bbb", marginBottom: 8 },
  addrLeft:    { flex: 2, padding: 8, borderRightWidth: 1, borderRightColor: "#bbb" },
  addrRight:   { flex: 1, padding: 8 },
  secLabel:    { fontFamily: B, fontSize: 6.5, color: "#666", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  divider:     { borderTopWidth: 1, borderTopColor: "#ddd", marginTop: 6, paddingTop: 5 },
  // Table
  tHead:       { flexDirection: "row", backgroundColor: "#e8e8e8" },
  tRow:        { flexDirection: "row" },
  tFoot:       { flexDirection: "row", backgroundColor: "#f0f0f0" },
  cell: {
    borderRightWidth: 1, borderRightColor: "#bbb",
    borderBottomWidth: 1, borderBottomColor: "#bbb",
    paddingHorizontal: 5, paddingVertical: 4, fontSize: 8.5,
  },
  // Table col widths (intra-state: 7 cols; inter-state: 6 cols)
  cProduct:  { flex: 3 },
  cQty:      { flex: 1 },
  cAmt:      { flex: 1.5 },
  cTaxable:  { flex: 1.5 },
  cGst:      { flex: 1.3 },
  cCess:     { flex: 1.2 },
  cTotal:    { flex: 1.5 },
  // Footer
  footerWrap: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#ddd", paddingTop: 6, marginTop: 8, fontSize: 8.5 },
  payNote:    { borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 4, marginTop: 6, fontSize: 8, color: "#555" },
});

function r2(n: number) { return Math.round(n * 100) / 100; }
function fmt(n: number) { return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export interface InvoicePdfProps {
  orderNumber:     string;
  invoiceNumber:   string;
  invoiceDate:     string; // ISO
  orderDate:       string; // ISO
  customerName:    string;
  phone:           string;
  shippingStreet:  string;
  shippingCity:    string;
  shippingState:   string;
  shippingPincode: string;
  items: { id?: string; name: string; label?: string; price: number; quantity: number }[];
  subtotal:        number;
  shippingFee:     number;
  total:           number;
  paymentMethod:   "cod" | "online";
  paymentStatus:   string;
}

export function InvoicePdf(props: InvoicePdfProps) {
  const {
    orderNumber, invoiceNumber, invoiceDate, orderDate,
    customerName, phone,
    shippingStreet, shippingCity, shippingState, shippingPincode,
    items, shippingFee, total, paymentMethod, paymentStatus,
  } = props;

  const isIntra = shippingState?.toLowerCase().trim() === "bihar";
  const sf      = Number(shippingFee ?? 0);

  const lineItems = items.map(item => {
    const gross   = r2(item.price * item.quantity);
    const taxable = r2(gross / 1.05);
    const tax     = r2(gross - taxable);
    return { ...item, gross, taxable, tax };
  });

  const totalQty     = items.reduce((s, i) => s + i.quantity, 0);
  const grandTaxable = r2(lineItems.reduce((s, i) => s + i.taxable, 0));
  const grandTax     = r2(lineItems.reduce((s, i) => s + i.tax, 0));

  // Table border helpers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tbl: any = { ...s.cell, borderLeftWidth: 0, borderTopWidth: 0 };

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerWrap}>
          <View style={s.col}>
            <Text style={s.invoiceTag}>TAX INVOICE</Text>
            <Text style={{ marginBottom: 2 }}>
              <Text style={s.bold}>Order ID: </Text>{orderNumber}
            </Text>
            <Text>
              <Text style={s.bold}>Order Date: </Text>{fmtDate(orderDate)}
            </Text>
          </View>
          <View style={[s.col, { alignItems: "flex-end" }]}>
            <Text style={{ marginBottom: 2 }}>
              <Text style={s.bold}>Invoice No: </Text>{invoiceNumber}
            </Text>
            <Text style={{ marginBottom: 2 }}>
              <Text style={s.bold}>Invoice Date: </Text>{fmtDate(invoiceDate)}
            </Text>
            <Text style={{ marginBottom: 2 }}>
              <Text style={s.bold}>GSTIN: </Text>{SELLER_GSTIN}
            </Text>
            <Text>
              <Text style={s.bold}>PAN: </Text>{SELLER_PAN}
            </Text>
          </View>
        </View>

        {/* ── Address block ── */}
        <View style={s.addrBlock}>
          <View style={s.addrLeft}>
            <Text style={s.secLabel}>Shipping / Billing Address</Text>
            <Text style={[s.bold, { fontSize: 11, marginBottom: 2 }]}>{customerName}</Text>
            <Text>{shippingStreet}</Text>
            <Text>{shippingCity}, {shippingState} – {shippingPincode}</Text>
            {phone ? <Text>Ph: {phone}</Text> : null}
          </View>
          <View style={s.addrRight}>
            <Text style={s.secLabel}>Sold By</Text>
            <Text style={s.bold}>{SELLER_SHORT}</Text>
            <Text style={{ fontSize: 8 }}>Patna, {SELLER_STATE}</Text>
            <Text style={{ fontSize: 8 }}>GSTIN: {SELLER_GSTIN}</Text>
            <View style={s.divider}>
              <Text style={s.secLabel}>Items</Text>
              {lineItems.map((item, i) => (
                <View key={i} style={[s.row, { justifyContent: "space-between", marginBottom: 1 }]}>
                  <Text style={{ fontSize: 8, flex: 1 }}>{item.name}</Text>
                  <Text style={[s.bold, { fontSize: 8 }]}>×{item.quantity}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Items table ── */}
        {/* Table header */}
        <View style={[s.tHead, { borderTopWidth: 1, borderTopColor: "#bbb", borderLeftWidth: 1, borderLeftColor: "#bbb" }]}>
          <View style={[tbl, s.cProduct, { borderLeftWidth: 0 }]}>
            <Text style={[s.bold, s.center, { fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5 }]}>Product</Text>
          </View>
          <View style={[tbl, s.cQty]}>
            <Text style={[s.bold, s.center, { fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5 }]}>Qty</Text>
          </View>
          <View style={[tbl, s.cAmt]}>
            <Text style={[s.bold, s.center, { fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5 }]}>Amt (₹)</Text>
          </View>
          <View style={[tbl, s.cTaxable]}>
            <Text style={[s.bold, s.center, { fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5 }]}>Taxable (₹)</Text>
          </View>
          {isIntra ? (
            <>
              <View style={[tbl, s.cGst]}>
                <Text style={[s.bold, s.center, { fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5 }]}>CGST 2.5%</Text>
              </View>
              <View style={[tbl, s.cGst]}>
                <Text style={[s.bold, s.center, { fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5 }]}>SGST 2.5%</Text>
              </View>
            </>
          ) : (
            <View style={[tbl, { flex: 2.6 }]}>
              <Text style={[s.bold, s.center, { fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5 }]}>IGST 5%</Text>
            </View>
          )}
          <View style={[tbl, s.cCess]}>
            <Text style={[s.bold, s.center, { fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5 }]}>CESS</Text>
          </View>
          <View style={[tbl, s.cTotal]}>
            <Text style={[s.bold, s.center, { fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5 }]}>Total (₹)</Text>
          </View>
        </View>

        {/* Table rows */}
        {lineItems.map((item, i) => (
          <View key={i} style={[s.tRow, { borderLeftWidth: 1, borderLeftColor: "#bbb" }]}>
            <View style={[tbl, s.cProduct, { borderLeftWidth: 0 }]}>
              <Text style={s.bold}>{item.name}</Text>
              {item.label ? <Text style={{ color: "#555", fontSize: 8 }}>{item.label}</Text> : null}
            </View>
            <View style={[tbl, s.cQty]}>
              <Text style={s.center}>{item.quantity}</Text>
            </View>
            <View style={[tbl, s.cAmt]}>
              <Text style={s.right}>{fmt(item.gross)}</Text>
            </View>
            <View style={[tbl, s.cTaxable]}>
              <Text style={s.right}>{fmt(item.taxable)}</Text>
            </View>
            {isIntra ? (
              <>
                <View style={[tbl, s.cGst]}>
                  <Text style={s.right}>{fmt(r2(item.tax / 2))}</Text>
                </View>
                <View style={[tbl, s.cGst]}>
                  <Text style={s.right}>{fmt(r2(item.tax - r2(item.tax / 2)))}</Text>
                </View>
              </>
            ) : (
              <View style={[tbl, { flex: 2.6 }]}>
                <Text style={s.right}>{fmt(item.tax)}</Text>
              </View>
            )}
            <View style={[tbl, s.cCess]}>
              <Text style={s.right}>0.00</Text>
            </View>
            <View style={[tbl, s.cTotal]}>
              <Text style={[s.right, s.bold]}>{fmt(item.gross)}</Text>
            </View>
          </View>
        ))}

        {/* Shipping row */}
        {sf > 0 && (
          <View style={[s.tRow, { borderLeftWidth: 1, borderLeftColor: "#bbb" }]}>
            <View style={[tbl, s.cProduct, { borderLeftWidth: 0 }]}>
              <Text style={{ color: "#555", fontStyle: "italic" }}>Shipping Charges</Text>
            </View>
            <View style={[tbl, s.cQty]}><Text style={s.center}>1</Text></View>
            <View style={[tbl, s.cAmt]}><Text style={s.right}>{fmt(sf)}</Text></View>
            <View style={[tbl, s.cTaxable]}><Text style={s.right}>{fmt(sf)}</Text></View>
            {isIntra ? (
              <>
                <View style={[tbl, s.cGst]}><Text style={s.right}>0.00</Text></View>
                <View style={[tbl, s.cGst]}><Text style={s.right}>0.00</Text></View>
              </>
            ) : (
              <View style={[tbl, { flex: 2.6 }]}><Text style={s.right}>0.00</Text></View>
            )}
            <View style={[tbl, s.cCess]}><Text style={s.right}>0.00</Text></View>
            <View style={[tbl, s.cTotal]}><Text style={[s.right, s.bold]}>{fmt(sf)}</Text></View>
          </View>
        )}

        {/* Table footer */}
        <View style={[s.tFoot, { borderLeftWidth: 1, borderLeftColor: "#bbb" }]}>
          <View style={[tbl, s.cProduct, { borderLeftWidth: 0 }]}>
            <Text style={s.bold}>Total Qty: {totalQty}</Text>
          </View>
          <View style={[tbl, s.cQty]} />
          <View style={[tbl, s.cAmt]}><Text style={[s.right, s.bold]}>{fmt(grandTaxable + sf)}</Text></View>
          <View style={[tbl, s.cTaxable]}><Text style={[s.right, s.bold]}>{fmt(grandTaxable)}</Text></View>
          {isIntra ? (
            <>
              <View style={[tbl, s.cGst]}><Text style={[s.right, s.bold]}>{fmt(r2(grandTax / 2))}</Text></View>
              <View style={[tbl, s.cGst]}><Text style={[s.right, s.bold]}>{fmt(r2(grandTax - r2(grandTax / 2)))}</Text></View>
            </>
          ) : (
            <View style={[tbl, { flex: 2.6 }]}><Text style={[s.right, s.bold]}>{fmt(grandTax)}</Text></View>
          )}
          <View style={[tbl, s.cCess]}><Text style={s.right}>0.00</Text></View>
          <View style={[tbl, s.cTotal]}>
            <Text style={[s.right, s.bold]}>₹{fmt(Number(total))}</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footerWrap}>
          <View style={{ flex: 2, paddingRight: 12 }}>
            <Text style={s.bold}>Seller Registered Address:</Text>
            <Text style={{ lineHeight: 1.5 }}>{SELLER_NAME}, {SELLER_ADDR}</Text>
            <Text style={{ color: "#888", marginTop: 3 }}>E. &amp; O.E.</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[s.bold, { fontSize: 11, marginBottom: 18 }]}>{SELLER_SHORT}</Text>
            <View style={{ borderTopWidth: 1, borderTopColor: "#666", paddingTop: 2 }}>
              <Text style={{ fontSize: 7.5, color: "#666" }}>Authorized Signature</Text>
            </View>
          </View>
        </View>

        {/* Payment note */}
        <View style={s.payNote}>
          <Text>
            Payment Method: <Text style={s.bold}>{paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment (Razorpay)"}</Text>
            {"  "}|{"  "}
            Payment Status: <Text style={s.bold}>{paymentStatus}</Text>
            {"  "}|{"  "}
            This is a computer-generated invoice. No physical signature required.
          </Text>
        </View>

      </Page>
    </Document>
  );
}
