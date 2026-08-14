import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const CATEGORIES = ["candle", "idol", "bracelet", "gift", "pooja-essentials"];
const ALLOWED_FIELDS = ["bump_product_id", "oto_product_id", "downsell_product_id"];

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/* GET — fetch all funnel_settings rows, auto-seeding if empty */
export async function GET() {
  const sb = adminSupabase();

  const first = await sb.from("funnel_settings").select("*");
  if (first.error) return NextResponse.json({ error: first.error.message }, { status: 500 });
  let data = first.data;

  if (!data || data.length === 0) {
    const { error: insErr } = await sb
      .from("funnel_settings")
      .insert(CATEGORIES.map(c => ({ category: c })));
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    const refetch = await sb.from("funnel_settings").select("*");
    if (refetch.error) return NextResponse.json({ error: refetch.error.message }, { status: 500 });
    data = refetch.data;
  }

  return NextResponse.json({ rows: data });
}

/* PATCH — update a single field on one row */
export async function PATCH(req: NextRequest) {
  const body = await req.json() as { id: string; field: string; value: string | null };
  const { id, field, value } = body;

  if (!id || !ALLOWED_FIELDS.includes(field)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sb = adminSupabase();
  const { error } = await sb
    .from("funnel_settings")
    .update({ [field]: value ?? null })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
