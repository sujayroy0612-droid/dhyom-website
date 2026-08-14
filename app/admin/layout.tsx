"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

const NAV = [
  { label: "Dashboard",      href: "/admin",                     icon: "▦" },
  { label: "Orders",         href: "/admin/orders",              icon: "≡" },
  { label: "Products",       href: "/admin/products",            icon: "⊞" },
  { label: "Visibility",     href: "/admin/visibility",          icon: "◉" },
  { label: "Brand Assets",   href: "/admin/upload-brand-images", icon: "◈" },
  { label: "Coupons",        href: "/admin/coupons",             icon: "◎" },
  { label: "Funnel Planner", href: "/admin/funnel-planner",      icon: "◆" },
  { label: "Analytics",      href: "/admin/analytics",           icon: "↗" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const isLogin  = pathname === "/admin/login";

  const [checking, setChecking] = useState(!isLogin);
  const [authed,   setAuthed]   = useState(false);

  useEffect(() => {
    if (isLogin) return;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAuthed(true);
      } else {
        router.replace("/admin/login");
      }
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/admin/login");
    });

    return () => subscription.unsubscribe();
  }, [isLogin, router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  // Login page — no chrome
  if (isLogin) return <>{children}</>;

  // Auth check in progress
  if (checking) {
    return (
      <div className="min-h-screen bg-[#12060e] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
      </div>
    );
  }

  if (!authed) return null;

  return (
    <div className="min-h-screen bg-[#12060e] flex">

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-52 bg-[#1a0a12] border-r border-[rgba(196,163,115,0.10)] flex flex-col z-40">

        {/* Brand */}
        <div className="px-5 pt-6 pb-5 border-b border-[rgba(196,163,115,0.08)]">
          <p className="font-display text-[0.44rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.35)] mb-0.5">
            Internal
          </p>
          <p className="font-display text-brass" style={{ fontSize: "0.9rem", letterSpacing: "0.12em" }}>
            DHYOM
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map(({ label, href, icon }) => {
            const active = href === "/admin"
              ? pathname === "/admin"
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

        {/* Logout */}
        <div className="px-3 pb-5 border-t border-[rgba(196,163,115,0.08)] pt-3">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[4px] text-[rgba(245,237,224,0.30)] hover:text-[rgba(210,90,90,0.65)] hover:bg-[rgba(210,90,90,0.05)] transition-all duration-150"
          >
            <span className="text-[0.75rem] w-4 text-center opacity-60">↩</span>
            <span className="font-display text-[0.50rem] tracking-[0.14em] uppercase">
              Log out
            </span>
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 ml-52 min-h-screen overflow-x-hidden">
        {children}
      </main>

    </div>
  );
}
