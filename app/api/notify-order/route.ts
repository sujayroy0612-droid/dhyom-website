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

function buildHtml(data: {
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  items: OrderItem[];
  total: number;
  paymentStatus: string;
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderNumber, customerName, phone, email, address, items, total, paymentStatus } = body;

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
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@dhyom.in";

    const { error } = await resend.emails.send({
      from: `Dhyom <${fromEmail}>`,
      to: FOUNDER_EMAIL,
      subject: `New Order — ${orderNumber}`,
      html: buildHtml({ orderNumber, customerName, phone, email, address, items, total, paymentStatus }),
    });

    if (error) {
      console.error("[notify-order] Resend error:", error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notify-order]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
