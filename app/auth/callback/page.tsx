"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(() => {
        router.replace("/");
      });
    } else {
      // Implicit flow — session already in hash, getSession handles it
      supabase.auth.getSession().then(() => router.replace("/"));
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-black-plum flex items-center justify-center">
      <p className="font-display text-[0.62rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.55)]">
        Signing you in…
      </p>
    </div>
  );
}
