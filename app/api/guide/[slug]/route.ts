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

function buildEmailHtml(campaignTitle: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#1A0A14;font-family:Georgia,serif;">
  <div style="max-width:480px;margin:40px auto;background:#3D1428;border-radius:4px;overflow:hidden;">
    <div style="padding:36px 36px 0;">
      <p style="margin:0 0 6px;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#C4A373;">Dhyom</p>
      <div style="width:28px;height:1px;background:rgba(196,163,115,0.35);margin-bottom:28px;"></div>
    </div>
    <div style="padding:0 36px 36px;">
      <p style="margin:0 0 18px;font-style:italic;font-size:17px;line-height:1.85;color:rgba(245,237,224,0.78);font-weight:300;">
        The scent you are drawn to says something about who you are.
      </p>
      <p style="margin:0 0 18px;font-style:italic;font-size:17px;line-height:1.85;color:rgba(245,237,224,0.78);font-weight:300;">
        Your ${campaignTitle} guide is attached. Take a quiet moment with it.
      </p>
      <p style="margin:0 0 32px;font-size:13px;letter-spacing:2px;color:#C4A373;">— Dhyom</p>
      <div style="border-top:1px solid rgba(196,163,115,0.18);padding-top:24px;">
        <a href="https://dhyom.in" style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(196,163,115,0.50);text-decoration:none;">
          Visit dhyom.in
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const sb = adminClient();

    // 1. Look up campaign (service role — can see inactive too, for a cleaner 404)
    const { data: campaign, error: campErr } = await sb
      .from("campaigns")
      .select("id, title, tag, pdf_url, active")
      .eq("slug", slug)
      .single();

    if (campErr || !campaign) {
      return NextResponse.json({ error: "Guide not found." }, { status: 404 });
    }
    if (!campaign.active) {
      return NextResponse.json({ error: "This guide is no longer available." }, { status: 404 });
    }

    // 2. Validate email
    const body = await req.json();
    const trimmed = ((body.email as string) ?? "").trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // 3. Insert contact — always INSERT (no unique constraint; buyer rows untouched)
    try {
      const { error: dbErr } = await sb
        .from("contacts")
        .insert({ email: trimmed, tag: campaign.tag, campaign_id: campaign.id });
      if (dbErr) console.error(`[guide/${slug}] contacts INSERT error:`, dbErr);
    } catch (ex) {
      console.error(`[guide/${slug}] contacts exception:`, ex);
    }

    // 4. Fetch PDF from Cloudinary URL
    let pdfBase64: string | undefined;
    if (campaign.pdf_url) {
      try {
        const pdfRes = await fetch(campaign.pdf_url);
        if (pdfRes.ok) {
          pdfBase64 = Buffer.from(await pdfRes.arrayBuffer()).toString("base64");
          console.log(`[guide/${slug}] PDF loaded, size:`, pdfBase64.length);
        } else {
          console.warn(`[guide/${slug}] PDF fetch returned`, pdfRes.status);
        }
      } catch (fetchErr) {
        console.warn(`[guide/${slug}] PDF fetch failed:`, fetchErr);
      }
    }

    // 5. Send via Resend
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn(`[guide/${slug}] RESEND_API_KEY not set — skipping email`);
      return NextResponse.json({ ok: true });
    }

    const fromAddr = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
    const { data: resendData, error: resendErr } = await new Resend(apiKey).emails.send({
      from: `Dhyom <${fromAddr}>`,
      to: trimmed,
      subject: `Your ${campaign.title}`,
      html: buildEmailHtml(campaign.title),
      text: `Your ${campaign.title} guide is attached. Visit dhyom.in to explore our collection.`,
      headers: {
        "List-Unsubscribe": `<mailto:${fromAddr}?subject=unsubscribe>`,
      },
      ...(pdfBase64 && {
        attachments: [
          {
            filename: `${slug}.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    });

    if (resendErr) {
      console.error(`[guide/${slug}] Resend error:`, JSON.stringify(resendErr));
    } else {
      console.log(`[guide/${slug}] Email sent, id:`, resendData?.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[guide] unexpected error:`, err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
