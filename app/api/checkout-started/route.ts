import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { email, phone } = await req.json() as { email?: string; phone?: string };

    const cleanEmail = email?.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }
    const cleanPhone = phone?.trim() || null;

    const sb = adminClient();

    // Check if a checkout_started row already exists for this email
    const { data: existing } = await sb
      .from("contacts")
      .select("id")
      .eq("email", cleanEmail)
      .eq("tag", "checkout_started")
      .maybeSingle();

    if (existing) {
      // Update phone in case they corrected it; don't create a duplicate
      await sb.from("contacts").update({ phone: cleanPhone }).eq("id", existing.id);
    } else {
      const { error } = await sb.from("contacts").insert({
        email: cleanEmail,
        phone: cleanPhone,
        tag: "checkout_started",
      });
      if (error) {
        console.error("[checkout-started] insert error:", error);
        return NextResponse.json({ error: "Could not save contact." }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[checkout-started]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
