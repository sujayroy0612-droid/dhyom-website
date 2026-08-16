"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  campaign_tag: string | null;
  usage_limit: number | null;
  times_used: number;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
  created_at: string;
}

const BLANK_FORM = {
  code: "",
  discount_type: "percentage" as "percentage" | "fixed",
  discount_value: "",
  campaign_tag: "",
  usage_limit: "",
  valid_until: "",
};

export default function CouponsPage() {
  const [coupons,    setCoupons]    = useState<Coupon[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tableError, setTableError] = useState(false);
  const [form,       setForm]       = useState(BLANK_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState("");
  const [toggling,   setToggling]   = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.from("coupons").select("*").order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setTableError(true);
          setFormError(`${error.message} [code: ${(error as { code?: string }).code ?? "none"}]`);
        } else {
          setCoupons((data ?? []) as Coupon[]);
        }
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.code.trim()) { setFormError("Code is required."); return; }
    if (!form.discount_value || Number(form.discount_value) <= 0) { setFormError("Enter a valid discount value."); return; }
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      campaign_tag: form.campaign_tag.trim() || null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      valid_until: form.valid_until || null,
      active: true,
      times_used: 0,
    };
    const { data, error } = await supabase.from("coupons").insert(payload).select().single();
    if (error) {
      setFormError(error.message);
    } else {
      setCoupons(prev => [data as Coupon, ...prev]);
      setForm(BLANK_FORM);
    }
    setSaving(false);
  }

  async function toggleActive(coupon: Coupon) {
    setToggling(p => ({ ...p, [coupon.id]: true }));
    await supabase.from("coupons").update({ active: !coupon.active }).eq("id", coupon.id);
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, active: !c.active } : c));
    setToggling(p => ({ ...p, [coupon.id]: false }));
  }

  if (tableError) {
    return (
      <div className="px-8 pt-8 pb-16">
        <p className="font-display text-[0.44rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.35)] mb-1">Management</p>
        <h1 className="font-display text-ivory mb-8" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>Coupons</h1>
        <div className="bg-[#1e0c17] border border-[rgba(200,80,80,0.20)] rounded-[6px] px-6 py-7 max-w-2xl">
          <p className="font-display text-[rgba(200,80,80,0.75)] mb-4" style={{ fontSize: "0.82rem", letterSpacing: "0.06em" }}>
            The coupons table does not exist yet.
          </p>
          <p className="font-body font-light text-[rgba(245,237,224,0.45)] text-sm mb-5 leading-relaxed">
            Run this SQL in your Supabase dashboard (SQL Editor):
          </p>
          <pre className="bg-[#12060e] border border-[rgba(196,163,115,0.12)] rounded-[4px] px-5 py-4 font-mono text-[0.70rem] text-[rgba(196,163,115,0.70)] leading-relaxed overflow-x-auto whitespace-pre">
{`create table coupons (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  discount_type  text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(10,2) not null,
  campaign_tag   text,
  usage_limit    int,
  times_used     int not null default 0,
  valid_from     timestamptz default now(),
  valid_until    timestamptz,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table coupons enable row level security;
create policy "service role full access" on coupons using (true) with check (true);`}
          </pre>
          {formError && (
            <p className="font-mono text-[rgba(200,80,80,0.70)] text-xs mt-4 break-all">
              Raw error: {formError}
            </p>
          )}
          <p className="font-body font-light italic text-[rgba(245,237,224,0.28)] text-xs mt-4">
            After running the SQL, refresh this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 pt-8 pb-16">
      <div className="mb-6">
        <p className="font-display text-[0.44rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.35)] mb-1">Management</p>
        <h1 className="font-display text-ivory" style={{ fontSize: "1.5rem", letterSpacing: "0.06em" }}>Coupons</h1>
      </div>

      {/* Add coupon form */}
      <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] px-6 py-6 mb-6 max-w-2xl">
        <p className="font-display text-ivory mb-5" style={{ fontSize: "0.80rem", letterSpacing: "0.08em" }}>New Coupon</p>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <Field label="Code">
            <input
              type="text"
              placeholder="FIRST10"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="Campaign Tag">
            <input
              type="text"
              placeholder="first-order, referral…"
              value={form.campaign_tag}
              onChange={e => setForm(f => ({ ...f, campaign_tag: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="Discount Type">
            <select
              value={form.discount_type}
              onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as "percentage" | "fixed" }))}
              className={inputCls}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed (₹)</option>
            </select>
          </Field>
          <Field label={`Discount Value (${form.discount_type === "percentage" ? "%" : "₹"})`}>
            <input
              type="number"
              min="1"
              placeholder={form.discount_type === "percentage" ? "10" : "100"}
              value={form.discount_value}
              onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="Usage Limit (optional)">
            <input
              type="number"
              min="1"
              placeholder="Unlimited"
              value={form.usage_limit}
              onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="Expiry Date (optional)">
            <input
              type="date"
              value={form.valid_until}
              onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
              className={inputCls}
            />
          </Field>

          {formError && (
            <p className="col-span-2 font-body font-light text-[rgba(200,80,80,0.75)] text-xs">{formError}</p>
          )}

          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="font-display text-[0.48rem] tracking-[0.18em] uppercase bg-brass text-ink rounded-[4px] px-5 py-2.5 hover:bg-[#d4b383] transition-colors disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create Coupon"}
            </button>
          </div>
        </form>
      </div>

      {/* Coupon list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
        </div>
      ) : coupons.length === 0 ? (
        <p className="font-body font-light italic text-[rgba(245,237,224,0.28)] text-sm">No coupons yet.</p>
      ) : (
        <div className="bg-[#1e0c17] border border-[rgba(196,163,115,0.12)] rounded-[6px] overflow-hidden">
          <div className="hidden md:grid grid-cols-[120px_1fr_120px_100px_100px_80px_80px] gap-3 px-5 py-3 border-b border-[rgba(196,163,115,0.08)]">
            {["Code", "Campaign", "Discount", "Used / Limit", "Expires", "Active", ""].map(h => (
              <span key={h} className="font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.35)]">{h}</span>
            ))}
          </div>
          <div className="divide-y divide-[rgba(196,163,115,0.06)]">
            {coupons.map(c => (
              <div key={c.id} className="grid grid-cols-1 md:grid-cols-[120px_1fr_120px_100px_100px_80px_80px] gap-2 md:gap-3 items-center px-5 py-3.5">
                <span className="font-display text-ivory" style={{ fontSize: "0.78rem", letterSpacing: "0.08em" }}>{c.code}</span>
                <span className="font-body font-light text-[rgba(245,237,224,0.38)] text-xs">{c.campaign_tag ?? "—"}</span>
                <span className="font-display text-brass text-[0.78rem]">
                  {c.discount_type === "percentage" ? `${c.discount_value}%` : `₹${c.discount_value}`}
                </span>
                <span className="font-body font-light text-[rgba(245,237,224,0.42)] text-xs">
                  {c.times_used} / {c.usage_limit ?? "∞"}
                </span>
                <span className="font-body font-light text-[rgba(245,237,224,0.35)] text-xs">
                  {c.valid_until ? new Date(c.valid_until).toLocaleDateString("en-IN") : "—"}
                </span>
                <span className={`font-display text-[0.42rem] tracking-[0.12em] uppercase ${c.active ? "text-[rgba(80,200,120,0.75)]" : "text-[rgba(200,80,80,0.55)]"}`}>
                  {c.active ? "On" : "Off"}
                </span>
                <button
                  disabled={toggling[c.id]}
                  onClick={() => toggleActive(c)}
                  className="font-display text-[0.42rem] tracking-[0.12em] uppercase px-2.5 py-1.5 border border-[rgba(196,163,115,0.22)] rounded-[3px] text-[rgba(196,163,115,0.50)] hover:text-brass hover:border-[rgba(196,163,115,0.40)] disabled:opacity-30 transition-colors"
                >
                  {toggling[c.id] ? "…" : c.active ? "Disable" : "Enable"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "bg-[#12060e] border border-[rgba(196,163,115,0.18)] rounded-[4px] px-3 py-2.5 font-body font-light text-ivory text-sm placeholder:text-[rgba(245,237,224,0.20)] focus:outline-none focus:border-[rgba(196,163,115,0.45)] w-full transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-display text-[0.42rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.45)]">{label}</label>
      {children}
    </div>
  );
}
