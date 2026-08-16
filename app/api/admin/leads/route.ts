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

  // Stats via parallel count queries
  const [total, buyer, reelLead, newsletter, checkoutLead, inquiry, unsubscribed] =
    await Promise.all([
      sb.from("contacts").select("*", { count: "exact", head: true }),
      sb.from("contacts").select("*", { count: "exact", head: true }).eq("tag", "buyer"),
      sb.from("contacts").select("*", { count: "exact", head: true }).eq("tag", "reel_lead"),
      sb.from("contacts").select("*", { count: "exact", head: true }).eq("tag", "newsletter"),
      sb.from("contacts").select("*", { count: "exact", head: true }).eq("tag", "checkout_lead"),
      sb.from("contacts").select("*", { count: "exact", head: true }).eq("tag", "inquiry"),
      sb.from("contacts").select("*", { count: "exact", head: true }).eq("unsubscribed", true),
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

  return NextResponse.json({ leads, total: count, stats });
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
