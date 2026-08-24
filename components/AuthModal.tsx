"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

export default function AuthModal() {
  const { modalOpen, closeModal, signInWithGoogle, signInWithEmail, verifyOtp } = useAuth();

  const [step,    setStep]    = useState<"options" | "email" | "otp">("options");
  const [email,   setEmail]   = useState("");
  const [otp,     setOtp]     = useState("");
  const [error,   setError]   = useState("");
  const [busy,    setBusy]    = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!modalOpen) { setStep("options"); setEmail(""); setOtp(""); setError(""); setBusy(false); }
  }, [modalOpen]);

  useEffect(() => {
    if (modalOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [modalOpen, step]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") closeModal(); }
    if (modalOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  if (!modalOpen) return null;

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address."); return;
    }
    setBusy(true); setError("");
    const res = await signInWithEmail(trimmed);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    setStep("otp");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.trim().length < 6) { setError("Enter the 6-digit code."); return; }
    setBusy(true); setError("");
    const res = await verifyOtp(email.trim(), otp.trim());
    setBusy(false);
    if (res.error) { setError("Invalid or expired code. Try again."); return; }
    // success — AuthContext closes modal via onAuthStateChange
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={closeModal}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-sm bg-damson border border-[rgba(196,163,115,0.22)] rounded-[8px] overflow-hidden shadow-[0_32px_80px_rgba(15,5,8,0.80)]"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "menu-enter 160ms ease-out" }}
      >
        {/* Close */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-[rgba(196,163,115,0.40)] hover:text-[rgba(196,163,115,0.80)] transition-colors"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <line x1="3" y1="3" x2="13" y2="13" /><line x1="13" y1="3" x2="3" y2="13" />
          </svg>
        </button>

        <div className="px-7 pt-8 pb-7">
          {/* Header */}
          <p className="font-display text-[0.52rem] tracking-[0.26em] uppercase text-[rgba(196,163,115,0.45)] mb-2">
            {step === "otp" ? "Check your inbox" : "Welcome"}
          </p>
          <h2 className="font-display text-ivory mb-1" style={{ fontSize: "1.35rem", letterSpacing: "0.04em" }}>
            {step === "otp" ? "Enter your code" : "Sign in to Dhyom"}
          </h2>
          <div className="w-8 h-px bg-[rgba(196,163,115,0.28)] mb-6" />

          {step === "options" && (
            <>
              {/* Google */}
              <button
                onClick={() => { setBusy(true); signInWithGoogle(); }}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 bg-[rgba(245,237,224,0.06)] border border-[rgba(196,163,115,0.22)] hover:border-[rgba(196,163,115,0.50)] hover:bg-[rgba(196,163,115,0.07)] rounded-[4px] py-3 px-5 transition-all duration-200 disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                <span className="font-display text-[0.62rem] tracking-[0.16em] uppercase text-ivory">
                  {busy ? "Redirecting…" : "Continue with Google"}
                </span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-[rgba(196,163,115,0.12)]" />
                <span className="font-body text-[0.78rem] text-[rgba(245,237,224,0.28)]">or</span>
                <div className="flex-1 h-px bg-[rgba(196,163,115,0.12)]" />
              </div>

              {/* Email trigger */}
              <button
                onClick={() => setStep("email")}
                className="w-full text-center font-body font-light text-[0.88rem] text-[rgba(245,237,224,0.48)] hover:text-[rgba(245,237,224,0.75)] transition-colors duration-200"
              >
                Sign in with email code →
              </button>
            </>
          )}

          {step === "email" && (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <p className="font-body font-light text-[rgba(245,237,224,0.48)] text-[0.88rem] leading-[1.75]">
                We&rsquo;ll send a 6-digit code to your inbox. No password needed.
              </p>
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.22)] focus:border-[rgba(196,163,115,0.50)] rounded-[3px] px-4 py-3 font-body font-light text-ivory text-[0.95rem] placeholder:text-[rgba(245,237,224,0.20)] focus:outline-none transition-colors"
              />
              {error && <p className="font-body text-[0.82rem] text-[rgba(210,80,80,0.80)]">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full font-display text-[0.62rem] tracking-[0.20em] uppercase text-brass border border-[rgba(196,163,115,0.40)] hover:bg-[rgba(196,163,115,0.07)] rounded-[3px] py-3 transition-all duration-200 disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send Code"}
              </button>
              <button type="button" onClick={() => setStep("options")} className="font-body text-[0.80rem] text-[rgba(245,237,224,0.32)] hover:text-[rgba(245,237,224,0.60)] transition-colors text-center">
                ← Back
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <p className="font-body font-light text-[rgba(245,237,224,0.48)] text-[0.88rem] leading-[1.75]">
                Code sent to <span className="text-brass">{email}</span>. Check your inbox (and spam folder).
              </p>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                placeholder="6-digit code"
                className="w-full bg-[rgba(245,237,224,0.04)] border border-[rgba(196,163,115,0.22)] focus:border-[rgba(196,163,115,0.50)] rounded-[3px] px-4 py-3 font-body font-light text-ivory text-[1.1rem] tracking-[0.3em] placeholder:text-[rgba(245,237,224,0.20)] focus:outline-none transition-colors text-center"
              />
              {error && <p className="font-body text-[0.82rem] text-[rgba(210,80,80,0.80)]">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full font-display text-[0.62rem] tracking-[0.20em] uppercase text-brass border border-[rgba(196,163,115,0.40)] hover:bg-[rgba(196,163,115,0.07)] rounded-[3px] py-3 transition-all duration-200 disabled:opacity-50"
              >
                {busy ? "Verifying…" : "Verify & Sign In"}
              </button>
              <button type="button" onClick={() => { setStep("email"); setOtp(""); }} className="font-body text-[0.80rem] text-[rgba(245,237,224,0.32)] hover:text-[rgba(245,237,224,0.60)] transition-colors text-center">
                ← Resend code
              </button>
            </form>
          )}

          <p className="mt-6 font-body font-light text-[0.72rem] text-[rgba(245,237,224,0.22)] leading-[1.7] text-center">
            By signing in you agree to our privacy policy. We never share your data.
          </p>
        </div>
      </div>
    </div>
  );
}
