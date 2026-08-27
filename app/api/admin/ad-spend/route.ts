import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  const { data, error } = await adminClient()
    .from("ad_spend_entries")
    .select("*")
    .order("month", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { month: string; platform: string; amount: number; notes?: string };
  if (!body.month || !body.platform || body.amount == null) {
    return NextResponse.json({ error: "month, platform, amount required" }, { status: 400 });
  }
  const { data, error } = await adminClient()
    .from("ad_spend_entries")
    .insert({ month: body.month, platform: body.platform, amount: Number(body.amount), notes: body.notes ?? null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { id: string; month?: string; platform?: string; amount?: number; notes?: string };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const updates: Record<string, unknown> = {};
  if (body.month    != null) updates.month    = body.month;
  if (body.platform != null) updates.platform = body.platform;
  if (body.amount   != null) updates.amount   = Number(body.amount);
  if ("notes" in body)       updates.notes    = body.notes ?? null;
  const { error } = await adminClient().from("ad_spend_entries").update(updates).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await adminClient().from("ad_spend_entries").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
