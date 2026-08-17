"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV = [
  { label: "Overview",          href: "/admin/marketing",                 icon: "▦" },
  { label: "Leads",             href: "/admin/marketing/leads",           icon: "⊹" },
  { label: "Lead Magnets",      href: "/admin/marketing/campaigns",       icon: "◫" },
  { label: "Newsletter",        href: "/admin/marketing/newsletter",      icon: "✉" },
  { label: "Soap Opera",        href: "/admin/marketing/soap-opera",      icon: "◌" },
  { label: "Seinfeld",          href: "/admin/marketing/seinfeld",        icon: "◩" },
  { label: "Announcement Bar",  href: "/admin/marketing/announcement",    icon: "◈" },
  { label: "Coupons",           href: "/admin/marketing/coupons",         icon: "◎" },
  { label: "Upsells & Offers",  href: "/admin/marketing/upsells",         icon: "◆" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#12060e] flex">

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-52 bg-[#1a0a12] border-r border-[rgba(196,163,115,0.10)] flex flex-col z-40">

        {/* Brand */}
        <div className="px-5 pt-6 pb-5 border-b border-[rgba(196,163,115,0.08)]">
          <p className="font-display text-[0.38rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.30)] mb-0.5">
            Internal
          </p>
          <p className="font-display text-brass" style={{ fontSize: "0.9rem", letterSpacing: "0.12em" }}>
            Marketing
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map(({ label, href, icon }) => {
            const active = href === "/admin/marketing"
              ? pathname === "/admin/marketing"
              : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-all duration-150",
                  active
                    ? "bg-[rgba(196,163,115,0.12)] text-brass"
                    : "text-[rgba(245,237,224,0.38)] hover:bg-[rgba(196,163,115,0.06)] hover:text-[rgba(245,237,224,0.70)]",
                ].join(" ")}
              >
                <span className="text-[0.75rem] w-4 text-center opacity-70">{icon}</span>
                <span className="font-display text-[0.52rem] tracking-[0.14em] uppercase">
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Back to Store Admin */}
        <div className="px-3 pb-5 border-t border-[rgba(196,163,115,0.08)] pt-3">
          <Link
            href="/admin"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[4px] text-[rgba(245,237,224,0.28)] hover:text-[rgba(196,163,115,0.65)] hover:bg-[rgba(196,163,115,0.05)] transition-all duration-150"
          >
            <span className="text-[0.75rem] w-4 text-center opacity-60">←</span>
            <span className="font-display text-[0.50rem] tracking-[0.14em] uppercase">
              Store Admin
            </span>
          </Link>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 ml-52 min-h-screen overflow-x-hidden">
        {children}
      </main>

    </div>
  );
}
