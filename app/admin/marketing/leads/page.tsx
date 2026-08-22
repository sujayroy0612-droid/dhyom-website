"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

type Lead = {
  id: string;
  email: string;
  name: string | null;
  tag: string;
  message: string | null;
  captured_at: string | null;
  sequence_day_sent: number;
  last_email_sent_at: string | null;
  unsubscribed: boolean;
  campaign_id: string | null;
  campaigns: { title: string } | null;
  seinfeld_count: number;
  seinfeld_last_sent: string | null;
};

type Stats = {
  total: number;
  buyer: number;
  reel_lead: number;
  newsletter: number;
  checkout_lead: number;
  inquiry: number;
  unsubscribed: number;
};

type Campaign = { id: string; title: string };

const TAG_BG: Record<string, string> = {
  buyer:         "rgba(100,200,120,0.18)",
  checkout_lead: "rgba(196,163,115,0.18)",
  reel_lead:     "rgba(120,160,220,0.18)",
  newsletter:    "rgba(180,120,220,0.18)",
  inquiry:       "rgba(245,237,224,0.08)",
};
const TAG_FG: Record<string, string> = {
  buyer:         "#64c878",
  checkout_lead: "#C4A373",
  reel_lead:     "#78a0dc",
  newsletter:    "#b478dc",
  inquiry:       "rgba(245,237,224,0.50)",
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

function fmtShort(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function LeadsPage() {
  const [leads,          setLeads]          = useState<Lead[]>([]);
  const [stats,          setStats]          = useState<Stats | null>(null);
  const [campaigns,      setCampaigns]      = useState<Campaign[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [tagFilter,      setTagFilter]      = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [search,         setSearch]         = useState("");
  const [deleting,       setDeleting]       = useState<string | null>(null);
  const [openMsg,        setOpenMsg]        = useState<Lead | null>(null);

  const fetchLeads = useCallback(async (tag: string, campaign_id: string, q: string) => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const params = new URLSearchParams();
    if (tag)         params.set("tag",         tag);
    if (campaign_id) params.set("campaign_id", campaign_id);
    if (q)           params.set("search",      q);

    const res  = await fetch(`/api/admin/leads?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setLeads(data.leads  ?? []);
    setStats(data.stats  ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.from("campaigns").select("id, title").order("title").then(({ data }) => {
      setCampaigns(data ?? []);
    });
    fetchLeads("", "", "");
  }, [fetchLeads]);

  function apply(tag: string, campaign: string, q: string) {
    setTagFilter(tag);
    setCampaignFilter(campaign);
    setSearch(q);
    fetchLeads(tag, campaign, q);
  }

  async function deleteLead(id: string) {
    if (!window.confirm("Delete this lead permanently?")) return;
    setDeleting(id);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setDeleting(null); return; }
    await fetch("/api/admin/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id }),
    });
    setLeads(prev => prev.filter(l => l.id !== id));
    setDeleting(null);
  }

  function exportCSV() {
    const headers = ["Email", "Name", "Tag", "Campaign", "Captured", "Soap Day", "Last Email", "Unsubscribed", "Seinfeld Sends", "Seinfeld Last Sent"];
    const rows = leads.map(l => [
      l.email,
      l.name ?? "",
      l.tag,
      l.campaigns?.title ?? "",
      fmt(l.captured_at),
      String(l.sequence_day_sent),
      fmt(l.last_email_sent_at),
      l.unsubscribed ? "Yes" : "No",
      String(l.seinfeld_count),
      fmtShort(l.seinfeld_last_sent),
    ]);
    const csv  = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `dhyom-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasFilter = tagFilter || campaignFilter || search;

  return (
    <div className="p-8 min-h-screen" style={{ color: "rgba(245,237,224,0.85)" }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="font-display text-[0.44rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.45)] mb-1">Admin</p>
            <h1 className="font-display text-[1.4rem] tracking-[0.08em] text-brass">Leads</h1>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: "Total",        value: stats.total },
              { label: "Buyers",       value: stats.buyer },
              { label: "Leads",        value: stats.reel_lead + stats.newsletter + stats.checkout_lead },
              { label: "Unsubscribed", value: stats.unsubscribed },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-[rgba(196,163,115,0.05)] border border-[rgba(196,163,115,0.12)] rounded-[4px] px-5 py-4"
              >
                <p className="font-display text-[0.40rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.45)] mb-1">{label}</p>
                <p className="font-display text-[1.7rem] text-brass leading-none">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tag breakdown */}
        {stats && (
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { tag: "buyer",         count: stats.buyer         },
              { tag: "checkout_lead", count: stats.checkout_lead },
              { tag: "reel_lead",     count: stats.reel_lead     },
              { tag: "newsletter",    count: stats.newsletter     },
              { tag: "inquiry",       count: stats.inquiry        },
            ].map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => apply(tagFilter === tag ? "" : tag, campaignFilter, search)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-[3px] border transition-all duration-150"
                style={{
                  background: tagFilter === tag ? TAG_BG[tag] : "transparent",
                  borderColor: tagFilter === tag ? TAG_FG[tag] + "55" : "rgba(196,163,115,0.15)",
                }}
              >
                <span className="font-display text-[0.38rem] tracking-[0.12em] uppercase" style={{ color: TAG_FG[tag] }}>
                  {tag.replace("_", " ")}
                </span>
                <span className="font-display text-[0.60rem]" style={{ color: TAG_FG[tag] + "99" }}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Filters + Download */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search email…"
            value={search}
            onChange={e => apply(tagFilter, campaignFilter, e.target.value)}
            className="bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.20)] rounded-[3px] px-3 py-2 text-[0.82rem] text-ivory placeholder:text-[rgba(245,237,224,0.20)] focus:outline-none focus:border-[rgba(196,163,115,0.40)] w-52"
          />
          <select
            value={campaignFilter}
            onChange={e => apply(tagFilter, e.target.value, search)}
            className="bg-[#1a0a12] border border-[rgba(196,163,115,0.20)] rounded-[3px] px-3 py-2 text-[0.82rem] text-[rgba(245,237,224,0.65)] focus:outline-none focus:border-[rgba(196,163,115,0.40)]"
          >
            <option value="">All Campaigns</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          {hasFilter && (
            <button
              onClick={() => apply("", "", "")}
              className="font-display text-[0.46rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.40)] hover:text-brass transition-colors"
            >
              Clear filters
            </button>
          )}
          <button
            onClick={exportCSV}
            className="ml-auto font-display text-[0.50rem] tracking-[0.16em] uppercase px-5 py-2 rounded-[3px] border border-[rgba(196,163,115,0.28)] text-[rgba(196,163,115,0.65)] hover:border-brass hover:text-brass transition-all duration-150"
          >
            Download CSV
          </button>
        </div>

        {/* Table */}
        <div className="border border-[rgba(196,163,115,0.12)] rounded-[4px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[0.82rem]">
              <thead>
                <tr className="border-b border-[rgba(196,163,115,0.10)] bg-[rgba(196,163,115,0.04)]">
                  {["Email", "Tag", "Campaign", "Captured", "Soap Day", "Seinfeld", ""].map((h, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 font-display text-[0.38rem] tracking-[0.15em] uppercase text-[rgba(196,163,115,0.45)] ${i === 0 ? "text-left" : i === 6 ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-[rgba(245,237,224,0.22)] italic text-[0.85rem]">
                      Loading…
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-[rgba(245,237,224,0.22)] italic text-[0.85rem]">
                      No leads found.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead, i) => (
                    <tr
                      key={lead.id}
                      className={[
                        "border-b border-[rgba(196,163,115,0.06)] hover:bg-[rgba(196,163,115,0.03)] transition-colors",
                        i % 2 !== 0 ? "bg-[rgba(0,0,0,0.10)]" : "",
                      ].join(" ")}
                    >
                      {/* Email */}
                      <td className="px-4 py-3">
                        <span className="text-[rgba(245,237,224,0.78)]">{lead.email}</span>
                        {lead.unsubscribed && (
                          <span className="ml-2 px-1.5 py-0.5 rounded-[2px] font-display text-[0.34rem] tracking-[0.10em] uppercase bg-[rgba(210,90,90,0.14)] text-[rgba(210,90,90,0.65)]">
                            unsub
                          </span>
                        )}
                      </td>

                      {/* Tag */}
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-[3px] font-display text-[0.36rem] tracking-[0.10em] uppercase whitespace-nowrap"
                          style={{ background: TAG_BG[lead.tag] ?? "rgba(245,237,224,0.06)", color: TAG_FG[lead.tag] ?? "rgba(245,237,224,0.50)" }}
                        >
                          {lead.tag.replace("_", " ")}
                        </span>
                      </td>

                      {/* Campaign */}
                      <td className="px-4 py-3 text-[rgba(245,237,224,0.38)]">
                        {lead.campaigns?.title ?? "—"}
                      </td>

                      {/* Captured */}
                      <td className="px-4 py-3 text-[rgba(245,237,224,0.35)] whitespace-nowrap">
                        {fmt(lead.captured_at)}
                      </td>

                      {/* Soap Day */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(d => (
                              <div
                                key={d}
                                className="w-2 h-2 rounded-[1px]"
                                style={{
                                  background: d <= lead.sequence_day_sent
                                    ? "rgba(196,163,115,0.60)"
                                    : "rgba(196,163,115,0.12)",
                                }}
                              />
                            ))}
                          </div>
                          <span className="font-display text-[0.58rem] text-[rgba(196,163,115,0.40)]">
                            {lead.sequence_day_sent}/5
                          </span>
                        </div>
                      </td>

                      {/* Seinfeld */}
                      <td className="px-4 py-3 whitespace-nowrap text-[rgba(245,237,224,0.38)] text-[0.78rem]">
                        {lead.seinfeld_count > 0
                          ? `${lead.seinfeld_count} · last ${fmtShort(lead.seinfeld_last_sent)}`
                          : "—"
                        }
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {lead.message && (
                            <button
                              onClick={() => setOpenMsg(lead)}
                              title="View message"
                              className="text-[rgba(196,163,115,0.40)] hover:text-brass transition-colors leading-none"
                            >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="3" width="14" height="10" rx="1.5" />
                                <path d="M1 5l7 5 7-5" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => deleteLead(lead.id)}
                            disabled={deleting === lead.id}
                            title="Delete lead"
                            className="text-[rgba(210,90,90,0.35)] hover:text-[rgba(210,90,90,0.70)] transition-colors text-base leading-none disabled:opacity-20"
                          >
                            {deleting === lead.id ? "···" : "×"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && leads.length > 0 && (
          <p className="mt-3 text-[0.70rem] text-[rgba(245,237,224,0.18)]">
            Showing {leads.length} lead{leads.length !== 1 ? "s" : ""}
            {hasFilter ? " (filtered)" : ""}
          </p>
        )}

      </div>

      {/* Message modal */}
      {openMsg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(10,2,8,0.82)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpenMsg(null)}
        >
          <div
            className="relative w-full max-w-lg bg-[#1a0812] border border-[rgba(196,163,115,0.18)] rounded-[6px] p-8 flex flex-col gap-5"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setOpenMsg(null)}
              className="absolute top-4 right-4 text-[rgba(245,237,224,0.30)] hover:text-ivory transition-colors text-lg leading-none"
            >
              ×
            </button>

            {/* Meta */}
            <div>
              <p className="font-display text-[0.40rem] tracking-[0.20em] uppercase text-[rgba(196,163,115,0.42)] mb-2">Inquiry Message</p>
              <p className="font-display text-ivory" style={{ fontSize: "0.82rem", letterSpacing: "0.06em" }}>{openMsg.email}</p>
              {openMsg.name && (
                <p className="font-body font-light text-[rgba(245,237,224,0.45)] text-[0.80rem] mt-0.5">{openMsg.name}</p>
              )}
              <p className="font-body font-light text-[rgba(245,237,224,0.28)] text-[0.72rem] mt-1">{fmt(openMsg.captured_at)}</p>
            </div>

            <div className="h-px bg-[rgba(196,163,115,0.10)]" />

            {/* Message body */}
            <p className="font-body font-light text-[rgba(245,237,224,0.75)] text-[0.90rem] leading-[1.85] whitespace-pre-wrap">
              {openMsg.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
