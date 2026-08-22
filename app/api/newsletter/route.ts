import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { emailWrapper } from "@/lib/email/soap-opera";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

type Settings = {
  subject:      string;
  body_text:    string | null;
  pdf_url:      string | null;
  pdf_base64:   string | null;
  pdf_filename: string | null;
};

async function fetchSettings(): Promise<Settings> {
  try {
    const { data } = await adminClient()
      .from("newsletter_settings")
      .select("subject, body_text, pdf_url, pdf_base64, pdf_filename")
      .eq("id", 1)
      .single();
    return {
      subject:      data?.subject      ?? "Welcome to Dhyom",
      body_text:    data?.body_text    ?? null,
      pdf_url:      data?.pdf_url      ?? null,
      pdf_base64:   data?.pdf_base64   ?? null,
      pdf_filename: data?.pdf_filename ?? null,
    };
  } catch {
    return { subject: "Welcome to Dhyom", body_text: null, pdf_url: null, pdf_base64: null, pdf_filename: null };
  }
}

// Converts plain text body (operator-written) → on-brand HTML paragraphs.
// Blank line = new <p>. Single newline within a paragraph → <br/>.
// {{name}} replaced before conversion.
function bodyToHtml(text: string, name: string): string {
  const display = name || "there";
  return text
    .replace(/\{\{name\}\}/g, display)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const inner = p.replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 18px;font-size:15px;line-height:1.85;color:rgba(245,237,224,0.72);font-weight:300;">${inner}</p>`;
    })
    .join("");
}

const FALLBACK_BODY_TEXT = `Hi {{name}},

Welcome to the Dhyom inner circle. I'm so glad you're here.

As promised, your Ritual Guide is attached to this email — a quiet introduction to building a sacred space at home. Five simple rituals for the ordinary hours of your day.

Take a moment with it when the day slows down. Start with just one.

Over the coming days, I'll share a little of why Dhyom exists — the story isn't what most people expect. Keep an eye on your inbox.

— Sujay
Founder, Dhyom`;


export async function POST(req: NextRequest) {
  try {
    const { email, name, hp } = await req.json();

    // Bot trap — filled honeypot means automated submission
    if (hp) return NextResponse.json({ ok: true });

    const trimmed = (email ?? "").trim();

    if (!trimmed || trimmed.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // Save to contacts
    try {
      const { error: dbErr } = await adminClient()
        .from("contacts")
        .insert({ email: trimmed, tag: "newsletter" });
      if (dbErr) console.error("[newsletter] contacts INSERT error:", dbErr);
    } catch (ex) {
      console.error("[newsletter] contacts exception:", ex);
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[newsletter] RESEND_API_KEY not set — skipping email");
      return NextResponse.json({ ok: true });
    }

    // Fetch settings
    const settings = await fetchSettings();
    const fromAddr  = process.env.RESEND_FROM_EMAIL ?? "hello@dhyom.in";
    const firstName = (name ?? "").trim().split(" ")[0] || "";
    const unsubUrl  = `mailto:${fromAddr}?subject=unsubscribe`;

    // Build body from stored plain text (or fallback)
    const rawBody = settings.body_text?.trim() || FALLBACK_BODY_TEXT;
    const bodyHtml = bodyToHtml(rawBody, firstName);
    const previewText = `Welcome to Dhyom, ${firstName || "there"}.`;

    const html = emailWrapper(previewText, bodyHtml, unsubUrl);
    const text = rawBody.replace(/\{\{name\}\}/g, firstName || "there");

    // Build attachments using stored base64 (no external fetch needed)
    type Attachment = { filename: string; content: string };
    const attachments: Attachment[] = [];
    if (settings.pdf_base64) {
      attachments.push({
        filename: settings.pdf_filename ?? "dhyom-guide.pdf",
        content:  settings.pdf_base64,
      });
    }

    const { error: resendErr } = await new Resend(apiKey).emails.send({
      from:    `Dhyom <${fromAddr}>`,
      to:      trimmed,
      replyTo: "dhyomecom@gmail.com",
      subject: settings.subject,
      html,
      text,
      ...(attachments.length > 0 && { attachments }),
      headers: {
        "List-Unsubscribe": `<mailto:${fromAddr}?subject=unsubscribe>`,
      },
    });

    if (resendErr) {
      console.error("[newsletter] Resend error:", JSON.stringify(resendErr));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[newsletter]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
