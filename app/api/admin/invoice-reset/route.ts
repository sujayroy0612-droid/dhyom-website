import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// One-shot invoice reset endpoint — delete after use.
// GET  → list all invoices + introspect counter (read-only)
// POST → { action: "reset" } — delete all invoices + reset counter to 0

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function auth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const token = (req.headers.get("authorization") ?? "").replace(/^bearer\s+/i, "").trim();
  return token === secret;
}

// GET — list all invoices + inspect counter (read-only, no changes)
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = adminClient();

  // Online invoices
  const { data: online, error: onlineErr } = await sb
    .from("invoices")
    .select("id, invoice_number, order_id, order_number, taxable_value, gst_amount, total_amount, created_at")
    .order("created_at", { ascending: true });

  // Offline invoices (offline_sales_orders with invoice_number set)
  const { data: offline, error: offlineErr } = await sb
    .from("offline_sales_orders")
    .select("id, invoice_number, invoice_date, customer_name, channel, amount_paid, created_at")
    .not("invoice_number", "is", null)
    .order("created_at", { ascending: true });

  // invoice_counter table (most likely counter mechanism)
  let counterTable: unknown = null;
  try {
    const { data } = await sb.from("invoice_counter").select("*").limit(5);
    counterTable = data;
  } catch {
    counterTable = "table not found";
  }

  if (onlineErr)  return NextResponse.json({ error: onlineErr.message },  { status: 500 });
  if (offlineErr) return NextResponse.json({ error: offlineErr.message }, { status: 500 });

  return NextResponse.json({
    online_invoices:  online ?? [],
    offline_invoices: offline ?? [],
    total_count:      (online?.length ?? 0) + (offline?.length ?? 0),
    invoice_counter_table: counterTable,
    note: "Confirm this list, then POST { action: 'reset' } to delete all and reset counter.",
  });
}

// POST — delete all invoices + reset counter
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (body.action !== "reset") {
    return NextResponse.json({ error: "Send { action: 'reset' } to confirm." }, { status: 400 });
  }

  const sb = adminClient();
  const results: Record<string, unknown> = {};

  // 1. Delete all online invoices (hard delete)
  const { data: deleted, error: delErr } = await sb
    .from("invoices")
    .delete()
    .gte("created_at", "2000-01-01")
    .select("id, invoice_number");

  results.online_invoices_deleted = delErr
    ? `ERROR: ${delErr.message}`
    : (deleted?.length ?? 0);
  results.deleted_numbers = deleted?.map(r => r.invoice_number) ?? [];

  // 2. Clear offline invoice stamps
  const { data: clearedOff, error: offErr } = await sb
    .from("offline_sales_orders")
    .update({ invoice_number: null, invoice_date: null })
    .not("invoice_number", "is", null)
    .select("id");

  results.offline_invoices_cleared = offErr
    ? `ERROR: ${offErr.message}`
    : (clearedOff?.length ?? 0);

  // 3. Reset invoice_counter table (last_number → 0)
  let counterReset = "";
  try {
    const { data: cRow } = await sb
      .from("invoice_counter")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (cRow) {
      const { error: cUpErr } = await sb
        .from("invoice_counter")
        .update({ last_number: 0 })
        .eq("id", (cRow as { id: string }).id);

      counterReset = cUpErr
        ? `ERROR resetting invoice_counter: ${cUpErr.message}`
        : "invoice_counter.last_number → 0 ✓";
    } else {
      counterReset = "invoice_counter table exists but has no rows — nothing to reset";
    }
  } catch {
    counterReset = "invoice_counter table not found — counter may be a Postgres sequence; reset manually";
  }
  results.counter_reset = counterReset;

  return NextResponse.json(results);
}
