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
  const { id } = await req.json() as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const sb = adminClient();

  // Unlink contacts first (preserve email/tag, just remove the campaign reference)
  const { error: unlinkErr } = await sb
    .from("contacts")
    .update({ campaign_id: null })
    .eq("campaign_id", id);

  if (unlinkErr) {
    console.error("[campaign-delete] unlink contacts error:", unlinkErr.message);
    return NextResponse.json({ error: unlinkErr.message }, { status: 500 });
  }

  const { error } = await sb.from("campaigns").delete().eq("id", id);

  if (error) {
    console.error("[campaign-delete] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[campaign-delete] deleted ${id}`);
  return NextResponse.json({ ok: true });
}
