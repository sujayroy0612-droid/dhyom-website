"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

type PdfStatus = "idle" | "uploading" | "done" | "error";

const inputCls =
  "w-full bg-[#1e0c17] border border-[rgba(196,163,115,0.18)] rounded-[4px] px-4 py-3 font-body font-light text-ivory text-sm placeholder:text-[rgba(245,237,224,0.20)] focus:outline-none focus:border-[rgba(196,163,115,0.50)] transition-colors";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <label className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.55)]">
          {label}
        </label>
        {hint && (
          <span className="font-body font-light italic text-[rgba(245,237,224,0.28)] text-[0.68rem]">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function NewsletterSettingsPage() {
  const [subject,   setSubject]   = useState("Welcome to Dhyom");
  const [pdfUrl,    setPdfUrl]    = useState("");
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>("idle");
  const [pdfError,  setPdfError]  = useState("");
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState("");
  const pdfRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("newsletter_settings")
        .select("subject, pdf_url")
        .eq("id", 1)
        .single();
      if (data) {
        setSubject(data.subject ?? "Welcome to Dhyom");
        setPdfUrl(data.pdf_url ?? "");
      }
      setLoading(false);
    })();
  }, []);

  async function handlePdfFile(file: File) {
    setPdfStatus("uploading");
    setPdfError("");
    try {
      const fd = new FormData();
      fd.append("file",          file);
      fd.append("upload_preset", UPLOAD_PRESET);
      fd.append("public_id",     "newsletter/welcome-guide");
      fd.append("resource_type", "raw");

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
        { method: "POST", body: fd }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message ?? "Cloudinary upload failed");
      }
      const data = await res.json();
      setPdfUrl(data.secure_url as string);
      setPdfStatus("done");
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Upload failed");
      setPdfStatus("error");
    }
  }

  async function handleSave() {
    if (!subject.trim()) {
      setSaveError("Subject line is required.");
      return;
    }
    setSaving(true);
    setSaveError("");
    setSaved(false);

    const { error } = await supabase.from("newsletter_settings").upsert({
      id:         1,
      subject:    subject.trim(),
      pdf_url:    pdfUrl.trim() || null,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12060e] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12060e] pt-8 pb-16 px-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <p className="font-display text-[0.52rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.40)] mb-3">
            Admin · Marketing
          </p>
          <h1
            className="font-display text-ivory mb-2"
            style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", letterSpacing: "0.05em" }}
          >
            Newsletter
          </h1>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-sm leading-relaxed max-w-lg">
            Configure the welcome email sent to every new subscriber. Upload a PDF here and it will be attached to every signup confirmation.
          </p>
          <div className="mt-6 w-10 h-px bg-[rgba(196,163,115,0.22)]" />
        </div>

        {/* Settings card */}
        <div className="bg-[#1a0a12] border border-[rgba(196,163,115,0.12)] rounded-[6px] p-8 flex flex-col gap-6">

          {/* Subject */}
          <Field label="Email Subject *">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Welcome to Dhyom"
              className={inputCls}
            />
          </Field>

          {/* PDF */}
          <Field
            label="Welcome PDF"
            hint="Attached to every newsletter signup confirmation"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  ref={pdfRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePdfFile(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={pdfStatus === "uploading"}
                  onClick={() => pdfRef.current?.click()}
                  className={[
                    "font-display text-[0.50rem] tracking-[0.18em] uppercase rounded-[3px] px-5 py-2.5 border transition-all active:scale-[0.98]",
                    pdfStatus === "done"
                      ? "border-[rgba(100,200,100,0.40)] text-[rgba(100,215,100,0.80)] bg-[rgba(100,200,100,0.06)]"
                      : pdfStatus === "error"
                      ? "border-[rgba(200,80,80,0.40)] text-[rgba(200,80,80,0.75)]"
                      : pdfStatus === "uploading"
                      ? "border-[rgba(196,163,115,0.15)] text-[rgba(196,163,115,0.30)] cursor-not-allowed"
                      : pdfUrl
                      ? "border-[rgba(196,163,115,0.28)] text-[rgba(196,163,115,0.55)] hover:text-brass hover:border-[rgba(196,163,115,0.55)]"
                      : "border-[rgba(196,163,115,0.42)] text-brass hover:bg-[rgba(196,163,115,0.07)] hover:border-[rgba(196,163,115,0.65)]",
                  ].join(" ")}
                >
                  {pdfStatus === "uploading"
                    ? "Uploading…"
                    : pdfStatus === "done"
                    ? "Uploaded ✓"
                    : pdfStatus === "error"
                    ? "Failed — retry"
                    : pdfUrl
                    ? "Replace PDF"
                    : "Upload PDF"}
                </button>

                {pdfUrl && (
                  <span className="font-body text-[0.68rem] text-[rgba(245,237,224,0.28)] truncate max-w-xs">
                    {pdfUrl.split("/").pop()}
                  </span>
                )}

                {pdfUrl && (
                  <button
                    type="button"
                    onClick={() => { setPdfUrl(""); setPdfStatus("idle"); }}
                    className="font-display text-[0.40rem] tracking-[0.12em] uppercase text-[rgba(200,80,80,0.38)] hover:text-[rgba(200,80,80,0.65)] transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              {pdfError && (
                <p className="font-body font-light text-[rgba(210,90,90,0.70)] text-[0.70rem]">
                  {pdfError}
                </p>
              )}

              {!pdfUrl && (
                <p className="font-body font-light italic text-[rgba(245,237,224,0.22)] text-[0.70rem]">
                  No PDF set — subscribers will receive a welcome email with no attachment.
                </p>
              )}
            </div>
          </Field>

          {/* Divider */}
          <div className="h-px bg-[rgba(196,163,115,0.10)]" />

          {/* Save */}
          {saveError && (
            <p className="font-body font-light text-[rgba(210,90,90,0.75)] text-[0.80rem]">
              {saveError}
            </p>
          )}
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="font-display text-[0.52rem] tracking-[0.22em] uppercase bg-brass text-ink rounded-[3px] px-6 py-3 hover:bg-[#d4b383] transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
            {saved && (
              <span className="font-body text-[0.72rem] italic text-[rgba(100,215,100,0.65)]">
                Saved.
              </span>
            )}
          </div>
        </div>

        {/* Info box */}
        <div className="mt-6 bg-[rgba(196,163,115,0.04)] border border-[rgba(196,163,115,0.10)] rounded-[5px] px-6 py-5">
          <p className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.40)] mb-2">
            How it works
          </p>
          <ul className="font-body font-light text-[rgba(245,237,224,0.38)] text-[0.75rem] leading-relaxed flex flex-col gap-1.5 list-none">
            <li>· Subscriber enters email in the homepage newsletter form</li>
            <li>· Email is saved to Leads with tag <span className="text-[rgba(196,163,115,0.45)]">newsletter</span></li>
            <li>· Welcome email is sent immediately via Resend with the subject set above</li>
            {pdfUrl
              ? <li>· PDF <span className="text-[rgba(196,163,115,0.45)]">{pdfUrl.split("/").pop()}</span> is attached to every welcome email</li>
              : <li>· No PDF attached — upload one above to include it in every welcome email</li>
            }
          </ul>
        </div>

        {/* SQL reminder */}
        <div className="mt-6 bg-[rgba(196,163,115,0.03)] border border-[rgba(196,163,115,0.08)] rounded-[5px] px-6 py-4">
          <p className="font-display text-[0.40rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.30)] mb-3">
            First-time setup — run once in Supabase SQL editor
          </p>
          <pre className="font-mono text-[0.60rem] text-[rgba(196,163,115,0.40)] whitespace-pre-wrap leading-relaxed">{`create table if not exists newsletter_settings (
  id int primary key default 1,
  subject text not null default 'Welcome to Dhyom',
  pdf_url text,
  updated_at timestamptz default now()
);
insert into newsletter_settings (id)
values (1)
on conflict (id) do nothing;`}</pre>
        </div>

      </div>
    </div>
  );
}
