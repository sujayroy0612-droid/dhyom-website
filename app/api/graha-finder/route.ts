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

    const trimmedEmail = (email ?? "").trim().toLowerCase();
    if (
      !trimmedEmail ||
      trimmedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    ) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    const dayNum = Number(day);
    if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31) {
      return NextResponse.json({ error: "Valid day required." }, { status: 400 });
    }

    const { error } = await adminClient().from("contacts").insert({
      email: trimmedEmail,
      tag: "graha_finder",
      message: `Day ${dayNum} → Mulank ${mulank} → ${graha} — ${stone}`,
    });

    if (error) console.error("[graha-finder] insert error:", error);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[graha-finder]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
