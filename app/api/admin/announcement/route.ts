import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  if (!token) return false;
  const { data } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ).auth.getUser(token);
  return !!data.user;
}

// ── GET — settings + all messages ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = adminClient();
  const [settingsRes, messagesRes] = await Promise.all([
    sb.from("announcement_bar").select("id, enabled, speed").single(),
    sb.from("announcement_messages")
      .select("id, text, link_url, sort_order, active, created_at")
      .order("sort_order"),
  ]);

  if (settingsRes.error) {
    return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    settings: settingsRes.data,
    messages: messagesRes.data ?? [],
  });
}

// ── PATCH — update settings OR update a single message ───────────────────────

export async function PATCH(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const sb = adminClient();

  // Update settings (enabled / speed)
  if (body.type === "settings") {
    const { enabled, speed } = body as { type: string; enabled: boolean; speed: number };
    const { error } = await sb
      .from("announcement_bar")
      .update({ enabled, speed, updated_at: new Date().toISOString() })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Update a message
  if (body.type === "message") {
    const { id, text, link_url, active, sort_order } = body as {
      type: string; id: string; text: string;
      link_url: string | null; active: boolean; sort_order: number;
    };
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await sb
      .from("announcement_messages")
      .update({ text, link_url: link_url || null, active, sort_order })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}

// ── POST — create a new message ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text, link_url } = await req.json() as { text: string; link_url?: string };
  if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });

  const sb = adminClient();

  // Get current max sort_order
  const { data: maxRow } = await sb
    .from("announcement_messages")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sort_order = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await sb
    .from("announcement_messages")
    .insert({ text: text.trim(), link_url: link_url?.trim() || null, sort_order, active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data });
}

// ── DELETE — remove a message ─────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await adminClient()
    .from("announcement_messages")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
