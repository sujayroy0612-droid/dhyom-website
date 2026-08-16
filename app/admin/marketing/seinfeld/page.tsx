"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

type Broadcast = {
  id: string;
  subject: string;
  audience: string;
  recipient_count: number;
  status: string;
  sent_at: string | null;
  created_at: string;
};

const AUDIENCE_LABELS: Record<string, string> = {
  all_warm:   "All warm",
  non_buyers: "Non-buyers",
  buyers:     "Buyers only",
};

const inputCls =
  "w-full bg-[#1e0c17] border border-[rgba(196,163,115,0.18)] rounded-[4px] px-4 py-3 font-body font-light text-ivory text-sm placeholder:text-[rgba(245,237,224,0.20)] focus:outline-none focus:border-[rgba(196,163,115,0.50)] transition-colors";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function SeinfeldPage() {
  const [subject,      setSubject]      = useState("");
  const [previewText,  setPreviewText]  = useState("");
  const [bodyHtml,     setBodyHtml]     = useState("");
  const [audience,     setAudience]     = useState("all_warm");
  const [count,        setCount]        = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [testEmail,    setTestEmail]    = useState("");
  const [testing,      setTesting]      = useState(false);
  const [testResult,   setTestResult]   = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirming,   setConfirming]   = useState(false);
  const [sending,      setSending]      = useState(false);
  const [sendResult,   setSendResult]   = useState<{ sent: number; errors: string[] } | null>(null);
  const [broadcasts,   setBroadcasts]   = useState<Broadcast[]>([]);
  const [listLoading,  setListLoading]  = useState(true);
  const [token,        setToken]        = useState("");

  // Load session + past broadcasts
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const tk = session.access_token;
      setToken(tk);
      fetch("/api/admin/seinfeld", { headers: { Authorization: `Bearer ${tk}` } })
        .then(r => r.json())
        .then(d => { setBroadcasts(d.broadcasts ?? []); setListLoading(false); });
    });
  }, []);

  // Live recipient count when audience changes
  const fetchCount = useCallback(async (aud: string, tk: string) => {
    if (!tk) return;
    setCountLoading(true);
    const res  = await fetch(`/api/admin/seinfeld?count=1&audience=${aud}`, {
      headers: { Authorization: `Bearer ${tk}` },
    });
    const data = await res.json();
    setCount(data.count ?? null);
    setCountLoading(false);
  }, []);

  useEffect(() => { if (token) fetchCount(audience, token); }, [audience, token, fetchCount]);

  async function sendTest() {
    if (!testEmail.trim()) return;
    setTesting(true);
    setTestResult(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setTesting(false); return; }
    const res  = await fetch("/api/admin/seinfeld", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body:    JSON.stringify({ action: "test", subject, preview_text: previewText, body_html: bodyHtml, test_email: testEmail }),
    });
    const data = await res.json();
    setTestResult({ ok: res.ok, msg: res.ok ? "Sent!" : (data.error ?? "Failed") });
    setTesting(false);
    setTimeout(() => setTestResult(null), 3000);
  }

  async function confirmSend() {
    setSending(true);
    setSendResult(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSending(false); return; }
    const res  = await fetch("/api/admin/seinfeld", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body:    JSON.stringify({ action: "broadcast", subject, preview_text: previewText, body_html: bodyHtml, audience }),
    });
    const data = await res.json();
    setSending(false);
    setConfirming(false);
    setSendResult({ sent: data.sent ?? 0, errors: data.errors ?? [] });
    if (res.ok) {
      // Refresh list
      fetch("/api/admin/seinfeld", { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json()).then(d => setBroadcasts(d.broadcasts ?? []));
      // Clear form on clean send
      if (!(data.errors ?? []).length) {
        setSubject(""); setPreviewText(""); setBodyHtml("");
      }
    }
  }

  const canSend = subject.trim() && bodyHtml.trim() && !sending;

  return (
    <div className="p-8 min-h-screen" style={{ color: "rgba(245,237,224,0.85)" }}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="font-display text-[0.44rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.45)] mb-1">
            Admin · Email Campaign
          </p>
          <h1 className="font-display text-[1.4rem] tracking-[0.08em] text-brass">Seinfeld</h1>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.30)] text-sm mt-1">
            One-off story emails broadcast to your warm list. Write once, send to everyone.
          </p>
        </div>

        {/* ── Compose card ── */}
        <div className="border border-[rgba(196,163,115,0.14)] rounded-[4px] overflow-hidden mb-10">
          <div className="px-6 py-4 bg-[rgba(196,163,115,0.05)] border-b border-[rgba(196,163,115,0.10)]">
            <span className="font-display text-[0.52rem] tracking-[0.18em] uppercase text-brass">
              New Broadcast
            </span>
          </div>

          <div className="px-6 py-5 flex flex-col gap-5">

            {/* Subject */}
            <div>
              <label className="block font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.45)] mb-1.5">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Why your home smells like everyone else's..."
                className={inputCls}
              />
            </div>

            {/* Preview text */}
            <div>
              <label className="block font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.45)] mb-1.5">
                Preview Text
                <span className="ml-2 normal-case tracking-normal font-body text-[rgba(245,237,224,0.22)]">
                  shown in inbox before opening
                </span>
              </label>
              <input
                type="text"
                value={previewText}
                onChange={e => setPreviewText(e.target.value)}
                placeholder="The candle industry's worst kept secret..."
                className={inputCls}
              />
            </div>

            {/* Body HTML */}
            <div>
              <label className="block font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.45)] mb-1.5">
                Body HTML
                <span className="ml-2 normal-case tracking-normal font-body text-[rgba(245,237,224,0.22)]">
                  inner content only · {"{{"} name {"}}"}  → recipient name, falls back to &ldquo;there&rdquo;
                </span>
              </label>
              <textarea
                value={bodyHtml}
                onChange={e => setBodyHtml(e.target.value)}
                rows={16}
                placeholder={`<p style="margin:0 0 18px;font-style:italic;font-size:17px;line-height:1.85;color:rgba(245,237,224,0.78);font-weight:300;">Hi {{name}},</p>\n<p style="margin:0 0 18px;font-style:italic;font-size:17px;line-height:1.85;color:rgba(245,237,224,0.78);font-weight:300;">Your story here...</p>`}
                className={inputCls + " resize-y font-mono text-xs leading-relaxed"}
              />
            </div>

            {/* Audience + live count */}
            <div>
              <label className="block font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.45)] mb-1.5">
                Audience
              </label>
              <select
                value={audience}
                onChange={e => setAudience(e.target.value)}
                className={inputCls + " max-w-sm"}
              >
                <option value="all_warm">All warm contacts (buyers + non-buyers)</option>
                <option value="non_buyers">Non-buyers only</option>
                <option value="buyers">Buyers only</option>
              </select>
              <p className="mt-2 font-body text-[0.75rem] text-[rgba(196,163,115,0.55)]">
                {countLoading
                  ? "Counting…"
                  : count !== null
                    ? `This will reach ${count} unique contact${count !== 1 ? "s" : ""}. Unsubscribed are always excluded.`
                    : ""}
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-[rgba(196,163,115,0.10)]" />

            {/* Test send */}
            <div>
              <label className="block font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.45)] mb-1.5">
                Send Test
                <span className="ml-2 normal-case tracking-normal font-body text-[rgba(245,237,224,0.22)]">
                  sends to one address only · subject prefixed [TEST]
                </span>
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={inputCls + " max-w-xs"}
                />
                <button
                  onClick={sendTest}
                  disabled={testing || !testEmail.trim() || !subject.trim() || !bodyHtml.trim()}
                  className="font-display text-[0.50rem] tracking-[0.16em] uppercase px-5 py-2.5 rounded-[3px] border border-[rgba(196,163,115,0.22)] text-[rgba(196,163,115,0.55)] hover:border-[rgba(196,163,115,0.45)] hover:text-brass transition-all duration-150 disabled:opacity-30 whitespace-nowrap"
                >
                  {testing ? "Sending…" : "Send Test"}
                </button>
                {testResult && (
                  <span
                    className="font-body text-[0.72rem] italic"
                    style={{ color: testResult.ok ? "#64c878" : "rgba(210,90,90,0.75)" }}
                  >
                    {testResult.msg}
                  </span>
                )}
              </div>
            </div>

            {/* Send result banner */}
            {sendResult && (
              <div
                className="px-4 py-3 rounded-[4px] border"
                style={{
                  background:   sendResult.errors.length === 0 ? "rgba(100,200,120,0.07)" : "rgba(200,80,80,0.07)",
                  borderColor:  sendResult.errors.length === 0 ? "rgba(100,200,120,0.25)" : "rgba(200,80,80,0.25)",
                }}
              >
                <p
                  className="font-display text-[0.46rem] tracking-[0.14em] uppercase mb-1"
                  style={{ color: sendResult.errors.length === 0 ? "#64c878" : "rgba(210,90,90,0.75)" }}
                >
                  {sendResult.errors.length === 0
                    ? `Sent to ${sendResult.sent} contacts`
                    : `Sent ${sendResult.sent} · ${sendResult.errors.length} batch error${sendResult.errors.length !== 1 ? "s" : ""}`}
                </p>
                {sendResult.errors.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {sendResult.errors.map((e, i) => (
                      <li key={i} className="font-mono text-[0.65rem] text-[rgba(210,90,90,0.65)] break-all">{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Send broadcast button / confirmation */}
            {!confirming ? (
              <div>
                <button
                  onClick={() => { setSendResult(null); setConfirming(true); }}
                  disabled={!canSend}
                  className="font-display text-[0.52rem] tracking-[0.18em] uppercase px-8 py-3 rounded-[3px] bg-[rgba(196,163,115,0.12)] border border-[rgba(196,163,115,0.35)] text-brass hover:bg-[rgba(196,163,115,0.20)] transition-all duration-150 disabled:opacity-30"
                >
                  Send Broadcast
                </button>
              </div>
            ) : (
              <div className="p-5 bg-[rgba(196,163,115,0.05)] border border-[rgba(196,163,115,0.25)] rounded-[4px]">
                <p className="font-display text-[0.50rem] tracking-[0.14em] uppercase text-brass mb-2">
                  Confirm broadcast
                </p>
                <p className="font-body text-[0.84rem] text-[rgba(245,237,224,0.58)] mb-5 leading-relaxed">
                  Send to{" "}
                  <strong className="text-ivory font-body">
                    {countLoading ? "…" : count ?? "?"} unique contact{count !== 1 ? "s" : ""}
                  </strong>
                  ? This cannot be undone.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={confirmSend}
                    disabled={sending}
                    className="font-display text-[0.50rem] tracking-[0.18em] uppercase px-6 py-2.5 rounded-[3px] bg-[rgba(196,163,115,0.15)] border border-[rgba(196,163,115,0.40)] text-brass hover:bg-[rgba(196,163,115,0.25)] transition-all duration-150 disabled:opacity-40"
                  >
                    {sending ? "Sending…" : "Confirm Send"}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={sending}
                    className="font-display text-[0.48rem] tracking-[0.14em] uppercase px-5 py-2.5 rounded-[3px] border border-[rgba(196,163,115,0.15)] text-[rgba(196,163,115,0.40)] hover:text-brass hover:border-[rgba(196,163,115,0.30)] transition-colors disabled:opacity-30"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── Past broadcasts ── */}
        <div>
          <p className="font-display text-[0.44rem] tracking-[0.20em] uppercase text-[rgba(196,163,115,0.38)] mb-4">
            Past Broadcasts
          </p>

          {listLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-4 h-4 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
            </div>
          ) : broadcasts.length === 0 ? (
            <p className="font-body font-light italic text-[rgba(245,237,224,0.22)] text-sm">
              No broadcasts sent yet.
            </p>
          ) : (
            <div className="border border-[rgba(196,163,115,0.12)] rounded-[4px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[0.82rem]">
                  <thead>
                    <tr className="border-b border-[rgba(196,163,115,0.10)] bg-[rgba(196,163,115,0.04)]">
                      {["Subject", "Audience", "Sent to", "Date", "Status"].map(h => (
                        <th
                          key={h}
                          className="px-4 py-3 font-display text-[0.38rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.45)] text-left whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {broadcasts.map((b, i) => (
                      <tr
                        key={b.id}
                        className={[
                          "border-b border-[rgba(196,163,115,0.06)]",
                          i % 2 !== 0 ? "bg-[rgba(0,0,0,0.08)]" : "",
                        ].join(" ")}
                      >
                        <td className="px-4 py-3 text-[rgba(245,237,224,0.75)] max-w-[200px] truncate">
                          {b.subject}
                        </td>
                        <td className="px-4 py-3 text-[rgba(245,237,224,0.38)] whitespace-nowrap">
                          {AUDIENCE_LABELS[b.audience] ?? b.audience}
                        </td>
                        <td className="px-4 py-3 font-display text-brass text-[0.78rem]">
                          {b.recipient_count}
                        </td>
                        <td className="px-4 py-3 text-[rgba(245,237,224,0.35)] whitespace-nowrap">
                          {fmt(b.sent_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="font-display text-[0.38rem] tracking-[0.10em] uppercase px-2 py-0.5 rounded-[2px]"
                            style={{
                              background: b.status === "sent" ? "rgba(100,200,120,0.12)" : "rgba(196,163,115,0.10)",
                              color:      b.status === "sent" ? "#64c878"               : "rgba(196,163,115,0.55)",
                            }}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
