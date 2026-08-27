"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

interface Order {
  id: string;
  order_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  shipping_street: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;
  order_notes: string | null;
  items: { id: string; name: string; price: number; quantity: number; label: string; imageUrl: string }[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  payment_method: "cod" | "online";
  payment_type: "online" | "partial_cod" | null;
  amount_paid_online: number | null;
  amount_due_cod: number | null;
  payment_status: string;
  order_status: string;
  created_at: string;
  // Shiprocket fulfillment
  shiprocket_order_id:    string | null;
  shiprocket_shipment_id: string | null;
  awb_number:             string | null;
  courier_name:           string | null;
  tracking_url:           string | null;
  label_url:              string | null;
  shipping_status:        string | null;
}

interface InvoiceRecord {
  invoice_number: string;
  created_at: string;
}

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const SHIPPING_STATUS_LABELS: Record<string, string> = {
  pickup_scheduled:  "Pickup Scheduled",
  pickup_error:      "Pickup Error",
  picked_up:         "Picked Up",
  in_transit:        "In Transit",
  out_for_delivery:  "Out for Delivery",
  delivered:         "Delivered",
  delivery_failed:   "Delivery Failed",
  rto_initiated:     "RTO Initiated",
  rto_delivered:     "RTO Delivered",
  lost:              "Lost",
  cancelled:         "Cancelled",
};

const SHIPPING_STATUS_COLORS: Record<string, string> = {
  pickup_scheduled:  "text-[rgba(180,140,60,0.85)]  bg-[rgba(180,140,60,0.08)]",
  pickup_error:      "text-[rgba(200,80,80,0.85)]   bg-[rgba(200,80,80,0.08)]",
  picked_up:         "text-[rgba(100,160,220,0.85)] bg-[rgba(100,160,220,0.08)]",
  in_transit:        "text-[rgba(80,160,220,0.85)]  bg-[rgba(80,160,220,0.08)]",
  out_for_delivery:  "text-[rgba(140,100,220,0.85)] bg-[rgba(140,100,220,0.08)]",
  delivered:         "text-[rgba(80,200,120,0.85)]  bg-[rgba(80,200,120,0.08)]",
  delivery_failed:   "text-[rgba(200,80,80,0.85)]   bg-[rgba(200,80,80,0.08)]",
  rto_initiated:     "text-[rgba(220,100,60,0.85)]  bg-[rgba(220,100,60,0.08)]",
  rto_delivered:     "text-[rgba(200,80,80,0.75)]   bg-[rgba(200,80,80,0.06)]",
  lost:              "text-[rgba(200,80,80,0.85)]   bg-[rgba(200,80,80,0.08)]",
  cancelled:         "text-[rgba(200,80,80,0.75)]   bg-[rgba(200,80,80,0.06)]",
};

const STATUS_COLORS: Record<string, string> = {
  pending:    "text-[rgba(220,160,60,0.85)]   bg-[rgba(220,160,60,0.08)]",
  confirmed:  "text-[rgba(80,200,140,0.85)]   bg-[rgba(80,200,140,0.08)]",
  processing: "text-[rgba(100,160,220,0.85)]  bg-[rgba(100,160,220,0.08)]",
  packed:     "text-[rgba(140,100,220,0.85)]  bg-[rgba(140,100,220,0.08)]",
  shipped:    "text-[rgba(60,160,220,0.85)]   bg-[rgba(60,160,220,0.08)]",
  delivered:  "text-[rgba(80,200,120,0.85)]   bg-[rgba(80,200,120,0.08)]",
  cancelled:  "text-[rgba(200,80,80,0.75)]    bg-[rgba(200,80,80,0.06)]",
};

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const [orders,        setOrders]        = useState<Order[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState("");
  const [page,          setPage]          = useState(0);
  const [total,         setTotal]         = useState(0);
  const [selected,      setSelected]      = useState<Order | null>(null);
  const [updating,      setUpdating]      = useState<Record<string, boolean>>({});
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [invoiceLoading,  setInvoiceLoading]  = useState(false);
  const [invoiceError,    setInvoiceError]    = useState<string | null>(null);
  const [deleting,        setDeleting]        = useState(false);
  const [checkedIds,      setCheckedIds]      = useState<Set<string>>(new Set());
  const [bulkDeleting,    setBulkDeleting]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("orders").select("*", { count: "exact" });
    if (statusFilter) q = q.eq("order_status", statusFilter);
    if (search) q = q.or(`order_number.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    q = q.order("created_at", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    const { data, count } = await q;
    setOrders((data ?? []) as Order[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  /* Fetch invoice whenever a different order is opened in the drawer */
  const selectedId = selected?.id;
  useEffect(() => {
    if (!selectedId) { setSelectedInvoice(null); setInvoiceLoading(false); setInvoiceError(null); return; }
    setInvoiceLoading(true);
    setInvoiceError(null);
    supabase
      .from("invoices")
      .select("invoice_number, created_at")
      .eq("order_id", selectedId)
      .maybeSingle()
      .then(({ data }) => {
        setSelectedInvoice((data as InvoiceRecord | null) ?? null);
        setInvoiceLoading(false);
      });
  }, [selectedId]);

  async function generateInvoice(order: Order) {
    setInvoiceLoading(true);
    setInvoiceError(null);
    const res = await fetch("/api/admin/generate-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id:     order.id,
        order_number: order.order_number,
        subtotal:     order.subtotal,
        shipping_fee: order.shipping_fee ?? 0,
      }),
    });
    const body = await res.json() as { invoice_number?: string; error?: string };
    if (!res.ok || body.error) {
      setInvoiceError(body.error ?? `API error ${res.status}`);
      setInvoiceLoading(false);
      return;
    }
    if (body.invoice_number) {
      setSelectedInvoice({ invoice_number: body.invoice_number, created_at: new Date().toISOString() });
    }
    setInvoiceLoading(false);
  }

  async function updateStatus(order: Order, newStatus: string) {
    setUpdating(p => ({ ...p, [order.id]: true }));
    const res = await fetch("/api/admin/update-order-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: order.id, order_status: newStatus }),
    });
    if (!res.ok) {
      console.error("[updateStatus] failed:", await res.text());
      setUpdating(p => ({ ...p, [order.id]: false }));
      return;
    }
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, order_status: newStatus } : o));
    if (selected?.id === order.id) setSelected(s => s ? { ...s, order_status: newStatus } : null);

    /* Auto-generate GST invoice when order is confirmed */
    if (newStatus === "confirmed") {
      const res = await fetch("/api/admin/generate-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id:     order.id,
          order_number: order.order_number,
          subtotal:     order.subtotal,
          shipping_fee: order.shipping_fee ?? 0,
        }),
      });
      if (res.ok) {
        const body = await res.json() as { invoice_number?: string; invoice_id?: string };
        if (body.invoice_number && selected?.id === order.id) {
          setSelectedInvoice({ invoice_number: body.invoice_number, created_at: new Date().toISOString() });
        }
      }
    }

    setUpdating(p => ({ ...p, [order.id]: false }));
  }

  async function callDeleteApi(ids: string[]): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/delete-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ ids }),
    });
    return res.ok;
  }

  async function deleteOrder(order: Order) {
    if (!window.confirm(`Delete order ${order.order_number}? This cannot be undone.`)) return;
    setDeleting(true);
    const ok = await callDeleteApi([order.id]);
    if (ok) {
      setOrders(prev => prev.filter(o => o.id !== order.id));
      setTotal(prev => prev - 1);
      setSelected(null);
      setCheckedIds(prev => { const n = new Set(prev); n.delete(order.id); return n; });
    }
    setDeleting(false);
  }

  async function deleteBulk() {
    const ids = Array.from(checkedIds);
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} order${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    const ok = await callDeleteApi(ids);
    if (ok) {
      setOrders(prev => prev.filter(o => !checkedIds.has(o.id)));
      setTotal(prev => prev - ids.length);
      setCheckedIds(new Set());
      setSelected(null);
    }
    setBulkDeleting(false);
  }

  function toggleCheck(id: string) {
    setCheckedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  }

  function toggleAll() {
    if (checkedIds.size === orders.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(orders.map(o => o.id)));
    }
  }

  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="px-8 pt-8 pb-16">
      <div className="mb-6">
        <p className="font-display text-[0.44rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.35)] mb-1">Management</p>
        <h1 className="font-display text-ivory" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>Orders</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input
          type="text"
          placeholder="Search order # or name…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="bg-[#1e0c17] border border-[rgba(196,163,115,0.18)] rounded-[4px] px-4 py-2.5 font-body font-light text-ivory text-sm placeholder:text-[rgba(245,237,224,0.22)] focus:outline-none focus:border-[rgba(196,163,115,0.45)] w-72 transition-colors"
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          className="bg-[#1e0c17] border border-[rgba(196,163,115,0.18)] rounded-[4px] px-3 py-2.5 font-body font-light text-[rgba(245,237,224,0.65)] text-sm focus:outline-none focus:border-[rgba(196,163,115,0.45)] transition-colors"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <span className="ml-auto font-body font-light text-[rgba(245,237,224,0.30)] text-sm self-center">
          {total} order{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Bulk-action bar */}
      {checkedIds.size > 0 && (
        <div className="flex items-center gap-4 mb-3 px-4 py-2.5 bg-[rgba(210,80,80,0.07)] border border-[rgba(210,80,80,0.20)] rounded-[4px]">
          <span className="font-display text-[0.50rem] tracking-[0.14em] uppercase text-[rgba(245,237,224,0.55)]">
            {checkedIds.size} selected
          </span>
          <button
            onClick={deleteBulk}
            disabled={bulkDeleting}
            className="font-display text-[0.50rem] tracking-[0.14em] uppercase text-[rgba(210,80,80,0.80)] border border-[rgba(210,80,80,0.35)] hover:border-[rgba(210,80,80,0.65)] hover:text-[rgba(210,80,80,1)] rounded-[3px] px-4 py-1.5 transition-all duration-150 disabled:opacity-40"
          >
            {bulkDeleting ? "Deleting…" : `Delete ${checkedIds.size} Order${checkedIds.size > 1 ? "s" : ""}`}
          </button>
          <button
            onClick={() => setCheckedIds(new Set())}
            className="ml-auto font-display text-[0.46rem] tracking-[0.12em] uppercase text-[rgba(245,237,224,0.28)] hover:text-[rgba(245,237,224,0.55)] transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] overflow-hidden mb-4">
        {/* Header */}
        <div className="hidden lg:grid grid-cols-[32px_1fr_120px_100px_110px_120px_110px_110px] gap-3 px-5 py-3 border-b border-[rgba(196,163,115,0.08)]">
          <input
            type="checkbox"
            checked={orders.length > 0 && checkedIds.size === orders.length}
            onChange={toggleAll}
            className="accent-[#C4A373] mt-0.5"
            title="Select all"
          />
          {["Order / Customer", "Total", "Payment", "Status", "Shipping", "Update Status", "Date"].map(h => (
            <span key={h} className="font-display text-[0.42rem] tracking-[0.16em] uppercase text-[rgba(196,163,113,0.35)]">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <p className="px-5 py-10 font-body font-light italic text-[rgba(245,237,224,0.28)] text-sm text-center">No orders found.</p>
        ) : (
          <div className="divide-y divide-[rgba(196,163,115,0.06)]">
            {orders.map(o => (
              <div
                key={o.id}
                className={`grid grid-cols-1 lg:grid-cols-[32px_1fr_120px_100px_110px_120px_110px_110px] gap-2 lg:gap-3 items-center px-5 py-3.5 hover:bg-[rgba(196,163,115,0.03)] transition-colors ${checkedIds.has(o.id) ? "bg-[rgba(210,80,80,0.04)]" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checkedIds.has(o.id)}
                  onChange={() => toggleCheck(o.id)}
                  onClick={e => e.stopPropagation()}
                  className="accent-[#C4A373]"
                />
                <button
                  onClick={() => setSelected(o)}
                  className="text-left"
                >
                  <p className="font-display text-brass hover:text-ivory transition-colors" style={{ fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                    {o.order_number}
                  </p>
                  <p className="font-body font-light text-[rgba(245,237,224,0.42)] text-[0.72rem] mt-0.5">
                    {o.first_name} {o.last_name}
                  </p>
                </button>

                <span className="font-display text-ivory" style={{ fontSize: "0.80rem", letterSpacing: "0.04em" }}>
                  ₹{o.total.toLocaleString("en-IN")}
                </span>

                <div className="flex flex-col gap-0.5">
                  <span className="font-display text-[0.44rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.45)]">
                    {o.payment_type === "partial_cod" ? "50/50 COD" : o.payment_method === "cod" ? "COD" : "Online"}
                    {o.payment_status === "paid" && " ✓"}
                  </span>
                  {o.payment_type === "partial_cod" && o.amount_due_cod != null && (
                    <span className="font-display text-[0.40rem] tracking-[0.08em] uppercase text-[rgba(220,150,60,0.90)] bg-[rgba(220,150,60,0.12)] px-1.5 py-0.5 rounded-[2px] w-fit whitespace-nowrap">
                      Collect ₹{o.amount_due_cod.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                <span className={`font-display text-[0.43rem] tracking-[0.12em] uppercase px-2 py-1 rounded-[3px] w-fit ${STATUS_COLORS[o.order_status] ?? "text-[rgba(245,237,224,0.40)]"}`}>
                  {o.order_status}
                </span>

                {/* Shiprocket live shipping status */}
                {o.shipping_status ? (
                  <span className={`font-display text-[0.40rem] tracking-[0.10em] uppercase px-2 py-1 rounded-[3px] w-fit whitespace-nowrap ${SHIPPING_STATUS_COLORS[o.shipping_status] ?? "text-[rgba(245,237,224,0.35)] bg-[rgba(245,237,224,0.04)]"}`}>
                    {SHIPPING_STATUS_LABELS[o.shipping_status] ?? o.shipping_status.replace(/_/g, " ")}
                  </span>
                ) : (
                  <span className="font-display text-[0.40rem] tracking-[0.08em] uppercase text-[rgba(245,237,224,0.18)]">—</span>
                )}

                <select
                  value={o.order_status}
                  disabled={updating[o.id]}
                  onChange={e => updateStatus(o, e.target.value)}
                  className="bg-[#12060e] border border-[rgba(196,163,115,0.16)] rounded-[3px] px-2 py-1.5 font-display text-[0.43rem] tracking-[0.10em] uppercase text-[rgba(245,237,224,0.55)] focus:outline-none focus:border-[rgba(196,163,115,0.40)] disabled:opacity-50 transition-colors"
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>

                <span className="font-body font-light text-[rgba(245,237,224,0.30)] text-[0.70rem]">
                  {new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="font-display text-[0.46rem] tracking-[0.14em] uppercase px-3 py-2 border border-[rgba(196,163,115,0.20)] rounded-[3px] text-[rgba(196,163,115,0.55)] hover:text-brass hover:border-[rgba(196,163,115,0.40)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <span className="font-body font-light text-[rgba(245,237,224,0.30)] text-xs px-2">
            {page + 1} / {pages}
          </span>
          <button
            disabled={page >= pages - 1}
            onClick={() => setPage(p => p + 1)}
            className="font-display text-[0.46rem] tracking-[0.14em] uppercase px-3 py-2 border border-[rgba(196,163,115,0.20)] rounded-[3px] text-[rgba(196,163,115,0.55)] hover:text-brass hover:border-[rgba(196,163,115,0.40)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {/* Order detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-[rgba(10,3,7,0.70)]" onClick={() => setSelected(null)} />
          <div className="relative bg-[#1a0a12] border-l border-[rgba(196,163,115,0.15)] w-full max-w-md h-full overflow-y-auto p-7 flex flex-col gap-6">

            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-[0.44rem] tracking-[0.20em] uppercase text-[rgba(196,163,115,0.38)] mb-1">Order Detail</p>
                <p className="font-display text-brass" style={{ fontSize: "0.95rem", letterSpacing: "0.08em" }}>{selected.order_number}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[rgba(245,237,224,0.30)] hover:text-ivory text-lg leading-none">×</button>
            </div>

            {/* Customer */}
            <Section title="Customer">
              <Row label="Name"  value={`${selected.first_name} ${selected.last_name}`} />
              <Row label="Email" value={selected.email} />
              <Row label="Phone" value={selected.phone} />
            </Section>

            {/* Shipping */}
            <Section title="Shipping Address">
              <Row label="Street"  value={selected.shipping_street} />
              <Row label="City"    value={`${selected.shipping_city}, ${selected.shipping_state}`} />
              <Row label="Pincode" value={selected.shipping_pincode} />
              {selected.order_notes && <Row label="Notes" value={selected.order_notes} />}
            </Section>

            {/* Payment */}
            <Section title="Payment">
              <Row label="Method"   value={selected.payment_type === "partial_cod" ? "Partial COD (50/50)" : selected.payment_method === "cod" ? "Cash on Delivery" : "Online (Razorpay)"} />
              <Row label="Status"   value={selected.payment_status} />
              <Row label="Subtotal" value={`₹${selected.subtotal.toLocaleString("en-IN")}`} />
              <Row label="Shipping" value={`₹${selected.shipping_fee.toLocaleString("en-IN")}`} />
              <Row label="Total"    value={`₹${selected.total.toLocaleString("en-IN")}`} bold />
              {selected.payment_type === "partial_cod" && (
                <>
                  <Row label="Paid online" value={`₹${(selected.amount_paid_online ?? 0).toLocaleString("en-IN")}`} />
                  <div className="mt-1 px-4 py-3 rounded-[4px] bg-[rgba(220,150,60,0.10)] border border-[rgba(220,150,60,0.30)]">
                    <p className="font-display text-[0.40rem] tracking-[0.16em] uppercase text-[rgba(220,150,60,0.65)] mb-1">COD Amount to Collect</p>
                    <p className="font-display text-[rgba(220,150,60,0.95)]" style={{ fontSize: "1.3rem", letterSpacing: "0.04em" }}>
                      ₹{(selected.amount_due_cod ?? 0).toLocaleString("en-IN")}
                    </p>
                    <p className="font-body font-light text-[rgba(220,150,60,0.55)] text-[0.68rem] mt-1">
                      Collect this in cash at time of delivery. Already includes the ₹10 convenience fee.
                    </p>
                  </div>
                </>
              )}
            </Section>

            {/* Items */}
            <Section title={`Items (${selected.items.length})`}>
              {selected.items.map((item, i) => (
                <div key={i} className="flex justify-between items-start py-2 border-b border-[rgba(196,163,115,0.07)] last:border-0">
                  <div>
                    <p className="font-display text-ivory text-[0.72rem] tracking-wide">{item.name}</p>
                    {item.label && <p className="font-body font-light text-[rgba(196,163,115,0.45)] text-[0.65rem]">{item.label}</p>}
                    <p className="font-body font-light text-[rgba(245,237,224,0.35)] text-[0.68rem]">Qty {item.quantity}</p>
                  </div>
                  <span className="font-display text-brass text-[0.75rem]">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </Section>

            {/* Invoice */}
            {invoiceLoading ? (
              <div className="flex items-center gap-2 py-1">
                <div className="w-3 h-3 rounded-full border border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
                <span className="font-body font-light text-[rgba(245,237,224,0.28)] text-xs">Checking invoice…</span>
              </div>
            ) : selectedInvoice ? (
              <Section title="Invoice">
                <Row label="Invoice No." value={selectedInvoice.invoice_number} bold />
                <Row
                  label="Generated"
                  value={new Date(selectedInvoice.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                />
                <div className="flex gap-2 mt-2 flex-wrap">
                  <a
                    href={`/invoice/${selected.order_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-display text-[0.52rem] tracking-[0.18em] uppercase text-brass border border-[rgba(196,163,115,0.30)] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.55)] rounded-[3px] px-3 py-2 transition-all duration-150"
                  >
                    Print Invoice ↗
                  </a>
                </div>
              </Section>
            ) : (
              <Section title="Invoice">
                <button
                  onClick={() => generateInvoice(selected)}
                  className="font-display text-[0.52rem] tracking-[0.18em] uppercase text-brass border border-[rgba(196,163,115,0.30)] hover:bg-[rgba(196,163,115,0.07)] rounded-[3px] px-3 py-2 transition-all duration-150 text-left"
                >
                  Generate Invoice
                </button>
                {invoiceError && (
                  <p className="font-mono text-[rgba(220,80,80,0.85)] text-[0.68rem] break-all mt-1">{invoiceError}</p>
                )}
              </Section>
            )}

            {/* Shiprocket fulfillment */}
            <Section title="Fulfillment">
              {selected.awb_number ? (
                <>
                  <Row label="AWB"     value={selected.awb_number} bold />
                  <Row label="Courier" value={selected.courier_name ?? "—"} />
                  {selected.shiprocket_order_id && (
                    <Row label="SR Order ID" value={selected.shiprocket_order_id} />
                  )}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {selected.tracking_url && (
                      <a
                        href={selected.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 font-display text-[0.52rem] tracking-[0.18em] uppercase text-brass border border-[rgba(196,163,115,0.30)] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.55)] rounded-[3px] px-3 py-2 transition-all duration-150"
                      >
                        Track Shipment ↗
                      </a>
                    )}
                  </div>
                </>
              ) : selected.shiprocket_order_id ? (
                <p className="font-body font-light text-[rgba(220,150,60,0.75)] text-[0.72rem]">
                  SR order created (ID: {selected.shiprocket_order_id}) — AWB assignment pending.
                </p>
              ) : (
                <p className="font-body font-light text-[rgba(245,237,224,0.28)] text-[0.72rem] italic">
                  Not yet pushed to Shiprocket. This happens automatically after payment.
                </p>
              )}
            </Section>

            {/* Status update */}
            <Section title="Update Status">
              <select
                value={selected.order_status}
                onChange={e => updateStatus(selected, e.target.value)}
                className="w-full bg-[#12060e] border border-[rgba(196,163,115,0.20)] rounded-[4px] px-3 py-2.5 font-body font-light text-ivory text-sm focus:outline-none focus:border-[rgba(196,163,115,0.45)] transition-colors"
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </Section>

            {/* Delete */}
            <div className="pt-2 border-t border-[rgba(210,80,80,0.12)]">
              <button
                onClick={() => deleteOrder(selected)}
                disabled={deleting}
                className="w-full font-display text-[0.50rem] tracking-[0.16em] uppercase text-[rgba(210,80,80,0.55)] border border-[rgba(210,80,80,0.22)] hover:text-[rgba(210,80,80,0.85)] hover:border-[rgba(210,80,80,0.45)] rounded-[3px] py-2.5 transition-all duration-150 disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Delete This Order"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-display text-[0.46rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.40)] mb-3 pb-2 border-b border-[rgba(196,163,115,0.08)]">
        {title}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="font-body font-light text-[rgba(245,237,224,0.35)] text-[0.75rem] shrink-0">{label}</span>
      <span className={`font-body font-light text-right text-[0.78rem] ${bold ? "text-brass font-normal" : "text-[rgba(245,237,224,0.65)]"}`}>{value}</span>
    </div>
  );
}
