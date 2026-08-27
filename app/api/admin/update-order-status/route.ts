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
  const { id, order_status } = await req.json() as { id?: string; order_status?: string };

  if (!id || !order_status) {
    return NextResponse.json({ error: "id and order_status are required" }, { status: 400 });
  }

  const VALID = ["pending", "confirmed", "shipped", "delivered", "cancelled", "processing", "packed"];
  if (!VALID.includes(order_status)) {
    return NextResponse.json({ error: "Invalid order_status" }, { status: 400 });
  }

  const { error } = await adminClient()
    .from("orders")
    .update({ order_status })
    .eq("id", id);

  if (error) {
    console.error("[update-order-status] DB error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
