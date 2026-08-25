import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

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
  name: string;
  label?: string;
  quantity: number;
  price: number;
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
 * Uses the hello_world template (no parameters) while the account is in
 * test mode. The recipient number must first be added via the Meta developer
 * sandbox UI before it will receive messages.
 *
 * TODO: When custom template order_alert_dhyom is approved by Meta, swap
 *   WHATSAPP_TEMPLATE_NAME env var and update the components payload to pass
 *   4 parameters: order_number, total_amount, payment_type, customer_name.
 * ──────────────────────────────────────────────────────────────────────── */
async function sendWhatsAppOrderAlert(_ctx: {
  orderNumber: string;
  customerName: string;
  total: number;
  paymentType?: string;
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

  const url  = `https://graph.facebook.com/v22.0/${phoneNumId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: recipient,
    type: "template",
    template: {
      name: template,
      language: { code: langCode },
      // No components needed for hello_world (zero parameters).
      // When switching to order_alert_dhyom, add:
      // components: [{ type: "body", parameters: [
      //   { type: "text", text: ctx.orderNumber },
      //   { type: "text", text: `₹${ctx.total}` },
      //   { type: "text", text: ctx.paymentType ?? "online" },
      //   { type: "text", text: ctx.customerName },
      // ]}]
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
    console.log("[notify-order/whatsapp] Sent — message id:", (data as { messages?: { id: string }[] }).messages?.[0]?.id);
  } catch (err) {
    // Never let WhatsApp errors block or fail the order flow
    console.error("[notify-order/whatsapp] Fetch error:", err);
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
    const { orderNumber, customerName, phone, email, address, items, total, paymentStatus, paymentType, amountPaidOnline, amountDueCod } = body;

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
      // Still attempt WhatsApp even if email failed — do NOT await, fire-and-forget
      void sendWhatsAppOrderAlert({ orderNumber, customerName, total, paymentType });
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    // Fire WhatsApp alert alongside the email — failure here never breaks the response
    await sendWhatsAppOrderAlert({ orderNumber, customerName, total, paymentType });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notify-order]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
