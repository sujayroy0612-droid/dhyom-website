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

  const sb = adminClient();

  const [
    total,
    buyer,
    reelLead,
    newsletter,
    checkoutLead,
    inquiry,
    unsubscribed,
    midSequence,
    activeCampaigns,
    campaignLeads,
  ] = await Promise.all([
    sb.from("contacts").select("*", { count: "exact", head: true }),
    sb.from("contacts").select("*", { count: "exact", head: true }).eq("tag", "buyer"),
    sb.from("contacts").select("*", { count: "exact", head: true }).eq("tag", "reel_lead"),
    sb.from("contacts").select("*", { count: "exact", head: true }).eq("tag", "newsletter"),
    sb.from("contacts").select("*", { count: "exact", head: true }).eq("tag", "checkout_lead"),
    sb.from("contacts").select("*", { count: "exact", head: true }).eq("tag", "inquiry"),
    sb.from("contacts").select("*", { count: "exact", head: true }).eq("unsubscribed", true),
    // mid-sequence: sent at least day 1 but not finished, not unsubscribed
    sb.from("contacts").select("*", { count: "exact", head: true })
      .gte("sequence_day_sent", 1)
      .lte("sequence_day_sent", 4)
      .eq("unsubscribed", false),
    sb.from("campaigns").select("*", { count: "exact", head: true }).eq("active", true),
    // leads grouped by campaign (join)
    sb.from("contacts")
      .select("campaign_id, campaigns(id, title)")
      .not("campaign_id", "is", null),
  ]);

  // Build campaign lead counts
  type RawRow = { campaign_id: string | null; campaigns: unknown };
  const campaignMap = new Map<string, { title: string; count: number }>();
  for (const raw of (campaignLeads.data ?? []) as RawRow[]) {
    if (!raw.campaign_id) continue;
    const camp = raw.campaigns as { id: string; title: string } | { id: string; title: string }[] | null;
    if (!camp) continue;
    const title = Array.isArray(camp) ? camp[0]?.title : camp.title;
    if (!title) continue;
    const entry = campaignMap.get(raw.campaign_id);
    if (entry) { entry.count++; }
    else { campaignMap.set(raw.campaign_id, { title, count: 1 }); }
  }
  const campaignBreakdown = Array.from(campaignMap.entries())
    .map(([id, { title, count }]) => ({ id, title, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    stats: {
      total:          total.count         ?? 0,
      buyer:          buyer.count         ?? 0,
      reel_lead:      reelLead.count      ?? 0,
      newsletter:     newsletter.count    ?? 0,
      checkout_lead:  checkoutLead.count  ?? 0,
      inquiry:        inquiry.count       ?? 0,
      unsubscribed:   unsubscribed.count  ?? 0,
      mid_sequence:   midSequence.count   ?? 0,
      active_campaigns: activeCampaigns.count ?? 0,
    },
    campaign_breakdown: campaignBreakdown,
  });
}
