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

const EVENT_TYPES = [
  "product_view",
  "add_to_cart",
  "checkout_started",
  "purchase_completed",
] as const;

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "30", 10), 1), 365);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const sb = adminClient();

  const counts = await Promise.all(
    EVENT_TYPES.map(async (et) => {
      const { data } = await sb
        .from("funnel_events")
        .select("session_id")
        .eq("event_type", et)
        .gte("created_at", since.toISOString());
      const distinct = new Set((data ?? []).map((r: { session_id: string }) => r.session_id)).size;
      return { event_type: et, count: distinct };
    })
  );

  return NextResponse.json({ funnel: counts, days });
}
