"use client";

import { useState, FormEvent } from "react";

const inputBase =
  "w-full bg-[rgba(245,237,224,0.04)] border rounded-[3px] px-4 py-3 font-body font-light text-ivory text-[0.95rem] placeholder:text-[rgba(245,237,224,0.20)] focus:outline-none transition-colors duration-150";
const inputNormal = `${inputBase} border-[rgba(196,163,115,0.22)] focus:border-[rgba(196,163,115,0.50)]`;
const inputErr    = `${inputBase} border-[rgba(210,80,80,0.45)] focus:border-[rgba(210,80,80,0.65)]`;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-display text-[0.52rem] tracking-[0.20em] uppercase text-[rgba(196,163,115,0.52)]">
        {label}
      </label>
      {children}
      {error && (
        <p className="font-body font-light text-[rgba(205,75,75,0.72)] text-[0.78rem]">{error}</p>
      )}
    </div>
  );
}

export default function ContactForm() {
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [message,   setMessage]   = useState("");
  const [honeypot,  setHoneypot]  = useState("");
  const [errors,    setErrors]    = useState<{ name?: string; email?: string; message?: string }>({});
  const [status,    setStatus]    = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [apiErr,    setApiErr]    = useState("");

  function validate() {
    const e: typeof errors = {};
    if (!name.trim())    e.name    = "Name is required.";
    if (!email.trim())   e.email   = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Enter a valid email address.";
    if (!message.trim()) e.message = "Message is required.";
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setStatus("submitting");
    setApiErr("");

    try {
      const res = await fetch("/api/contact-inquiry", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, email, message, hp: honeypot }),
      });
      const data = await res.json();
      if (!res.ok) { setApiErr(data.error ?? "Something went wrong."); setStatus("error"); return; }
      setStatus("success");
    } catch {
      setApiErr("Unable to send your message. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-start gap-4 py-4">
        <div className="w-8 h-px bg-[rgba(196,163,115,0.40)]" />
        <p className="font-display text-brass" style={{ fontSize: "0.72rem", letterSpacing: "0.14em" }}>
          Message received
        </p>
        <p className="font-body font-light italic text-[rgba(245,237,224,0.55)] text-[1rem] leading-[1.85]">
          Thanks — we&rsquo;ll get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {/* Honeypot — hidden from users, bots fill it */}
      <input
        type="text"
        aria-hidden="true"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
      />
      <Field label="Name" error={errors.name}>
        <input
          type="text"
          value={name}
          placeholder="Your name"
          autoComplete="name"
          onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
          className={errors.name ? inputErr : inputNormal}
        />
      </Field>

      <Field label="Email" error={errors.email}>
        <input
          type="email"
          value={email}
          placeholder="you@example.com"
          autoComplete="email"
          onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
          className={errors.email ? inputErr : inputNormal}
        />
      </Field>

      <Field label="Message" error={errors.message}>
        <textarea
          value={message}
          placeholder="Your question, feedback, or bulk order enquiry..."
          rows={5}
          onChange={(e) => { setMessage(e.target.value); setErrors((p) => ({ ...p, message: undefined })); }}
          className={`${errors.message ? inputErr : inputNormal} resize-none`}
        />
      </Field>

      {(status === "error" && apiErr) && (
        <p className="font-body font-light text-[rgba(205,75,75,0.72)] text-[0.88rem]">{apiErr}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="self-start inline-flex items-center gap-2.5 font-display text-[0.62rem] tracking-[0.22em] uppercase text-ink bg-brass hover:bg-[#d4b383] px-8 py-3 rounded-full transition-colors duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "submitting" ? "Sending…" : "Send Message"}
        {status !== "submitting" && (
          <svg width="13" height="10" viewBox="0 0 13 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M1 5h11M7.5 1l4 4-4 4" />
          </svg>
        )}
      </button>
    </form>
  );
}
