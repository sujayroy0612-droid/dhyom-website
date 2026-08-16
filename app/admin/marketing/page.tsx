"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Stats = {
  total: number;
  buyer: number;
  reel_lead: number;
  newsletter: number;
  checkout_lead: number;
  inquiry: number;
  unsubscribed: number;
  mid_sequence: number;
  active_campaigns: number;
};

type CampaignRow = { id: string; title: string; count: number };

const TAG_FG: Record<string, string> = {
  buyer:         "#64c878",
  checkout_lead: "#C4A373",
  reel_lead:     "#78a0dc",
  newsletter:    "#b478dc",
  inquiry:       "rgba(245,237,224,0.50)",
};

const QUICK_LINKS = [
  { label: "Leads",            href: "/admin/marketing/leads",      icon: "⊹", desc: "All contacts, filters, CSV export" },
  { label: "Lead Magnets",     href: "/admin/marketing/campaigns",  icon: "◫", desc: "PDF guide campaigns + landing pages" },
  { label: "Soap Opera",       href: "/admin/marketing/soap-opera", icon: "◌", desc: "Edit 5-day email sequence" },
  { label: "Seinfeld",         href: "/admin/marketing/seinfeld",   icon: "◩", desc: "Broadcast emails" },
  { label: "Coupons",          href: "/admin/marketing/coupons",    icon: "◎", desc: "Discount codes" },
  { label: "Upsells & Offers", href: "/admin/marketing/upsells",    icon: "◆", desc: "Bump / OTO / Downsell per product" },
];

export default function MarketingOverviewPage() {
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      fetch("/api/admin/marketing-overview", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.json())
        .then(data => {
          if (data.error) { setError(data.error); } else {
            setStats(data.stats);
            setCampaigns(data.campaign_breakdown ?? []);
          }
          setLoading(false);
        })
        .catch(() => { setError("Failed to load stats."); setLoading(false); });
    });
  }, []);

  return (
    <div className="p-8 min-h-screen" style={{ color: "rgba(245,237,224,0.85)" }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <p className="font-display text-[0.40rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.38)] mb-1">
            Admin
          </p>
          <h1 className="font-display text-[1.6rem] tracking-[0.07em] text-brass mb-1">
            Marketing
          </h1>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.28)] text-sm">
            Leads, campaigns, email sequences, and offers — all in one place.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
          </div>
        ) : error ? (
          <div className="mb-8 px-5 py-4 bg-[rgba(200,80,80,0.07)] border border-[rgba(200,80,80,0.20)] rounded-[4px]">
            <p className="font-body text-[rgba(200,80,80,0.75)] text-sm">{error}</p>
          </div>
        ) : stats && (
          <>
            {/* Primary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total Leads",       value: stats.total },
                { label: "Buyers",            value: stats.buyer },
                { label: "Active Sequences",  value: stats.mid_sequence },
                { label: "Unsubscribed",      value: stats.unsubscribed },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-[rgba(196,163,115,0.04)] border border-[rgba(196,163,115,0.12)] rounded-[4px] px-5 py-4"
                >
                  <p className="font-display text-[0.38rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.40)] mb-1.5">
                    {label}
                  </p>
                  <p className="font-display text-[1.8rem] text-brass leading-none">{value}</p>
                </div>
              ))}
            </div>

            {/* Secondary row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {[
                { label: "Non-buyer Leads",   value: stats.total - stats.buyer - stats.unsubscribed },
                { label: "Active Campaigns",  value: stats.active_campaigns },
                { label: "Inquiry",           value: stats.inquiry },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-[rgba(196,163,115,0.03)] border border-[rgba(196,163,115,0.09)] rounded-[4px] px-4 py-3"
                >
                  <p className="font-display text-[0.36rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.35)] mb-1">
                    {label}
                  </p>
                  <p className="font-display text-[1.3rem] text-[rgba(245,237,224,0.70)] leading-none">{value}</p>
                </div>
              ))}
            </div>

            {/* Tag breakdown */}
            <div className="mb-10">
              <p className="font-display text-[0.40rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.35)] mb-3">
                By Source
              </p>
              <div className="flex flex-wrap gap-2">
                {(["buyer", "checkout_lead", "reel_lead", "newsletter", "inquiry"] as const).map(tag => (
                  <Link
                    key={tag}
                    href={`/admin/marketing/leads?tag=${tag}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-[3px] border border-[rgba(196,163,115,0.15)] hover:border-[rgba(196,163,115,0.30)] transition-colors"
                  >
                    <span
                      className="font-display text-[0.38rem] tracking-[0.12em] uppercase"
                      style={{ color: TAG_FG[tag] }}
                    >
                      {tag.replace("_", " ")}
                    </span>
                    <span
                      className="font-display text-[0.60rem]"
                      style={{ color: TAG_FG[tag] + "80" }}
                    >
                      {stats[tag]}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Campaign breakdown */}
            {campaigns.length > 0 && (
              <div className="mb-10">
                <p className="font-display text-[0.40rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.35)] mb-3">
                  Leads by Campaign
                </p>
                <div className="border border-[rgba(196,163,115,0.12)] rounded-[4px] overflow-hidden">
                  {campaigns.map((c, i) => (
                    <div
                      key={c.id}
                      className={[
                        "flex items-center justify-between px-5 py-3",
                        i !== campaigns.length - 1 ? "border-b border-[rgba(196,163,115,0.07)]" : "",
                        i % 2 !== 0 ? "bg-[rgba(0,0,0,0.08)]" : "",
                      ].join(" ")}
                    >
                      <span className="font-body text-[0.85rem] text-[rgba(245,237,224,0.65)]">
                        {c.title}
                      </span>
                      <span className="font-display text-[0.80rem] text-brass">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Quick links */}
        <div>
          <p className="font-display text-[0.40rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.35)] mb-3">
            Tools
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {QUICK_LINKS.map(({ label, href, icon, desc }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col gap-2 px-5 py-4 bg-[rgba(196,163,115,0.03)] border border-[rgba(196,163,115,0.10)] rounded-[4px] hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.22)] transition-all duration-150"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[0.80rem] text-[rgba(196,163,115,0.55)]">{icon}</span>
                  <span className="font-display text-[0.50rem] tracking-[0.14em] uppercase text-brass group-hover:text-[rgba(196,163,115,0.90)] transition-colors">
                    {label}
                  </span>
                </div>
                <p className="font-body font-light text-[0.72rem] text-[rgba(245,237,224,0.28)] leading-snug">
                  {desc}
                </p>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
