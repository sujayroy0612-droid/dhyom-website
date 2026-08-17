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

type Settings = { subject: string; body_text: string | null; pdf_url: string | null };

async function fetchSettings(): Promise<Settings> {
  try {
    const { data } = await adminClient()
      .from("newsletter_settings")
      .select("subject, body_text, pdf_url")
      .eq("id", 1)
      .single();
    return {
      subject:   data?.subject   ?? "Welcome to Dhyom",
      body_text: data?.body_text ?? null,
      pdf_url:   data?.pdf_url   ?? null,
    };
  } catch {
    return { subject: "Welcome to Dhyom", body_text: null, pdf_url: null };
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

async function fetchPdfAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return Buffer.from(buf).toString("base64");
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();
    const trimmed = (email ?? "").trim();

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
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

    // Build attachments if PDF configured
    type Attachment = { filename: string; content: string };
    const attachments: Attachment[] = [];
    if (settings.pdf_url) {
      const b64 = await fetchPdfAsBase64(settings.pdf_url);
      if (b64) {
        const filename =
          settings.pdf_url.split("/").pop()?.replace(/[?#].*$/, "") ?? "dhyom-guide.pdf";
        attachments.push({ filename, content: b64 });
      }
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
