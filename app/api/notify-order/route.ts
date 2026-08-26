import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { createAndShipOrder } from "@/lib/shiprocket";

const FOUNDER_EMAIL = "dhyomecom@gmail.com";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function tagAsBuyer(email: string) {
  try {
    const sb = adminClient();
    const { data: updated, error: updateErr } = await sb
      .from("contacts")
      .update({ tag: "buyer" })
      .eq("email", email)
      .select("id");
    if (updateErr) {
      console.error("[notify-order] buyer tag UPDATE error:", updateErr);
      return;
    }
    if (!updated || updated.length === 0) {
      const { error: insertErr } = await sb
        .from("contacts")
        .insert({ email, tag: "buyer" });
      if (insertErr) {
        console.error("[notify-order] buyer tag INSERT error:", insertErr);
      }
    }
  } catch (err) {
    console.error("[notify-order] tagAsBuyer error:", err);
  }
}

interface OrderItem {
  id?:      string;
  name:     string;
  label?:   string;
  quantity: number;
  price:    number;
}

function inr(n: number) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildText(data: {
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  items: OrderItem[];
  total: number;
  paymentStatus: string;
  paymentType?: string;
  amountPaidOnline?: number;
  amountDueCod?: number;
}): string {
  const lines = [
    `New Order — ${data.orderNumber}`,
    "",
    `Customer : ${data.customerName}`,
    `Phone    : ${data.phone}`,
    `Email    : ${data.email}`,
    `Address  : ${data.address}`,
    `Payment  : ${data.paymentStatus}`,
    "",
    "Items:",
    ...data.items.map(
      (i) => `  ${i.name}${i.label ? ` (${i.label})` : ""} x${i.quantity} — ${inr(i.price * i.quantity)}`
    ),
    "",
    `Total: ${inr(data.total)}`,
    ...(data.paymentType === "partial_cod"
      ? [
          `Paid online : ${inr(data.amountPaidOnline ?? 0)}`,
          `COD to collect : ${inr(data.amountDueCod ?? 0)}  ← collect at delivery`,
        ]
      : []
    ),
    "",
    "This is an internal order alert sent to the Dhyom founder.",
  ];
  return lines.join("\n");
}

