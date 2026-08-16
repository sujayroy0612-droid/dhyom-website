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

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tag        = searchParams.get("tag")         ?? "";
  const campaignId = searchParams.get("campaign_id") ?? "";
  const search     = searchParams.get("search")      ?? "";

  const sb = adminClient();

  // Stats counts + broadcast_recipient_stats in parallel
  const [
    total, buyer, reelLead, newsletter, checkoutLead, inquiry, unsubscribed,
    broadcastStats,
  ] = await Promise.all([
    sb.from("contacts").select("*", { count: "exact", head: true }),
    sb.from("contacts").select("*", { count: "exact", head: true }).eq("tag", "buyer"),
    sb.from("contacts").select("*", { count: "exact", head: true }).eq("tag", "reel_lead"),
    sb.from("contacts").select("*", { count: "exact", head: true }).eq("tag", "newsletter"),
    sb.from("contacts").select("*", { count: "exact", head: true }).eq("tag", "checkout_lead"),
    sb.from("contacts").select("*", { count: "exact", head: true }).eq("tag", "inquiry"),
    sb.from("contacts").select("*", { count: "exact", head: true }).eq("unsubscribed", true),
    sb.from("broadcast_recipient_stats").select("contact_email, seinfeld_count, seinfeld_last_sent"),
  ]);

  const stats = {
    total:         total.count         ?? 0,
    buyer:         buyer.count         ?? 0,
    reel_lead:     reelLead.count      ?? 0,
    newsletter:    newsletter.count    ?? 0,
    checkout_lead: checkoutLead.count  ?? 0,
    inquiry:       inquiry.count       ?? 0,
    unsubscribed:  unsubscribed.count  ?? 0,
  };

  // Build per-email Seinfeld stats map from the aggregate view
  type BroadcastStatRow = { contact_email: string; seinfeld_count: number; seinfeld_last_sent: string | null };
  const seinfeldMap = new Map<string, { count: number; last_sent: string | null }>();
  for (const row of (broadcastStats.data ?? []) as BroadcastStatRow[]) {
    seinfeldMap.set(row.contact_email, { count: row.seinfeld_count, last_sent: row.seinfeld_last_sent });
  }

  // Leads query
  let query = sb
    .from("contacts")
    .select("id, email, name, tag, captured_at, sequence_day_sent, last_email_sent_at, unsubscribed, campaign_id, campaigns(title)", { count: "exact" })
    .order("captured_at", { ascending: false })
    .limit(500);

  if (tag)        query = query.eq("tag", tag);
  if (campaignId) query = query.eq("campaign_id", campaignId);
  if (search)     query = query.ilike("email", `%${search}%`);

  const { data: leads, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attach seinfeld_count + seinfeld_last_sent to each lead
  const enrichedLeads = (leads ?? []).map(l => {
    const sf = seinfeldMap.get(l.email);
    return {
      ...l,
      seinfeld_count:     sf?.count     ?? 0,
      seinfeld_last_sent: sf?.last_sent ?? null,
    };
  });

  return NextResponse.json({ leads: enrichedLeads, total: count, stats });
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await adminClient().from("contacts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
