import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createHmac } from "crypto";

// ── Supabase ─────────────────────────────────────────────────────────────────

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ── Unsubscribe helpers ───────────────────────────────────────────────────────

function unsubscribeUrl(email: string): string {
  const e = Buffer.from(email).toString("base64url");
  const t = createHmac("sha256", process.env.CRON_SECRET!).update(email).digest("hex");
  return `https://dhyom.in/api/unsubscribe?e=${e}&t=${t}`;
}

// ── Email builder helpers ─────────────────────────────────────────────────────

function p(text: string): string {
  return `<p style="margin:0 0 20px;font-style:italic;font-size:16px;line-height:1.9;color:rgba(245,237,224,0.82);font-weight:300;">${text}</p>`;
}

function emailWrapper(previewText: string, body: string, unsub: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#1A0A14;font-family:Georgia,serif;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <div style="max-width:480px;margin:40px auto;background:#3D1428;border-radius:4px;overflow:hidden;">
    <div style="padding:36px 36px 0;">
      <p style="margin:0 0 6px;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#C4A373;">Dhyom</p>
      <div style="width:28px;height:1px;background:rgba(196,163,115,0.35);margin-bottom:28px;"></div>
    </div>
    <div style="padding:0 36px 36px;">
      ${body}
      <div style="border-top:1px solid rgba(196,163,115,0.18);padding-top:20px;margin-top:32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:0;">
          <tr>
            <td>
              <p style="margin:0 0 3px;font-size:13px;letter-spacing:2px;color:#C4A373;">— SUJAY</p>
              <p style="margin:0;font-size:10px;letter-spacing:2px;color:rgba(196,163,115,0.50);text-transform:uppercase;">Founder, Dhyom</p>
            </td>
            <td style="text-align:right;vertical-align:bottom;">
              <a href="${unsub}" style="font-size:10px;color:rgba(245,237,224,0.22);text-decoration:none;letter-spacing:0.5px;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Email templates ───────────────────────────────────────────────────────────

function buildEmail1(name: string, unsub: string): string {
  return emailWrapper(
    "no spiritual awakening. sorry.",
    `${p(`Hi ${name},`)}
    ${p("Something brought you to Dhyom. A scent, a feeling, or maybe just curiosity. I don’t know which.")}
    ${p("But I want to tell you why it exists. And I’ll warn you now — it’s not the story people expect.")}
    ${p("No spiritual awakening. No secret family recipe passed down for generations.")}
    ${p("I started by looking at this whole thing the way you’d look at a problem. Cold. Analytical.")}
    ${p("And what I found honestly bothered me. Enough that I quit what I was doing and built a brand around fixing it.")}
    ${p("I’ll tell you what it was tomorrow.")}
    ${p("For now — one small thing. Next time you light something in your home, ask yourself: did you choose it? Or did you just buy whatever was there?")}
    ${p("There’s a bigger difference than you’d think.")}
    ${p("More tomorrow.")}`,
    unsub
  );
}

function buildEmail2(name: string, unsub: string): string {
  return emailWrapper(
    "there was nothing in between. nothing.",
    `${p(`Hi ${name},`)}
    ${p("I was standing in a shop, holding two boxes of incense.")}
    ${p("One was ₹40. The other was almost ₹4,000.")}
    ${p("And I remember thinking — this is insane. Because they were both, in their own way, wrong.")}
    ${p("The cheap one was exactly what you’d expect. Forgettable. Made to be cheap and nothing else.")}
    ${p("The expensive one looked premium. Fancy box. Big price. But underneath? Generic. The same stuff, dressed up, marked up.")}
    ${p("There was nothing in between. Nothing for someone who actually cares how their home feels. Who picks the art on their walls, the sheets on their bed — and then lights a ₹40 stick, because that was the only option.")}
    ${p("That gap. That empty space in the middle. That’s the whole reason Dhyom exists.")}
    ${p("But finding the problem was easy.")}
    ${p("Building something good enough to fill it? That’s where I made a mistake that cost me real money. And taught me the one thing that changed everything.")}
    ${p("Tomorrow.")}`,
    unsub
  );
}

function buildEmail3(name: string, unsub: string): string {
  return emailWrapper(
    "the ₹8 mistake that fixed everything.",
    `${p(`Hi ${name},`)}
    ${p("So here’s the mistake.")}
    ${p("Early on, I tried to save money on materials. Cheaper charcoal. Lower-grade wax. On the spreadsheet, the margins looked great. I was proud of myself, honestly.")}
    ${p("Then I burned a test batch. In my own home.")}
    ${p("It left a black soot mark on my wall. The scent was flat — it smelled like effort, not calm. I sat there looking at that stain and felt a bit sick.")}
    ${p("And that was the moment it clicked.")}
    ${p("The reason those “premium” products in the shop felt hollow wasn’t the price. It’s that nobody had actually matched real quality to the promise. They were selling the idea of premium. Not the real thing.")}
    ${p("So I threw the cheap version out. Started again. Charcoal-free. Clean-burning. Fragrances that actually hold in a room instead of vanishing in ten minutes.")}
    ${p("It cost more. It was slower. My margins got worse before they got better.")}
    ${p("But it’s the only version I’d put my name on. And it’s the standard behind everything at Dhyom now.")}
    ${p("Tomorrow — something I genuinely didn’t see coming. The real reason people come back.")}`,
    unsub
  );
}

function buildEmail4(name: string, unsub: string): string {
  return emailWrapper(
    "it wasn’t for themselves.",
    `${p(`Hi ${name},`)}
    ${p("I thought people would buy Dhyom for themselves.")}
    ${p("And they do — at first. But then something happened I didn’t plan for.")}
    ${p("The messages started coming in. And most of them said some version of the same thing:")}
    ${p("“My friend came over, smelled my candle, and demanded to know where it was from.”")}
    ${p("“I gifted it to my mother. Now she won’t stop asking for more.”")}
    ${p("Turns out the biggest reason people come back isn’t for themselves at all. It’s because they gave it to someone. Lit it when a guest was over. And that person needed to know what it was.")}
    ${p("That’s when I finally understood what Dhyom actually is.")}
    ${p("It was never really about fragrance. It’s about a home that feels cared for. And that feeling, it turns out, is contagious. You can hand it to someone. A calm evening, wrapped up and given away.")}
    ${p("I think that’s about the most any object can hope to be.")}
    ${p("Tomorrow, last one. I’ll tell you where I’d start, if you were asking me directly. No pressure — just honest.")}`,
    unsub
  );
}

function buildEmail5Lead(name: string, unsub: string): string {
  return emailWrapper(
    "honestly, just one thing.",
    `${p(`Hi ${name},`)}
    ${p("Okay. Last email in this little story.")}
    ${p("Over the past few days I’ve told you why Dhyom exists — the ₹40 vs ₹4,000 gap, the soot on my wall, the thing I got wrong about why people buy.")}
    ${p("So if you’ve been even a little curious, here’s what I’d honestly tell you to do.")}
    ${p("Don’t overthink it. Start with one. The fragrance that matched your personality, or a Sandalwood or Lavender — that’s where most people begin.")}
    ${p("Light it in the corner of your home you walk past the most. Give it a week.")}
    ${p("Then see if you notice the difference between something chosen and something just… bought.")}
    ${p("That’s the whole thing. No countdown, no pressure. Just the fragrance, your evenings, and a week.")}
    ${p("Whenever you’re ready — I’d love to have Dhyom in your home.")}
    <p style="margin:0 0 4px;">
      <a href="https://dhyom.in/shop" style="display:inline-block;background:#C4A373;color:#1A0A14;font-family:Georgia,serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:13px 30px;border-radius:3px;">Explore the Fragrances</a>
    </p>`,
    unsub
  );
}

function buildEmail5Buyer(name: string, unsub: string): string {
  return emailWrapper(
    "so instead, a small suggestion.",
    `${p(`Hi ${name},`)}
    ${p("Last email in this story — but yours took a turn I love.")}
    ${p("Somewhere in the last few days, you actually brought Dhyom into your home. Thank you. Genuinely. That means more than I can fit in an email.")}
    ${p("So instead of telling you where to start, let me tell you one thing that makes it better.")}
    ${p("Light it at the same time each day. Same corner. Let it stop being a “nice candle” and quietly become a ritual — the small moment that tells your whole house the day has shifted.")}
    ${p("That’s when it changes from a thing you own into part of how your home feels.")}
    ${p("And if it ever moves you to share it — a candle left burning for a guest, a gift to someone whose evenings could be softer — that’s exactly how Dhyom was meant to travel.")}
    <p style="margin:0 0 12px;font-style:italic;font-size:14px;line-height:1.8;color:rgba(245,237,224,0.50);font-weight:300;">With gratitude,</p>
    <p style="margin:0 0 4px;">
      <a href="https://dhyom.in" style="display:inline-block;background:#C4A373;color:#1A0A14;font-family:Georgia,serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:13px 30px;border-radius:3px;">Discover the Ritual</a>
    </p>`,
    unsub
  );
}

// ── Email dispatch ────────────────────────────────────────────────────────────

type EmailMeta = { subject: string; html: string; text: string };

function getEmail(day: number, tag: string, name: string, unsub: string): EmailMeta {
  const display = name || "there";
  switch (day) {
    case 1:
      return {
        subject: "why I started Dhyom (not what you’d think)",
        html: buildEmail1(display, unsub),
        text: `Hi ${display},\n\nSomething brought you to Dhyom. A scent, a feeling, or maybe just curiosity.\n\nI want to tell you why it exists — it's not the story people expect. No spiritual awakening. No secret family recipe.\n\nI'll tell you what I found tomorrow.\n\nMore tomorrow.\n\nSUJAY\nFounder, Dhyom\n\nUnsubscribe: ${unsub}`,
      };
    case 2:
      return {
        subject: "the ₹40 vs ₹4,000 problem",
        html: buildEmail2(display, unsub),
        text: `Hi ${display},\n\nI was standing in a shop, holding two boxes of incense. One was ₹40. The other was almost ₹4,000.\n\nThere was nothing in between. Nothing for someone who actually cares how their home feels.\n\nThat gap is the whole reason Dhyom exists. Tomorrow, I'll tell you the mistake that taught me the one thing that changed everything.\n\nSUJAY\nFounder, Dhyom\n\nUnsubscribe: ${unsub}`,
      };
    case 3:
      return {
        subject: "I ruined my own wall",
        html: buildEmail3(display, unsub),
        text: `Hi ${display},\n\nEarly on I tried to save money on materials. Then I burned a test batch in my own home. It left a black soot mark on my wall.\n\nThat was the moment I threw everything out and started again. Charcoal-free. Clean-burning. The standard behind everything at Dhyom now.\n\nSUJAY\nFounder, Dhyom\n\nUnsubscribe: ${unsub}`,
      };
    case 4:
      return {
        subject: "I was wrong about why people buy this",
        html: buildEmail4(display, unsub),
        text: `Hi ${display},\n\nI thought people would buy Dhyom for themselves. But the messages that came in all said some version of the same thing — they gave it to someone.\n\nDhyom was never really about fragrance. It's about a home that feels cared for. And that feeling is contagious.\n\nTomorrow — last one.\n\nSUJAY\nFounder, Dhyom\n\nUnsubscribe: ${unsub}`,
      };
    case 5:
      if (tag === "buyer") {
        return {
          subject: "you already did the thing",
          html: buildEmail5Buyer(display, unsub),
          text: `Hi ${display},\n\nLast email — but yours took a turn I love. You actually brought Dhyom into your home. Thank you.\n\nLight it at the same time each day. Same corner. Let it become a ritual.\n\nWith gratitude,\n\nSUJAY\nFounder, Dhyom\nhttps://dhyom.in\n\nUnsubscribe: ${unsub}`,
        };
      }
      return {
        subject: "where I’d start (if you asked me)",
        html: buildEmail5Lead(display, unsub),
        text: `Hi ${display},\n\nLast email. If you've been even a little curious — don't overthink it. Start with one. Light it in the corner of your home you walk past most. Give it a week.\n\nWhenever you're ready — I'd love to have Dhyom in your home.\nhttps://dhyom.in/shop\n\nSUJAY\nFounder, Dhyom\n\nUnsubscribe: ${unsub}`,
      };
    default:
      throw new Error(`Unknown day: ${day}`);
  }
}

// ── Cron handler ──────────────────────────────────────────────────────────────

type Contact = {
  id: string;
  email: string;
  name: string | null;
  tag: string;
  sequence_day_sent: number;
};

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = adminClient();
  const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

  const { data: contacts, error: fetchErr } = await sb
    .from("contacts")
    .select("id, email, name, tag, sequence_day_sent")
    .in("tag", ["reel_lead", "newsletter", "checkout_lead"])
    .eq("unsubscribed", false)
    .lt("sequence_day_sent", 5)
    .or(`last_email_sent_at.is.null,last_email_sent_at.lte.${twentyHoursAgo}`);

  if (fetchErr) {
    console.error("[soap-opera] fetch error:", fetchErr);
    return NextResponse.json({ error: "DB fetch failed" }, { status: 500 });
  }

  if (!contacts || contacts.length === 0) {
    console.log("[soap-opera] no contacts due");
    return NextResponse.json({ sent: 0, errors: [] });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[soap-opera] RESEND_API_KEY not set");
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const fromAddr = `Dhyom <${process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"}>`;
  let sent = 0;
  const errors: string[] = [];

  for (const contact of contacts as Contact[]) {
    const nextDay = contact.sequence_day_sent + 1;
    const unsub = unsubscribeUrl(contact.email);

    try {
      const { subject, html, text } = getEmail(nextDay, contact.tag, contact.name ?? "", unsub);

      const { error: sendErr } = await resend.emails.send({
        from: fromAddr,
        to: contact.email,
        subject,
        html,
        text,
        headers: {
          "List-Unsubscribe": `<${unsub}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      if (sendErr) {
        console.error(`[soap-opera] Resend error for ${contact.email}:`, JSON.stringify(sendErr));
        errors.push(`${contact.email}: ${JSON.stringify(sendErr)}`);
        continue;
      }

      const { error: updateErr } = await sb
        .from("contacts")
        .update({
          sequence_day_sent: nextDay,
          last_email_sent_at: new Date().toISOString(),
        })
        .eq("id", contact.id);

      if (updateErr) {
        console.error(`[soap-opera] DB update error for ${contact.email}:`, updateErr);
        errors.push(`${contact.email}: DB update failed after send`);
        continue;
      }

      console.log(`[soap-opera] day ${nextDay} → ${contact.email}`);
      sent++;
    } catch (err) {
      console.error(`[soap-opera] exception for ${contact.email}:`, err);
      errors.push(`${contact.email}: ${String(err)}`);
    }
  }

  return NextResponse.json({ sent, errors });
}
