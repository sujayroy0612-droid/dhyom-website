"use client";

import { useState, useEffect, useCallback } from "react";

// -- Types ------------------------------------------------------------------

interface Product { id: string; name: string; category: string; price: number; }

interface SaleItem {
  id: string; product_id: string; quantity: number; unit_price: number; line_total: number;
  products: { id: string; name: string; price: number } | null;
}

interface SaleOrder {
  id: string; sale_date: string; channel: string; customer_name: string;
  location?: string; payment_mode: string; payment_status: string;
  amount_paid: number; notes?: string; created_at: string;
  invoice_number?: string | null; invoice_date?: string | null;
  offline_sales_items: SaleItem[];
  order_total: number;
}

interface Summary {
  total: number;
  byChannel: { wholesale: number; corporate_gifting: number; dm_order: number; exhibition: number };
}

// -- Shared UI --------------------------------------------------------------

const inputCls =
  "w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body font-light text-[0.88rem] text-ivory placeholder:text-[rgba(245,237,224,0.22)] focus:outline-none focus:border-[rgba(196,163,115,0.50)] transition-colors";

const selectCls = inputCls + " appearance-none cursor-pointer";
// Native <option> elements need explicit colors; CSS vars don't reach OS dropdown chrome
const optStyle: React.CSSProperties = { background: "#1a0a12", color: "#f5ede0" };

function Field({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) {
  return (
    <div className={half ? "flex flex-col gap-1.5 w-1/2" : "flex flex-col gap-1.5"}>
      <label className="font-display text-[0.46rem] tracking-[0.20em] uppercase text-[rgba(196,163,115,0.55)]">{label}</label>
      {children}
    </div>
  );
}

const CHANNELS: { value: string; label: string }[] = [
  { value: "wholesale",          label: "Wholesale" },
  { value: "corporate_gifting",  label: "Corporate / Gifting" },
  { value: "dm_order",           label: "DM Order (WhatsApp / Insta)" },
  { value: "exhibition",         label: "Exhibition / Pop-up" },
];

const PAYMENT_MODES: { value: string; label: string }[] = [
  { value: "cash",          label: "Cash" },
  { value: "upi",           label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "pending",       label: "Pending" },
];

const PAYMENT_STATUSES: { value: string; label: string }[] = [
  { value: "paid",    label: "Paid in Full" },
  { value: "partial", label: "Partial Payment" },
  { value: "pending", label: "Payment Pending" },
];

function channelLabel(v: string) { return CHANNELS.find(c => c.value === v)?.label ?? v; }
function payStatusBadge(v: string) {
  if (v === "paid")    return "text-[rgba(100,210,130,0.80)] bg-[rgba(100,210,130,0.08)]";
  if (v === "partial") return "text-[rgba(210,175,70,0.80)] bg-[rgba(210,175,70,0.08)]";
  return "text-[rgba(245,237,224,0.35)] bg-[rgba(245,237,224,0.04)]";
}

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0 }); }

// -- Form state -------------------------------------------------------------

type LineItem = { product_id: string; quantity: number; unit_price: number };

const emptyLine = (): LineItem => ({ product_id: "", quantity: 1, unit_price: 0 });

const todayStr = () => new Date().toISOString().slice(0, 10);

// -- Page -------------------------------------------------------------------

