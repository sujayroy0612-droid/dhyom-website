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

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  if (!token) return false;
  const { data } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ).auth.getUser(token);
  return !!data.user;
}

// GET /api/admin/hampers?resource=tiers|boxes|slots
export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resource = new URL(req.url).searchParams.get("resource") ?? "tiers";
  const sb = adminClient();

  if (resource === "tiers") {
    const { data, error } = await sb.from("hamper_tiers").select("*").order("sort_order");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }
  if (resource === "boxes") {
    const { data, error } = await sb.from("hamper_boxes").select("*").order("name");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }
  if (resource === "slots") {
    const { data, error } = await sb.from("hamper_slots").select("*").order("tier_id").order("sort_order");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }
  return NextResponse.json({ error: "Unknown resource" }, { status: 400 });
}

// POST /api/admin/hampers — create
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resource, payload } = await req.json() as { resource: string; payload: Record<string, unknown> };
  const sb = adminClient();

  const table = resource === "tiers" ? "hamper_tiers" : resource === "boxes" ? "hamper_boxes" : "hamper_slots";
  const { data, error } = await sb.from(table).insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

// PATCH /api/admin/hampers — update
export async function PATCH(req: NextRequest) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resource, id, payload } = await req.json() as { resource: string; id: string; payload: Record<string, unknown> };
  const sb = adminClient();

  const table = resource === "tiers" ? "hamper_tiers" : resource === "boxes" ? "hamper_boxes" : "hamper_slots";
  const { data, error } = await sb.from(table).update(payload).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

// DELETE /api/admin/hampers?resource=tiers|boxes|slots&id=uuid
export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url      = new URL(req.url);
  const resource = url.searchParams.get("resource") ?? "tiers";
  const id       = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const sb    = adminClient();
  const table = resource === "tiers" ? "hamper_tiers" : resource === "boxes" ? "hamper_boxes" : "hamper_slots";
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
