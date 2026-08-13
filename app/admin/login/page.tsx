"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("yukti00005@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) {
      setError(authErr.message);
      setLoading(false);
    } else {
      router.replace("/admin");
    }
  }

  return (
    <div className="min-h-screen bg-[#12060e] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Logo mark */}
        <div className="text-center mb-10">
          <div className="w-10 h-10 rounded-full border border-[rgba(196,163,115,0.35)] flex items-center justify-center mx-auto mb-4">
            <span className="font-display text-[0.6rem] tracking-[0.15em] text-brass">D</span>
          </div>
          <p className="font-display text-[0.52rem] tracking-[0.28em] uppercase text-[rgba(196,163,115,0.40)]">
            Dhyom · Admin
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-display text-[0.46rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[#1e0c17] border border-[rgba(196,163,115,0.18)] rounded-[4px] px-4 py-3 font-body font-light text-ivory text-sm placeholder:text-[rgba(245,237,224,0.20)] focus:outline-none focus:border-[rgba(196,163,115,0.50)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-display text-[0.46rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.50)]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="bg-[#1e0c17] border border-[rgba(196,163,115,0.18)] rounded-[4px] px-4 py-3 font-body font-light text-ivory text-sm focus:outline-none focus:border-[rgba(196,163,115,0.50)] transition-colors"
            />
          </div>

          {error && (
            <p className="font-body font-light text-[rgba(210,90,90,0.75)] text-[0.78rem] text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 font-display text-[0.52rem] tracking-[0.22em] uppercase bg-brass text-ink rounded-[4px] px-6 py-3.5 hover:bg-[#d4b383] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

      </div>
    </div>
  );
}
