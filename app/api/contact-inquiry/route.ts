import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function sendWhatsApp(name: string, email: string, message: string) {
  const apiKey = process.env.CALLMEBOT_API_KEY;
  const phone  = "918986995277";
  if (!apiKey) return; // skip silently if key not configured

  const text = encodeURIComponent(
    `📩 New Dhyom Inquiry\nName: ${name}\nEmail: ${email}\nMessage: ${message}`
  );
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&apikey=${apiKey}&text=${text}`;
  await fetch(url).catch(() => {}); // fire-and-forget, never block the response
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, message, hp } = await req.json();

    // Bot trap — filled honeypot means automated submission
    if (hp) return NextResponse.json({ ok: true });

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (email.trim().length > 254) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (name.trim().length > 100) {
      return NextResponse.json({ error: "Name is too long." }, { status: 400 });
    }
    if (message.trim().length > 2000) {
      return NextResponse.json({ error: "Message must be under 2000 characters." }, { status: 400 });
    }

    const sb = adminClient();
    const { error } = await sb.from("contacts").insert({
      name:    name.trim(),
      email:   email.trim(),
      message: message.trim(),
      tag:     "inquiry",
    });

    if (error) {
      console.error("[contact-inquiry] Supabase error:", error);
      return NextResponse.json({ error: "Could not save your message. Please try again." }, { status: 500 });
    }

    // Notify via WhatsApp — non-blocking
    void sendWhatsApp(name.trim(), email.trim(), message.trim());

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact-inquiry]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