function buildHtml(data: {
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  items: OrderItem[];
  total: number;
  paymentStatus: string;
  paymentType?: string;
  amountPaidOnline?: number;
  amountDueCod?: number;
}) {
  const itemRows = data.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;">${item.name}${item.label ? ` <span style="color:#888;font-size:12px;">(${item.label})</span>` : ""}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${inr(item.price * item.quantity)}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#111;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border:1px solid #ddd;border-radius:4px;overflow:hidden;">

    <div style="background:#1a0a12;padding:16px 24px;">
      <p style="margin:0;color:#c4a373;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Dhyom — New Order</p>
      <h1 style="margin:4px 0 0;color:#fff;font-size:20px;letter-spacing:1px;">${data.orderNumber}</h1>
    </div>

    <div style="padding:20px 24px;">

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:5px 0;font-size:12px;color:#888;width:120px;">Customer</td>
          <td style="padding:5px 0;font-size:14px;font-weight:bold;">${data.customerName}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:12px;color:#888;">Phone</td>
          <td style="padding:5px 0;font-size:14px;">${data.phone}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:12px;color:#888;">Email</td>
          <td style="padding:5px 0;font-size:14px;">${data.email}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:12px;color:#888;vertical-align:top;">Ship To</td>
          <td style="padding:5px 0;font-size:14px;">${data.address}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:12px;color:#888;">Payment</td>
          <td style="padding:5px 0;font-size:14px;color:#1a7a3a;font-weight:bold;">${data.paymentStatus}</td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f8f8f8;">
            <th style="padding:7px 10px;text-align:left;font-size:11px;color:#666;border-bottom:2px solid #eee;">Item</th>
            <th style="padding:7px 10px;text-align:center;font-size:11px;color:#666;border-bottom:2px solid #eee;">Qty</th>
            <th style="padding:7px 10px;text-align:right;font-size:11px;color:#666;border-bottom:2px solid #eee;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:10px 10px 4px;text-align:right;font-size:13px;font-weight:bold;">Total</td>
            <td style="padding:10px 10px 4px;text-align:right;font-size:15px;font-weight:bold;">${inr(data.total)}</td>
          </tr>
          ${data.paymentType === "partial_cod" ? `
          <tr>
            <td colspan="2" style="padding:4px 10px;text-align:right;font-size:12px;color:#888;">Paid online</td>
            <td style="padding:4px 10px;text-align:right;font-size:13px;color:#1a7a3a;">${inr(data.amountPaidOnline ?? 0)} ✓</td>
          </tr>
          <tr style="background:#fff8ec;">
            <td colspan="2" style="padding:6px 10px;text-align:right;font-size:12px;font-weight:bold;color:#b06000;">⚠ COD to Collect at Delivery</td>
            <td style="padding:6px 10px;text-align:right;font-size:14px;font-weight:bold;color:#b06000;">${inr(data.amountDueCod ?? 0)}</td>
          </tr>` : ""}
        </tfoot>
      </table>

      <p style="margin:0;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:12px;">
        This is an internal order alert sent to the Dhyom founder.
      </p>

    </div>
  </div>
</body>
</html>`;
}

/* ── WhatsApp Cloud API alert ─────────────────────────────────────────────
 * Live template   : WHATSAPP_TEMPLATE_NAME=hello_world (no parameters)
 * Pending template: WHATSAPP_TEMPLATE_NAME_PENDING=order_alert_dhyom
 *
 * TODO: Once order_alert_dhyom is approved by Meta (check WhatsApp Manager
 *   > Message templates > Test WhatsApp Business Account), change
 *   WHATSAPP_TEMPLATE_NAME to 'order_alert_dhyom' in .env.local and Vercel,
 *   then this function will automatically send real order_number,
 *   total_amount, and customer_name instead of the empty hello_world message.
 *
 * The function already builds the 3-parameter components payload for
 * order_alert_dhyom. Switching the env var is the only action required.
 * ──────────────────────────────────────────────────────────────────────── */
async function sendWhatsAppOrderAlert(ctx: {
  orderNumber: string;
  total: number;
  customerName: string;
}): Promise<void> {
  const token      = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipient  = process.env.WHATSAPP_RECIPIENT_NUMBER;
  const template   = process.env.WHATSAPP_TEMPLATE_NAME ?? "hello_world";
  const langCode   = process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en_US";

  if (!token || !phoneNumId || !recipient) {
    console.warn("[notify-order/whatsapp] Env vars not set — skipping WhatsApp alert");
    return;
  }

  // hello_world has zero parameters — components must be omitted entirely.
  // Any other template (e.g. order_alert_dhyom) gets 3 body parameters:
  //   {{1}} order_number  {{2}} total_amount  {{3}} customer_name
  const components = template === "hello_world"
    ? undefined
    : [
        {
          type: "body",
          parameters: [
            { type: "text", text: ctx.orderNumber },
            { type: "text", text: `₹${Number(ctx.total).toLocaleString("en-IN")}` },
            { type: "text", text: ctx.customerName },
          ],
        },
      ];

  const url  = `https://graph.facebook.com/v22.0/${phoneNumId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: recipient,
    type: "template",
    template: {
      name: template,
      language: { code: langCode },
      ...(components ? { components } : {}),
    },
  };

  try {
    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error("[notify-order/whatsapp] API error:", res.status, JSON.stringify(errBody));
      return;
    }

    const data = await res.json();
    console.log(
      `[notify-order/whatsapp] Sent (template: ${template}) — message id:`,
      (data as { messages?: { id: string }[] }).messages?.[0]?.id,
    );
  } catch (err) {
    // Never let WhatsApp errors block or fail the order flow
    console.error("[notify-order/whatsapp] Fetch error:", err);
  }
}

/* ── Customer order confirmation email + PDF invoice ──────────────────────
 * Sends a branded confirmation email to the customer with GST invoice PDF.
 * PDF generation uses @react-pdf/renderer (pure JS, no Chromium — Vercel safe).
 * PDF failure is caught and the email sends without attachment.
 * ──────────────────────────────────────────────────────────────────────── */

