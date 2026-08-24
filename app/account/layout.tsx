"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { href: "/account/orders",    label: "My Orders"        },
  { href: "/account/addresses", label: "Saved Addresses"  },
  { href: "/account/wishlist",  label: "Wishlist"         },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, openModal } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      openModal();
      router.replace("/");
    }
  }, [loading, user, openModal, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-black-plum flex items-center justify-center">
        <p className="font-display text-[0.62rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.45)]">
          Loading…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black-plum pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-6">

        {/* Page header */}
        <div className="mb-10">
          <p className="font-display text-[0.52rem] tracking-[0.26em] uppercase text-[rgba(196,163,115,0.38)] mb-2">
            Account
          </p>
          <h1 className="font-display text-ivory" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", letterSpacing: "0.05em" }}>
            {user.user_metadata?.full_name ?? user.email}
          </h1>
          <div className="mt-3 w-10 h-px bg-[rgba(196,163,115,0.22)]" />
        </div>

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Sidebar nav */}
          <nav className="w-full lg:w-44 flex-shrink-0 flex flex-row lg:flex-col gap-1">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={[
                  "px-4 py-2.5 rounded-[3px] font-display text-[0.58rem] tracking-[0.18em] uppercase transition-colors duration-150",
                  pathname === href
                    ? "bg-[rgba(196,163,115,0.12)] text-brass"
                    : "text-[rgba(245,237,224,0.42)] hover:text-ivory hover:bg-[rgba(245,237,224,0.04)]",
                ].join(" ")}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