export default function OfflineSalesPage() {
  const [view, setView] = useState<"list" | "form">("list");

  const [products, setProducts] = useState<Product[]>([]);

  const [orders, setOrders]     = useState<SaleOrder[]>([]);
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [loading, setLoading]   = useState(false);
  const [filterChannel, setFilterChannel] = useState("");
  const [filterFrom, setFilterFrom]       = useState("");
  const [filterTo, setFilterTo]           = useState("");
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [deleting, setDeleting]           = useState<string | null>(null);
  const [invoiceGenerating, setInvoiceGenerating] = useState<Set<string>>(new Set());
  const [invoiceNumbers, setInvoiceNumbers]       = useState<Map<string, string>>(new Map());

  const [fDate, setFDate]         = useState(todayStr());
  const [fChannel, setFChannel]   = useState("wholesale");
  const [fCustomer, setFCustomer] = useState("");
  const [fLocation, setFLocation] = useState("");
  const [fMode, setFMode]         = useState("cash");
  const [fStatus, setFStatus]     = useState("paid");
  const [fAmtPaid, setFAmtPaid]   = useState("");
  const [fNotes, setFNotes]       = useState("");
  const [lines, setLines]         = useState<LineItem[]>([emptyLine()]);
  const [saving, setSaving]       = useState(false);
  const [formErr, setFormErr]     = useState("");

  useEffect(() => {
    fetch("/api/admin/offline-sales/products")
      .then(r => r.json())
      .then(d => { if (d.products) setProducts(d.products); })
      .catch(() => {});
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterFrom)    params.set("from", filterFrom);
    if (filterTo)      params.set("to",   filterTo);
    if (filterChannel) params.set("channel", filterChannel);
    const res = await fetch(`/api/admin/offline-sales?${params}`);
    const d   = await res.json();
    if (d.orders)  setOrders(d.orders);
    if (d.summary) setSummary(d.summary);
    setLoading(false);
  }, [filterFrom, filterTo, filterChannel]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    setInvoiceNumbers(prev => {
      const next = new Map(prev);
      orders.forEach(o => { if (o.invoice_number) next.set(o.id, o.invoice_number); });
      return next;
    });
  }, [orders]);

  async function generateInvoice(orderId: string) {
    setInvoiceGenerating(prev => new Set(prev).add(orderId));
    const res = await fetch("/api/admin/generate-offline-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offline_order_id: orderId }),
    });
    const d = await res.json();
    setInvoiceGenerating(prev => { const n = new Set(prev); n.delete(orderId); return n; });
    if (d.invoice_number) {
      setInvoiceNumbers(prev => new Map(prev).set(orderId, d.invoice_number));
    }
  }

  const runningTotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0);

  function updateLine(i: number, patch: Partial<LineItem>) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }
  function selectProduct(lineIdx: number, productId: string) {
    const p = products.find(x => x.id === productId);
    setLines(prev => prev.map((l, idx) => idx === lineIdx
      ? { ...l, product_id: productId, unit_price: p ? p.price : l.unit_price }
      : l
    ));
  }
  function addLine() { setLines(prev => [...prev, emptyLine()]); }
  function removeLine(i: number) { setLines(prev => prev.filter((_, idx) => idx !== i)); }

  function resetForm() {
    setFDate(todayStr()); setFChannel("wholesale"); setFCustomer(""); setFLocation("");
    setFMode("cash"); setFStatus("paid"); setFAmtPaid(""); setFNotes("");
    setLines([emptyLine()]); setFormErr("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr("");
    if (!fCustomer.trim()) { setFormErr("Customer name is required."); return; }
    if (lines.some(l => !l.product_id)) { setFormErr("Select a product for every line item."); return; }
    if (fStatus === "partial" && (!fAmtPaid || Number(fAmtPaid) <= 0)) {
      setFormErr("Enter the amount paid for partial payment."); return;
    }

    const amtPaid = fStatus === "paid" ? runningTotal : fStatus === "pending" ? 0 : Number(fAmtPaid);

    setSaving(true);
    const res = await fetch("/api/admin/offline-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        order: {
          sale_date:      fDate,
          channel:        fChannel,
          customer_name:  fCustomer.trim(),
          location:       fLocation.trim() || undefined,
          payment_mode:   fMode,
          payment_status: fStatus,
          amount_paid:    amtPaid,
          notes:          fNotes.trim() || undefined,
        },
        items: lines.map(l => ({
          product_id: l.product_id,
          quantity:   Number(l.quantity),
          unit_price: Number(l.unit_price),
        })),
      }),
    });

    const d = await res.json();
    setSaving(false);
    if (!res.ok || !d.ok) { setFormErr(d.error ?? "Failed to save."); return; }
    resetForm();
    setView("list");
    loadOrders();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this sale record?")) return;
    setDeleting(id);
    await fetch("/api/admin/offline-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    setDeleting(null);
    loadOrders();
  }

  // -- Render ---------------------------------------------------------------

  return (
    <div className="p-8 min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-display text-[0.44rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.40)] mb-1">Admin</p>
          <h1 className="font-display text-ivory" style={{ fontSize: "1.35rem", letterSpacing: "0.06em" }}>
            Offline Sales
          </h1>
          <p className="font-body font-light text-[0.78rem] text-[rgba(245,237,224,0.35)] mt-0.5">
            Wholesale &middot; Corporate &middot; DM orders &middot; Exhibition
          </p>
        </div>
        {view === "list" ? (
          <button
            onClick={() => { resetForm(); setView("form"); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[4px] bg-[rgba(196,163,115,0.12)] border border-[rgba(196,163,115,0.22)] text-brass hover:bg-[rgba(196,163,115,0.18)] transition-colors"
          >
            <span className="text-[1rem]">+</span>
            <span className="font-display text-[0.50rem] tracking-[0.16em] uppercase">Add Sale</span>
          </button>
        ) : (
          <button
            onClick={() => { resetForm(); setView("list"); }}
            className="font-display text-[0.46rem] tracking-[0.16em] uppercase text-[rgba(245,237,224,0.35)] hover:text-[rgba(245,237,224,0.65)] transition-colors"
          >
            &larr; Back to list
          </button>
        )}
      </div>

      {/* LIST VIEW */}
      {view === "list" && (
        <div className="flex flex-col gap-6">

          {/* Summary strip */}
          {summary && (
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: "Total Offline Revenue", value: fmt(summary.total), highlight: true },
                { label: "Wholesale",             value: fmt(summary.byChannel.wholesale) },
                { label: "Corporate / Gifting",   value: fmt(summary.byChannel.corporate_gifting) },
                { label: "DM Orders",             value: fmt(summary.byChannel.dm_order) },
                { label: "Exhibition",             value: fmt(summary.byChannel.exhibition) },
              ].map(s => (
                <div key={s.label} className={`rounded-[6px] border px-4 py-3.5 ${s.highlight ? "border-[rgba(196,163,115,0.28)] bg-[rgba(196,163,115,0.06)]" : "border-[rgba(196,163,115,0.10)] bg-[rgba(255,255,255,0.02)]"}`}>
                  <p className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.45)] mb-1">{s.label}</p>
                  <p className={`font-display ${s.highlight ? "text-brass" : "text-ivory"}`} style={{ fontSize: "1.05rem", letterSpacing: "0.04em" }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={filterChannel}
              onChange={e => setFilterChannel(e.target.value)}
              className="bg-[rgba(255,255,255,0.03)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body font-light text-[0.82rem] text-ivory focus:outline-none focus:border-[rgba(196,163,115,0.50)] transition-colors appearance-none cursor-pointer"
            >
              <option value="" style={optStyle}>All channels</option>
              {CHANNELS.map(c => <option key={c.value} value={c.value} style={optStyle}>{c.label}</option>)}
            </select>
            <input
              type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="bg-[rgba(255,255,255,0.03)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body font-light text-[0.82rem] text-ivory focus:outline-none focus:border-[rgba(196,163,115,0.50)] transition-colors"
            />
            <span className="text-[rgba(245,237,224,0.25)] text-[0.80rem]">&rarr;</span>
            <input
              type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="bg-[rgba(255,255,255,0.03)] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 font-body font-light text-[0.82rem] text-ivory focus:outline-none focus:border-[rgba(196,163,115,0.50)] transition-colors"
            />
            {(filterChannel || filterFrom || filterTo) && (
              <button
                onClick={() => { setFilterChannel(""); setFilterFrom(""); setFilterTo(""); }}
                className="font-display text-[0.42rem] tracking-[0.14em] uppercase text-[rgba(245,237,224,0.30)] hover:text-[rgba(245,237,224,0.60)] transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-[6px] border border-[rgba(196,163,115,0.10)] bg-[rgba(255,255,255,0.02)] overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="py-16 text-center font-body font-light text-[0.82rem] text-[rgba(245,237,224,0.25)]">
                No offline sales recorded yet.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(196,163,115,0.08)]">
                    {["Date", "Channel", "Customer", "Location", "Total", "Paid", "Status", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-display text-[0.40rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.40)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <>
                      <tr
                        key={o.id}
                        onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                        className="border-b border-[rgba(196,163,115,0.06)] cursor-pointer hover:bg-[rgba(196,163,115,0.04)] transition-colors"
                      >
                        <td className="px-4 py-3 font-body font-light text-[0.82rem] text-ivory whitespace-nowrap">{o.sale_date}</td>
                        <td className="px-4 py-3 font-body font-light text-[0.82rem] text-[rgba(245,237,224,0.60)]">{channelLabel(o.channel)}</td>
                        <td className="px-4 py-3 font-body font-light text-[0.82rem] text-ivory">{o.customer_name}</td>
                        <td className="px-4 py-3 font-body font-light text-[0.78rem] text-[rgba(245,237,224,0.40)]">{o.location ?? "—"}</td>
                        <td className="px-4 py-3 font-display text-ivory whitespace-nowrap" style={{ fontSize: "0.88rem", letterSpacing: "0.03em" }}>{fmt(o.order_total)}</td>
                        <td className="px-4 py-3 font-display text-[rgba(245,237,224,0.55)] whitespace-nowrap" style={{ fontSize: "0.82rem" }}>{fmt(o.amount_paid)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-[3px] font-display text-[0.38rem] tracking-[0.14em] uppercase ${payStatusBadge(o.payment_status)}`}>
                            {o.payment_status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-[rgba(245,237,224,0.25)] text-[0.70rem]">{expandedId === o.id ? "▲" : "▼"}</span>
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(o.id); }}
                              disabled={deleting === o.id}
                              className="text-[rgba(210,90,90,0.45)] hover:text-[rgba(210,90,90,0.75)] text-[0.72rem] transition-colors disabled:opacity-30"
                            >
                              {deleting === o.id ? "…" : "×"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === o.id && (
                        <tr key={`${o.id}-detail`} className="border-b border-[rgba(196,163,115,0.06)] bg-[rgba(196,163,115,0.03)]">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="flex flex-col gap-3">
                              <table className="w-full max-w-xl">
                                <thead>
                                  <tr>
                                    {["Product", "Qty", "Unit Price", "Line Total"].map(h => (
                                      <th key={h} className="pb-1.5 text-left font-display text-[0.38rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.35)]">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {o.offline_sales_items.map(item => (
                                    <tr key={item.id}>
                                      <td className="py-1 pr-6 font-body font-light text-[0.82rem] text-ivory">
                                        {(item.products as { name: string } | null)?.name ?? item.product_id}
                                      </td>
                                      <td className="py-1 pr-6 font-body font-light text-[0.82rem] text-[rgba(245,237,224,0.55)]">{item.quantity}</td>
                                      <td className="py-1 pr-6 font-body font-light text-[0.82rem] text-[rgba(245,237,224,0.55)]">{fmt(item.unit_price)}</td>
                                      <td className="py-1 font-display text-ivory" style={{ fontSize: "0.82rem" }}>{fmt(item.line_total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div className="flex items-center gap-6 flex-wrap font-body font-light text-[0.76rem] text-[rgba(245,237,224,0.40)]">
                                <span>Payment mode: <span className="text-ivory">{o.payment_mode}</span></span>
                                {o.notes && <span>Notes: <span className="text-ivory">{o.notes}</span></span>}
                              </div>

                              {/* Invoice actions */}
                              <div className="flex items-center gap-4 pt-1 border-t border-[rgba(196,163,115,0.08)]">
                                {(() => {
                                  const inv = invoiceNumbers.get(o.id) ?? o.invoice_number;
                                  const generating = invoiceGenerating.has(o.id);
                                  if (inv) {
                                    return (
                                      <>
                                        <span className="font-display text-[0.40rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.45)]">Invoice</span>
                                        <span className="font-display text-brass text-[0.82rem]" style={{ letterSpacing: "0.04em" }}>{inv}</span>
                                        <a
                                          href={`/invoice/offline/${o.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.60)] hover:text-brass border border-[rgba(196,163,115,0.22)] rounded-[3px] px-3 py-1.5 hover:border-[rgba(196,163,115,0.45)] transition-colors"
                                        >
                                          Open / Print &nearr;
                                        </a>
                                      </>
                                    );
                                  }
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => generateInvoice(o.id)}
                                      disabled={generating}
                                      className="font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.60)] hover:text-brass border border-[rgba(196,163,115,0.22)] rounded-[3px] px-3 py-1.5 hover:border-[rgba(196,163,115,0.45)] transition-colors disabled:opacity-40"
                                    >
                                      {generating ? "Generating…" : "Generate Invoice"}
                                    </button>
                                  );
                                })()}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* FORM VIEW */}
      {view === "form" && (
        <form onSubmit={handleSubmit} className="max-w-2xl flex flex-col gap-6">

          <div className="rounded-[6px] border border-[rgba(196,163,115,0.10)] bg-[rgba(255,255,255,0.02)] p-6 flex flex-col gap-5">
            <p className="font-display text-[0.44rem] tracking-[0.20em] uppercase text-[rgba(196,163,115,0.40)]">Sale Details</p>

            <div className="flex gap-4">
              <Field label="Sale Date" half>
                <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} required className={inputCls} />
              </Field>
              <Field label="Channel" half>
                <select value={fChannel} onChange={e => setFChannel(e.target.value)} className={selectCls}>
                  {CHANNELS.map(c => <option key={c.value} value={c.value} style={optStyle}>{c.label}</option>)}
                </select>
              </Field>
            </div>

            <div className="flex gap-4">
              <Field label="Customer / Shop Name" half>
                <input
                  type="text" value={fCustomer} onChange={e => setFCustomer(e.target.value)}
                  placeholder="Name or shop" required className={inputCls}
                />
              </Field>
              <Field label="Location (optional)" half>
                <input
                  type="text" value={fLocation} onChange={e => setFLocation(e.target.value)}
                  placeholder="City, stall name..." className={inputCls}
                />
              </Field>
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-[6px] border border-[rgba(196,163,115,0.10)] bg-[rgba(255,255,255,0.02)] p-6 flex flex-col gap-4">
            <p className="font-display text-[0.44rem] tracking-[0.20em] uppercase text-[rgba(196,163,115,0.40)]">Products</p>

            {lines.map((line, i) => (
              <div key={i} className="flex items-end gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  {i === 0 && <label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.45)]">Product</label>}
                  <select
                    value={line.product_id}
                    onChange={e => selectProduct(i, e.target.value)}
                    className={selectCls}
                    required
                  >
                    <option value="" style={optStyle}>Select product...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} style={optStyle}>{p.name} &mdash; {"₹"}{p.price}</option>
                    ))}
                  </select>
                </div>
                <div className="w-20 flex flex-col gap-1.5">
                  {i === 0 && <label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.45)]">Qty</label>}
                  <input
                    type="number" min={1} value={line.quantity}
                    onChange={e => updateLine(i, { quantity: Number(e.target.value) })}
                    className={inputCls + " text-center"} required
                  />
                </div>
                <div className="w-28 flex flex-col gap-1.5">
                  {i === 0 && <label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.45)]">Unit Price {"₹"}</label>}
                  <input
                    type="number" min={0} step="0.01" value={line.unit_price}
                    onChange={e => updateLine(i, { unit_price: Number(e.target.value) })}
                    className={inputCls} required
                  />
                </div>
                <div className="w-24 flex flex-col gap-1.5">
                  {i === 0 && <label className="font-display text-[0.42rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.45)]">Line Total</label>}
                  <div className="px-3 py-2 text-[0.88rem] text-[rgba(245,237,224,0.50)] font-display" style={{ letterSpacing: "0.03em" }}>
                    {fmt(line.quantity * line.unit_price)}
                  </div>
                </div>
                {lines.length > 1 && (
                  <button
                    type="button" onClick={() => removeLine(i)}
                    className="mb-1.5 text-[rgba(210,90,90,0.45)] hover:text-[rgba(210,90,90,0.75)] text-[0.80rem] transition-colors"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button" onClick={addLine}
                className="font-display text-[0.44rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.55)] hover:text-brass transition-colors"
              >
                + Add Product
              </button>
              <div className="flex items-center gap-2">
                <span className="font-display text-[0.44rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.40)]">Order Total</span>
                <span className="font-display text-brass" style={{ fontSize: "1.05rem", letterSpacing: "0.04em" }}>{fmt(runningTotal)}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-[6px] border border-[rgba(196,163,115,0.10)] bg-[rgba(255,255,255,0.02)] p-6 flex flex-col gap-4">
            <p className="font-display text-[0.44rem] tracking-[0.20em] uppercase text-[rgba(196,163,115,0.40)]">Payment</p>
            <div className="flex gap-4">
              <Field label="Payment Mode" half>
                <select value={fMode} onChange={e => setFMode(e.target.value)} className={selectCls}>
                  {PAYMENT_MODES.map(m => <option key={m.value} value={m.value} style={optStyle}>{m.label}</option>)}
                </select>
              </Field>
              <Field label="Payment Status" half>
                <select value={fStatus} onChange={e => setFStatus(e.target.value)} className={selectCls}>
                  {PAYMENT_STATUSES.map(s => <option key={s.value} value={s.value} style={optStyle}>{s.label}</option>)}
                </select>
              </Field>
            </div>
            {fStatus === "partial" && (
              <Field label="Amount Paid (&#8377;)">
                <input
                  type="number" min={0} step="0.01" value={fAmtPaid}
                  onChange={e => setFAmtPaid(e.target.value)}
                  placeholder="How much was collected?"
                  className={inputCls} required={fStatus === "partial"}
                />
              </Field>
            )}
          </div>

          {/* Notes */}
          <div className="rounded-[6px] border border-[rgba(196,163,115,0.10)] bg-[rgba(255,255,255,0.02)] p-6">
            <Field label="Notes (optional)">
              <textarea
                value={fNotes} onChange={e => setFNotes(e.target.value)}
                rows={3} placeholder="Any extra context..."
                className={inputCls + " resize-none"}
              />
            </Field>
          </div>

          {formErr && (
            <p className="font-body font-light text-[0.82rem] text-[rgba(210,90,90,0.80)]">{formErr}</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-[4px] bg-[rgba(196,163,115,0.14)] border border-[rgba(196,163,115,0.28)] text-brass font-display text-[0.48rem] tracking-[0.18em] uppercase hover:bg-[rgba(196,163,115,0.20)] transition-colors disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save Sale"}
            </button>
            <button
              type="button" onClick={() => { resetForm(); setView("list"); }}
              className="px-6 py-2.5 font-display text-[0.46rem] tracking-[0.16em] uppercase text-[rgba(245,237,224,0.30)] hover:text-[rgba(245,237,224,0.65)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
