export const dynamic = "force-dynamic";

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
    const { email, day, mulank, graha, stone, hp } = await req.json();

    if (hp) return NextResponse.json({ ok: true });

    const dayNum = Number(day);
    if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31) {
      return NextResponse.json({ error: "Valid day required." }, { status: 400 });
    }

    // Email is optional — skip DB insert if not provided or invalid
    const trimmedEmail = (email ?? "").trim().toLowerCase();
    const hasEmail =
      trimmedEmail.length > 0 &&
      trimmedEmail.length <= 254 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    if (hasEmail) {
      const { error } = await adminClient().from("contacts").insert({
        email: trimmedEmail,
        tag: "graha_finder",
        message: `Day ${dayNum} → Mulank ${mulank} → ${graha} — ${stone}`,
      });
      if (error) console.error("[graha-finder] insert error:", error);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[graha-finder]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
