import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// One-shot invoice reset endpoint — delete after use.
// GET  → list all invoices + introspect counter mechanism (read-only)
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

// GET — list all invoices + show counter function body
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = adminClient();

  const [invoicesRes, offlineRes, funcRes, seqRes, tableRes] = await Promise.all([
    // Online invoices
    sb.from("invoices")
      .select("id, invoice_number, order_id, order_number, taxable_value, gst_amount, total_amount, created_at")
      .order("created_at", { ascending: true }),

    // Offline invoices (orders with invoice_number set)
    sb.from("offline_sales_orders")
      .select("id, invoice_number, invoice_date, customer_name, channel, amount_paid, created_at")
      .not("invoice_number", "is", null)
      .order("invoice_date", { ascending: true }),

    // Introspect: function body of generate_invoice_number
    sb.rpc("exec_sql", { sql: "SELECT prosrc FROM pg_proc WHERE proname = 'generate_invoice_number' LIMIT 1;" })
      .maybeSingle()
      .catch(() => ({ data: null, error: "exec_sql not available" })),

    // Introspect: postgres sequences named like invoice
    sb.from("information_schema.sequences" as "invoices")
      .select("sequence_name, last_value:start_value")
      .ilike("sequence_name" as "id", "%invoice%")
      .catch(() => ({ data: null, error: null })),

    // Introspect: invoice_counter table if it exists
    sb.from("invoice_counter")
      .select("*")
      .limit(5)
      .catch(() => ({ data: null, error: "no invoice_counter table" })),
  ]);

  const online  = invoicesRes.data ?? [];
  const offline = offlineRes.data ?? [];

  return NextResponse.json({
    online_invoices:  online,
    offline_invoices: offline,
    total_count:      online.length + offline.length,
    counter_introspection: {
      invoice_counter_table: tableRes.data ?? tableRes.error,
      sequences_named_invoice: seqRes.data,
      function_body: funcRes.data ?? funcRes.error,
    },
    instructions: "Confirm the list above, then POST { action: 'reset' } to proceed.",
  });
}

// POST — delete all and reset counter
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (body.action !== "reset") {
    return NextResponse.json({ error: "Send { action: 'reset' } to confirm." }, { status: 400 });
  }

  const sb = adminClient();
  const results: Record<string, unknown> = {};

  // 1. Delete all online invoices
  const { data: deleted, error: delErr } = await sb
    .from("invoices")
    .delete()
    .gte("created_at", "2000-01-01")  // match all rows
    .select("id, invoice_number");

  results.online_invoices_deleted = delErr ? `ERROR: ${delErr.message}` : (deleted?.length ?? 0);
  results.deleted_numbers = deleted?.map(r => r.invoice_number) ?? [];

  // 2. Clear offline invoice stamps
  const { data: clearedOff, error: offErr } = await sb
    .from("offline_sales_orders")
    .update({ invoice_number: null, invoice_date: null })
    .not("invoice_number", "is", null)
    .select("id");

  results.offline_invoices_cleared = offErr ? `ERROR: ${offErr.message}` : (clearedOff?.length ?? 0);

  // 3. Reset counter — try invoice_counter table
  const { data: cRows, error: cFetchErr } = await sb
    .from("invoice_counter")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!cFetchErr && cRows) {
    const { error: cUpErr } = await sb
      .from("invoice_counter")
      .update({ last_number: 0 })
      .eq("id", (cRows as { id: unknown }).id);
    results.counter_reset = cUpErr ? `ERROR: ${cUpErr.message}` : "invoice_counter.last_number → 0";
  } else {
    results.counter_reset = `invoice_counter table not found (${cFetchErr?.message ?? "no rows"}) — reset the Postgres sequence or counter manually`;
  }

  // 4. Verify: generate a test number (this will advance the counter by 1 if it's a sequence!)
  // So we skip this here — user should test by generating a real invoice after reset.

  return NextResponse.json(results);
}
