import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { name, phone, email, num_boxes, notes, subcategory } = await req.json();

    if (!name?.trim() || !phone?.trim() || !email?.trim() || !num_boxes) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const message = `Bulk inquiry: ${num_boxes} boxes · ${subcategory ?? "gift"}${notes ? ` · Notes: ${notes}` : ""}`;

    const sb = adminClient();
    await sb.from("contacts").insert({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      message,
      tag: "bulk_inquiry",
    });

    // Notify founder via email
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "hello@dhyom.in";
    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: fromEmail,
        to: "sujayroy0612@gmail.com",
        subject: `Bulk Gifting Enquiry — ${num_boxes} boxes (${subcategory ?? "gift"})`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;padding:24px">
            <h2 style="margin:0 0 16px">Bulk Gifting Enquiry</h2>
            <table style="border-collapse:collapse;width:100%">
              <tr><td style="padding:6px 0;color:#888;width:120px">Name</td><td style="padding:6px 0"><strong>${name}</strong></td></tr>
              <tr><td style="padding:6px 0;color:#888">Phone</td><td style="padding:6px 0">${phone}</td></tr>
              <tr><td style="padding:6px 0;color:#888">Email</td><td style="padding:6px 0">${email}</td></tr>
              <tr><td style="padding:6px 0;color:#888">Boxes</td><td style="padding:6px 0"><strong>${num_boxes}</strong></td></tr>
              <tr><td style="padding:6px 0;color:#888">Category</td><td style="padding:6px 0">${subcategory ?? "gift"}</td></tr>
              ${notes ? `<tr><td style="padding:6px 0;color:#888;vertical-align:top">Notes</td><td style="padding:6px 0">${notes}</td></tr>` : ""}
            </table>
          </div>
        `,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("bulk-inquiry error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
