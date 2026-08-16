"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

type EmailRow = {
  id: string;
  day_number: number;
  variant: string;
  subject: string;
  preview_text: string;
  body_html: string;
  body_text: string;
};

const VARIANT_ORDER: Record<string, number> = { default: 0, lead: 1, buyer: 2 };

const inputCls =
  "w-full bg-[#1e0c17] border border-[rgba(196,163,115,0.18)] rounded-[4px] px-4 py-3 font-body font-light text-ivory text-sm placeholder:text-[rgba(245,237,224,0.20)] focus:outline-none focus:border-[rgba(196,163,115,0.50)] transition-colors";

function variantBadge(variant: string) {
  if (variant === "default") return null;
  return (
    <span
      className="ml-2 px-2 py-0.5 rounded-[3px] font-display text-[0.38rem] tracking-[0.10em] uppercase"
      style={{
        background: variant === "buyer" ? "rgba(100,200,120,0.15)" : "rgba(120,160,220,0.15)",
        color:      variant === "buyer" ? "#64c878"               : "#78a0dc",
      }}
    >
      {variant}
    </span>
  );
}

export default function SoapOperaPage() {
  const [rows,       setRows]       = useState<EmailRow[]>([]);
  const [drafts,     setDrafts]     = useState<Record<string, EmailRow>>({});
  const [saving,     setSaving]     = useState<Record<string, boolean>>({});
  const [saved,      setSaved]      = useState<Record<string, boolean>>({});
  const [testing,    setTesting]    = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [testEmail,  setTestEmail]  = useState("");
  const [loading,    setLoading]    = useState(true);
  const [token,      setToken]      = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const tk = session.access_token;
      setToken(tk);
      fetch("/api/admin/soap-opera", { headers: { Authorization: `Bearer ${tk}` } })
        .then(r => r.json())
        .then(data => {
          const emails: EmailRow[] = (data.emails ?? []).sort((a: EmailRow, b: EmailRow) =>
            a.day_number !== b.day_number
              ? a.day_number - b.day_number
              : (VARIANT_ORDER[a.variant] ?? 0) - (VARIANT_ORDER[b.variant] ?? 0)
          );
          setRows(emails);
          const init: Record<string, EmailRow> = {};
          emails.forEach(r => { init[r.id] = { ...r }; });
          setDrafts(init);
          setLoading(false);
        });
    });
  }, []);

  function update(id: string, field: keyof EmailRow, value: string) {
    setDrafts(d => ({ ...d, [id]: { ...d[id], [field]: value } }));
    setSaved(s => ({ ...s, [id]: false }));
  }

  async function save(id: string) {
    setSaving(s => ({ ...s, [id]: true }));
    const d = drafts[id];
    const res = await fetch("/api/admin/soap-opera", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, subject: d.subject, preview_text: d.preview_text, body_html: d.body_html, body_text: d.body_text }),
    });
    setSaving(s => ({ ...s, [id]: false }));
    setSaved(s => ({ ...s, [id]: res.ok }));
    setTimeout(() => setSaved(s => ({ ...s, [id]: false })), 2500);
  }

  async function sendTest(id: string) {
    const email = testEmail.trim();
    if (!email) return;
    setTesting(t => ({ ...t, [id]: true }));
    const res  = await fetch("/api/admin/soap-opera", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, test_email: email }),
    });
    const data = await res.json();
    setTestResult(r => ({ ...r, [id]: { ok: res.ok, msg: res.ok ? "Sent!" : (data.error ?? "Failed") } }));
    setTesting(t => ({ ...t, [id]: false }));
    setTimeout(() => setTestResult(r => { const next = { ...r }; delete next[id]; return next; }), 3000);
  }

  return (
    <div className="p-8 min-h-screen" style={{ color: "rgba(245,237,224,0.85)" }}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="font-display text-[0.44rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.45)] mb-1">
            Admin · Email Campaign
          </p>
          <h1 className="font-display text-[1.4rem] tracking-[0.08em] text-brass">Soap Opera</h1>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.30)] text-sm mt-1">
            5-day automated email sequence. Edits take effect on the next cron run.
          </p>
        </div>

        {/* Test email input */}
        <div className="mb-8 p-5 bg-[rgba(196,163,115,0.04)] border border-[rgba(196,163,115,0.12)] rounded-[4px]">
          <p className="font-display text-[0.42rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.50)] mb-3">
            Test Recipient
          </p>
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="your@email.com"
            className={inputCls + " max-w-sm"}
          />
          <p className="mt-2 font-body text-[0.68rem] text-[rgba(245,237,224,0.22)]">
            Used by all &ldquo;Send Test&rdquo; buttons below. Subject will be prefixed with [TEST].
          </p>
        </div>

        {/* Email cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {rows.map(row => {
              const draft = drafts[row.id] ?? row;
              return (
                <div
                  key={row.id}
                  className="border border-[rgba(196,163,115,0.14)] rounded-[4px] overflow-hidden"
                >
                  {/* Card header */}
                  <div className="px-6 py-4 bg-[rgba(196,163,115,0.05)] border-b border-[rgba(196,163,115,0.10)] flex items-center gap-2">
                    <span className="font-display text-[0.60rem] tracking-[0.18em] uppercase text-brass">
                      Day {row.day_number}
                    </span>
                    {variantBadge(row.variant)}
                  </div>

                  {/* Fields */}
                  <div className="px-6 py-5 flex flex-col gap-4">

                    {/* Subject */}
                    <div>
                      <label className="block font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.45)] mb-1.5">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={draft.subject}
                        onChange={e => update(row.id, "subject", e.target.value)}
                        className={inputCls}
                      />
                    </div>

                    {/* Preview text */}
                    <div>
                      <label className="block font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.45)] mb-1.5">
                        Preview Text
                        <span className="ml-2 normal-case tracking-normal text-[rgba(245,237,224,0.22)]">
                          (shown in inbox before opening)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={draft.preview_text}
                        onChange={e => update(row.id, "preview_text", e.target.value)}
                        className={inputCls}
                      />
                    </div>

                    {/* Body HTML */}
                    <div>
                      <label className="block font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.45)] mb-1.5">
                        Body HTML
                        <span className="ml-2 normal-case tracking-normal text-[rgba(245,237,224,0.22)]">
                          use {"{{"} name {"}}"}  as placeholder
                        </span>
                      </label>
                      <textarea
                        value={draft.body_html}
                        onChange={e => update(row.id, "body_html", e.target.value)}
                        rows={14}
                        className={inputCls + " resize-y font-mono text-xs leading-relaxed"}
                      />
                    </div>

                    {/* Body Text */}
                    <div>
                      <label className="block font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.45)] mb-1.5">
                        Body Text
                        <span className="ml-2 normal-case tracking-normal text-[rgba(245,237,224,0.22)]">
                          plain-text fallback · use {"{{"} name {"}}"}  and {"{{"} unsub_url {"}}"}
                        </span>
                      </label>
                      <textarea
                        value={draft.body_text}
                        onChange={e => update(row.id, "body_text", e.target.value)}
                        rows={6}
                        className={inputCls + " resize-y font-mono text-xs leading-relaxed"}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => save(row.id)}
                        disabled={saving[row.id]}
                        className="font-display text-[0.50rem] tracking-[0.16em] uppercase px-6 py-2.5 rounded-[3px] bg-[rgba(196,163,115,0.12)] border border-[rgba(196,163,115,0.30)] text-brass hover:bg-[rgba(196,163,115,0.20)] transition-all duration-150 disabled:opacity-40"
                      >
                        {saving[row.id] ? "Saving…" : saved[row.id] ? "Saved ✓" : "Save"}
                      </button>

                      <button
                        onClick={() => sendTest(row.id)}
                        disabled={testing[row.id] || !testEmail.trim()}
                        className="font-display text-[0.50rem] tracking-[0.16em] uppercase px-6 py-2.5 rounded-[3px] border border-[rgba(196,163,115,0.18)] text-[rgba(196,163,115,0.55)] hover:border-[rgba(196,163,115,0.40)] hover:text-brass transition-all duration-150 disabled:opacity-30"
                      >
                        {testing[row.id] ? "Sending…" : "Send Test"}
                      </button>

                      {testResult[row.id] && (
                        <span
                          className="font-body text-[0.72rem] italic"
                          style={{ color: testResult[row.id].ok ? "#64c878" : "rgba(210,90,90,0.75)" }}
                        >
                          {testResult[row.id].msg}
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