function buildCustomerHtml(data: {
  orderNumber:       string;
  customerName:      string;
  items:             OrderItem[];
  subtotal:          number;
  shippingFee:       number;
  total:             number;
  paymentType?:      string | null;
  amountPaidOnline?: number | null;
  amountDueCod?:     number | null;
  shippingStreet:    string;
  shippingCity:      string;
  shippingState:     string;
  shippingPincode:   string;
}, invoiceNumber: string | null): string {
  const isCod = data.paymentType === "partial_cod";
  const sf    = Number(data.shippingFee ?? 0);

  const itemRows = data.items.map(item => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(196,163,115,0.10);vertical-align:top;">
        <div style="color:#f5ede0;font-size:14px;font-family:Georgia,serif;font-weight:bold;">${item.name}</div>
        ${item.label ? `<div style="color:#c4a373;font-size:12px;margin-top:2px;">${item.label}</div>` : ""}
        <div style="color:rgba(245,237,224,0.45);font-size:12px;margin-top:2px;">Qty: ${item.quantity}</div>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid rgba(196,163,115,0.10);text-align:right;vertical-align:top;color:#f5ede0;font-size:14px;white-space:nowrap;">
        ${inr(item.price * item.quantity)}
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0508;font-family:Georgia,serif;color:#f5ede0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0508;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#1a0a12;border:1px solid rgba(196,163,115,0.15);border-radius:4px;overflow:hidden;">
  <tr>
    <td style="background:#120710;padding:28px 32px;border-bottom:1px solid rgba(196,163,115,0.12);">
      <p style="margin:0 0 4px;color:rgba(196,163,115,0.45);font-size:10px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;">Order Confirmed</p>
      <h1 style="margin:0;color:#c4a373;font-size:22px;letter-spacing:2px;font-family:Georgia,serif;font-weight:normal;">${data.orderNumber}</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:24px 32px 0;">
      <p style="margin:0 0 8px;color:rgba(245,237,224,0.90);font-size:16px;line-height:1.6;">Namaste, ${data.customerName.split(" ")[0]} 🙏</p>
      <p style="margin:0 0 24px;color:rgba(245,237,224,0.60);font-size:14px;line-height:1.7;">
        Thank you for your order. We have received your payment and your sacred items are being prepared with care.${invoiceNumber ? " Your GST invoice is attached to this email." : ""}
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 32px 24px;">
      <p style="margin:0 0 12px;color:rgba(196,163,115,0.50);font-size:10px;letter-spacing:2.5px;text-transform:uppercase;font-family:Arial,sans-serif;border-bottom:1px solid rgba(196,163,115,0.12);padding-bottom:8px;">Your Order</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${itemRows}
        ${sf > 0 ? `<tr>
          <td style="padding:10px 0;border-bottom:1px solid rgba(196,163,115,0.10);color:rgba(245,237,224,0.50);font-size:13px;">Shipping</td>
          <td style="padding:10px 0;border-bottom:1px solid rgba(196,163,115,0.10);text-align:right;color:rgba(245,237,224,0.50);font-size:13px;">${inr(sf)}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:14px 0 0;color:#f5ede0;font-size:15px;font-weight:bold;">Total</td>
          <td style="padding:14px 0 0;text-align:right;color:#c4a373;font-size:17px;font-weight:bold;">${inr(data.total)}</td>
        </tr>
        ${isCod ? `<tr><td colspan="2" style="padding:8px 0 0;">
          <div style="background:rgba(220,150,60,0.10);border:1px solid rgba(220,150,60,0.30);border-radius:4px;padding:10px 14px;margin-top:4px;">
            <p style="margin:0 0 2px;color:rgba(220,150,60,0.65);font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">COD Amount to Collect</p>
            <p style="margin:0;color:rgba(220,150,60,0.95);font-size:18px;font-weight:bold;">${inr(data.amountDueCod ?? 0)}</p>
            <p style="margin:4px 0 0;color:rgba(220,150,60,0.55);font-size:12px;">${inr(data.amountPaidOnline ?? 0)} already paid online. Please keep the remaining amount ready in cash at delivery.</p>
          </div>
        </td></tr>` : ""}
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:0 32px 24px;">
      <p style="margin:0 0 10px;color:rgba(196,163,115,0.50);font-size:10px;letter-spacing:2.5px;text-transform:uppercase;font-family:Arial,sans-serif;border-bottom:1px solid rgba(196,163,115,0.12);padding-bottom:8px;">Shipping To</p>
      <p style="margin:0;color:rgba(245,237,224,0.70);font-size:14px;line-height:1.7;">
        ${data.customerName}<br>${data.shippingStreet}<br>${data.shippingCity}, ${data.shippingState} – ${data.shippingPincode}
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 32px 24px;">
      <div style="background:rgba(196,163,115,0.05);border:1px solid rgba(196,163,115,0.12);border-radius:4px;padding:16px 20px;">
        <p style="margin:0 0 10px;color:#c4a373;font-size:13px;font-weight:bold;">📦 Expected Delivery: 5–7 Business Days</p>
        <p style="margin:0 0 8px;color:rgba(245,237,224,0.55);font-size:12px;line-height:1.6;">Your order will be dispatched within 1–2 business days of payment confirmation.</p>
        <p style="margin:0;color:rgba(245,237,224,0.55);font-size:12px;line-height:1.6;">
          🔄 <strong style="color:rgba(245,237,224,0.70);">7-Day Replacement Policy:</strong> If your item arrives damaged or defective, contact us within 7 days at <a href="mailto:dhyomecom@gmail.com" style="color:#c4a373;">dhyomecom@gmail.com</a> with your order number and a photo.
        </p>
      </div>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 32px;background:#120710;border-top:1px solid rgba(196,163,115,0.10);">
      <p style="margin:0;color:rgba(245,237,224,0.25);font-size:11px;line-height:1.6;text-align:center;">
        Dhyom — Sacred Home &amp; Pooja Décor<br>
        <a href="https://www.dhyom.in" style="color:rgba(196,163,115,0.45);text-decoration:none;">www.dhyom.in</a>
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function sendCustomerConfirmation(data: {
  orderNumber:       string;
  customerName:      string;
  email:             string;
  phone:             string;
  items:             OrderItem[];
  subtotal:          number;
  shippingFee:       number;
  total:             number;
  paymentType?:      string | null;
  amountPaidOnline?: number | null;
  amountDueCod?:     number | null;
  shippingStreet:    string;
  shippingCity:      string;
  shippingState:     string;
  shippingPincode:   string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !data.email) return;

  const resend    = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "hello@dhyom.in";
  const now       = new Date().toISOString();

  // ── 1. Get or create invoice ──────────────────────────────────────────────
  let invoiceNumber: string | null = null;
  let invoiceDate                  = now;
  try {
    const sb = adminClient();
    const { data: orderRow } = await sb
      .from("orders").select("id").eq("order_number", data.orderNumber).single();
    if (orderRow) {
      const { data: existing } = await sb
        .from("invoices").select("invoice_number, created_at")
        .eq("order_id", orderRow.id).maybeSingle();
      if (existing) {
        invoiceNumber = existing.invoice_number;
        invoiceDate   = existing.created_at ?? now;
      } else {
        const { data: invNum } = await sb.rpc("generate_invoice_number");
        if (invNum) {
          const taxable_value = Math.round(Number(data.subtotal) * 100) / 100;
          const gst_amount    = Math.round(taxable_value * 5) / 100;
          const total_amount  = Math.round((taxable_value + gst_amount + Number(data.shippingFee ?? 0)) * 100) / 100;
          const { data: inv } = await sb.from("invoices")
            .insert({ invoice_number: invNum, order_id: orderRow.id, order_number: data.orderNumber, taxable_value, gst_amount, total_amount })
            .select("invoice_number, created_at").single();
          invoiceNumber = inv?.invoice_number ?? null;
          invoiceDate   = inv?.created_at ?? now;
        }
      }
    }
  } catch (err) {
    console.error("[notify-order/customer-email] Invoice error:", err);
  }

  // ── 2. Generate PDF (fail gracefully — email still sends without it) ──────
  let pdfAttachment: { filename: string; content: string } | undefined;
  if (invoiceNumber) {
    try {
      const { renderToBuffer } = await import("@react-pdf/renderer");
      const { InvoicePdf }     = await import("@/lib/invoice-pdf");
      const React              = (await import("react")).default;
      const buffer = await renderToBuffer(
        React.createElement(InvoicePdf, {
          orderNumber:     data.orderNumber,
          invoiceNumber,
          invoiceDate,
          orderDate:       now,
          customerName:    data.customerName,
          phone:           data.phone,
          shippingStreet:  data.shippingStreet,
          shippingCity:    data.shippingCity,
          shippingState:   data.shippingState,
          shippingPincode: data.shippingPincode,
          items:           data.items,
          subtotal:        data.subtotal,
          shippingFee:     data.shippingFee ?? 0,
          total:           data.total,
          paymentMethod:   data.paymentType === "partial_cod" ? "cod" : "online",
          paymentStatus:   "paid",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any,
      );
      pdfAttachment = {
        filename: `Dhyom_Invoice_${invoiceNumber}.pdf`,
        content:  buffer.toString("base64"),
      };
      console.log(`[notify-order/customer-email] PDF ready: ${invoiceNumber}`);
    } catch (err) {
      console.error("[notify-order/customer-email] PDF failed — sending without attachment:", err);
    }
  }

  // ── 3. Send ───────────────────────────────────────────────────────────────
  try {
    const emailPayload: Parameters<typeof resend.emails.send>[0] = {
      from:    `Dhyom <${fromEmail}>`,
      to:      data.email,
      subject: `Your Dhyom Order Confirmation — ${data.orderNumber}`,
      html:    buildCustomerHtml(data, invoiceNumber),
    };
    if (pdfAttachment) emailPayload.attachments = [pdfAttachment];
    const { error: custErr } = await resend.emails.send(emailPayload);
    if (custErr) {
      console.error("[notify-order/customer-email] Resend error:", custErr);
    } else {
      console.log(`[notify-order/customer-email] Sent → ${data.email} | invoice: ${invoiceNumber ?? "none"} | PDF: ${pdfAttachment ? "yes" : "no"}`);
    }
  } catch (err) {
    console.error("[notify-order/customer-email] Send error:", err);
  }
}

/* ── Shiprocket automated fulfillment ────────────────────────────────────
 * Called after email + WhatsApp — fully fail-safe, never blocks the response.
 * Saves shiprocket_order_id, awb_number, courier_name, tracking_url, label_url
 * back to the orders row (matched by order_number).
 * ──────────────────────────────────────────────────────────────────────── */
async function dispatchToShiprocket(data: {
  orderNumber:     string;
  orderDate:       string;
  firstName:       string;
  lastName:        string;
  email:           string;
  phone:           string;
  shippingStreet:  string;
  shippingCity:    string;
  shippingState:   string;
  shippingPincode: string;
  items:           OrderItem[];
  total:           number;
  paymentType:     string | null | undefined;
  amountDueCod:    number | null | undefined;
}): Promise<void> {
  const srEnabled = process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD;
  if (!srEnabled) {
    console.warn("[notify-order/shiprocket] Env vars not set — skipping Shiprocket");
    return;
  }

  try {
    // Fetch per-product dimensions from the products table.
    // Weight = sum of (weight_grams × qty); dims = max across all items.
    // Falls back to Shiprocket defaults if any field is null.
    let weightKg: number | undefined;
    let lengthCm: number | undefined;
    let breadthCm: number | undefined;
    let heightCm: number | undefined;

    const productIds = data.items.map(i => i.id).filter(Boolean) as string[];
    if (productIds.length > 0) {
      const sb = adminClient();
      const { data: prods } = await sb
        .from("products")
        .select("id, weight_grams, length_cm, width_cm, height_cm")
        .in("id", productIds);

      if (prods && prods.length > 0) {
        const byId = new Map(prods.map(p => [p.id as string, p]));
        let totalGrams = 0;
        let hasWeight = false;
        let maxL = 0, maxW = 0, maxH = 0, hasDims = false;

        for (const item of data.items) {
          const p = byId.get(item.id ?? "");
          if (!p) continue;
          if (p.weight_grams) {
            totalGrams += (p.weight_grams as number) * item.quantity;
            hasWeight = true;
          }
          if (p.length_cm) { maxL = Math.max(maxL, p.length_cm as number); hasDims = true; }
          if (p.width_cm)  { maxW = Math.max(maxW, p.width_cm  as number); }
          if (p.height_cm) { maxH = Math.max(maxH, p.height_cm as number); }
        }

        if (hasWeight) weightKg = Math.max(0.1, totalGrams / 1000);
        if (hasDims)   { lengthCm = maxL || 15; breadthCm = maxW || 10; heightCm = maxH || 8; }
      }
    }

    const result = await createAndShipOrder({
      orderNumber:     data.orderNumber,
      orderDate:       data.orderDate,
      firstName:       data.firstName,
      lastName:        data.lastName,
      email:           data.email,
      phone:           data.phone,
      shippingStreet:  data.shippingStreet,
      shippingCity:    data.shippingCity,
      shippingState:   data.shippingState,
      shippingPincode: data.shippingPincode,
      items:           data.items,
      total:           data.total,
      paymentType:     (data.paymentType as "online" | "partial_cod" | null) ?? null,
      amountDueCod:    data.amountDueCod,
      weightKg,
      lengthCm,
      breadthCm,
      heightCm,
    });

    console.log(
      `[notify-order/shiprocket] Created — SR order: ${result.shiprocketOrderId}, AWB: ${result.awbNumber}, courier: ${result.courierName}`,
    );

    // Persist tracking fields back to orders table
    const sb = adminClient();
    const { error: updateErr } = await sb
      .from("orders")
      .update({
        shiprocket_order_id:   result.shiprocketOrderId,
        shiprocket_shipment_id: result.shipmentId,
        awb_number:            result.awbNumber,
        courier_name:          result.courierName,
        tracking_url:          result.trackingUrl,
        label_url:             result.labelUrl,
      })
      .eq("order_number", data.orderNumber);

    if (updateErr) {
      console.error("[notify-order/shiprocket] DB update error:", updateErr);
    }
  } catch (err) {
    console.error("[notify-order/shiprocket] Error:", err);
  }
}

export async function POST(req: NextRequest) {
  // Only accept calls from our own server (verify-payment sends CRON_SECRET as Bearer)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
    if (auth !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = await req.json();
    const {
      orderNumber, customerName, phone, email, address, items, total,
      paymentStatus, paymentType, amountPaidOnline, amountDueCod,
      firstName, lastName, shippingStreet, shippingCity, shippingState, shippingPincode,
      subtotal, shippingFee,
    } = body;

    if (!orderNumber) {
      return NextResponse.json({ error: "orderNumber required" }, { status: 400 });
    }

    // Tag buyer in contacts — errors are caught inside tagAsBuyer and logged, never surface here
    if (email) await tagAsBuyer(email);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[notify-order] RESEND_API_KEY not set — skipping email");
      return NextResponse.json({ ok: true, skipped: true });
    }

    const resend = new Resend(apiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "hello@dhyom.in";
    const orderData = { orderNumber, customerName, phone, email, address, items, total, paymentStatus, paymentType, amountPaidOnline, amountDueCod };

    const { error } = await resend.emails.send({
      from:    `Dhyom <${fromEmail}>`,
      to:      FOUNDER_EMAIL,
      replyTo: "dhyomecom@gmail.com",
      subject: `New Order — ${orderNumber}`,
      html:    buildHtml(orderData),
      text:    buildText(orderData),
    });

    if (error) {
      console.error("[notify-order] Resend error:", error);
      void sendWhatsAppOrderAlert({ orderNumber, total, customerName });
      await dispatchToShiprocket({
        orderNumber,
        orderDate: new Date().toISOString(),
        firstName:       firstName  ?? customerName?.split(" ")[0] ?? "",
        lastName:        lastName   ?? customerName?.split(" ").slice(1).join(" ") ?? "",
        email,
        phone,
        shippingStreet:  shippingStreet  ?? address ?? "",
        shippingCity:    shippingCity    ?? "",
        shippingState:   shippingState   ?? "",
        shippingPincode: shippingPincode ?? "",
        items:      items ?? [],
        total,
        paymentType,
        amountDueCod,
      });
      await sendCustomerConfirmation({
        orderNumber, customerName, email, phone,
        items:           items ?? [],
        subtotal:        subtotal ?? 0,
        shippingFee:     shippingFee ?? 0,
        total, paymentType, amountPaidOnline, amountDueCod,
        shippingStreet:  shippingStreet  ?? address ?? "",
        shippingCity:    shippingCity    ?? "",
        shippingState:   shippingState   ?? "",
        shippingPincode: shippingPincode ?? "",
      });
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    // Fire WhatsApp alert alongside the email — failure here never breaks the response
    await sendWhatsAppOrderAlert({ orderNumber, total, customerName });

    // Dispatch to Shiprocket — awaited so the Lambda stays alive until it completes.
    // Safe to await here: verify-payment already returned ok to the customer.
    await dispatchToShiprocket({
      orderNumber,
      orderDate: new Date().toISOString(),
      firstName:       firstName  ?? customerName?.split(" ")[0] ?? "",
      lastName:        lastName   ?? customerName?.split(" ").slice(1).join(" ") ?? "",
      email,
      phone,
      shippingStreet:  shippingStreet  ?? address ?? "",
      shippingCity:    shippingCity    ?? "",
      shippingState:   shippingState   ?? "",
      shippingPincode: shippingPincode ?? "",
      items:      items ?? [],
      total,
      paymentType,
      amountDueCod,
    });

    // Send branded confirmation email to customer with GST invoice PDF.
    await sendCustomerConfirmation({
      orderNumber,
      customerName,
      email,
      phone,
      items:           items ?? [],
      subtotal:        subtotal ?? 0,
      shippingFee:     shippingFee ?? 0,
      total,
      paymentType,
      amountPaidOnline,
      amountDueCod,
      shippingStreet:  shippingStreet  ?? address ?? "",
      shippingCity:    shippingCity    ?? "",
      shippingState:   shippingState   ?? "",
      shippingPincode: shippingPincode ?? "",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notify-order]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
