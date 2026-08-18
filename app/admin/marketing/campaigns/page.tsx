"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type Campaign = {
  id: string;
  slug: string;
  title: string;
  headline: string;
  subheadline: string | null;
  body_copy: string | null;
  pdf_url: string | null;
  pdf_base64: string | null;
  pdf_filename: string | null;
  tag: string;
  dm_copy: string | null;
  active: boolean;
  created_at: string;
};

type PdfStatus = "idle" | "uploading" | "done" | "error";

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const inputCls =
  "w-full bg-[#1e0c17] border border-[rgba(196,163,115,0.18)] rounded-[4px] px-4 py-3 font-body font-light text-ivory text-sm placeholder:text-[rgba(245,237,224,0.20)] focus:outline-none focus:border-[rgba(196,163,115,0.50)] transition-colors";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
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


type FormState = {
  title: string;
  slug: string;
  headline: string;
  subheadline: string;
  body_copy: string;
  pdf_url: string;
  pdf_base64: string | null;
  pdf_filename: string | null;
  tag: string;
  dm_copy: string;
  active: boolean;
};

const BLANK_FORM: FormState = {
  title: "",
  slug: "",
  headline: "",
  subheadline: "",
  body_copy: "",
  pdf_url: "",
  pdf_base64: null,
  pdf_filename: null,
  tag: "reel_lead",
  dm_copy: "",
  active: true,
};

function campaignToForm(c: Campaign): FormState {
  return {
    title:        c.title,
    slug:         c.slug,
    headline:     c.headline,
    subheadline:  c.subheadline  ?? "",
    body_copy:    c.body_copy    ?? "",
    pdf_url:      c.pdf_url      ?? "",
    pdf_base64:   c.pdf_base64   ?? null,
    pdf_filename: c.pdf_filename ?? null,
    tag:          c.tag,
    dm_copy:      c.dm_copy      ?? "",
    active:       c.active,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns,  setCampaigns]  = useState<Campaign[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [view,       setView]       = useState<"list" | "form">("list");
  const [editing,    setEditing]    = useState<Campaign | null>(null);
  const [form,       setForm]       = useState<FormState>(BLANK_FORM);
  const [pdfStatus,  setPdfStatus]  = useState<PdfStatus>("idle");
  const [pdfError,   setPdfError]   = useState("");
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState("");
  const pdfRef = useRef<HTMLInputElement | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  async function loadCampaigns() {
    setLoading(true);
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    setCampaigns((data as Campaign[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadCampaigns(); }, []);

  // ── Form open ───────────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(BLANK_FORM);
    setPdfStatus("idle");
    setPdfError("");
    setSaveError("");
    setView("form");
  }

  function openEdit(c: Campaign) {
    setEditing(c);
    setForm(campaignToForm(c));
    setPdfStatus("idle");
    setPdfError("");
    setSaveError("");
    setView("form");
  }

  // ── Form helpers ────────────────────────────────────────────────────────────

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleTitleChange(v: string) {
    setForm((f) => ({
      ...f,
      title: v,
      slug: editing ? f.slug : slugify(v),
    }));
  }

  // ── PDF upload ──────────────────────────────────────────────────────────────

  async function handlePdfFile(file: File) {
    setPdfStatus("uploading");
    setPdfError("");
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      setForm((f) => ({
        ...f,
        pdf_base64:   b64,
        pdf_filename: file.name,
        pdf_url:      file.name,
      }));
      setPdfStatus("done");
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Upload failed");
      setPdfStatus("error");
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.title.trim() || !form.slug.trim() || !form.headline.trim() || !form.tag.trim()) {
      setSaveError("Title, slug, headline, and tag are required.");
      return;
    }
    setSaving(true);
    setSaveError("");

    const payload: Record<string, unknown> = {
      id:           editing?.id ?? undefined,
      title:        form.title.trim(),
      slug:         form.slug.trim(),
      headline:     form.headline.trim(),
      subheadline:  form.subheadline.trim() || null,
      body_copy:    form.body_copy.trim()   || null,
      pdf_url:      form.pdf_filename       || null,
      tag:          form.tag.trim(),
      dm_copy:      form.dm_copy.trim()     || null,
      active:       form.active,
    };
    if (form.pdf_base64) {
      payload.pdf_base64   = form.pdf_base64;
      payload.pdf_filename = form.pdf_filename;
    }

    const res  = await fetch("/api/admin/campaign-save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await res.json() as { ok?: boolean; error?: string };

    setSaving(false);

    if (!res.ok || json.error) {
      setSaveError(json.error ?? "Save failed");
      return;
    }

    await loadCampaigns();
    setView("list");
  }

  // ── Inline list actions ─────────────────────────────────────────────────────

  async function handleToggleActive(c: Campaign) {
    const next = !c.active;
    await supabase.from("campaigns").update({ active: next }).eq("id", c.id);
    setCampaigns((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, active: next } : x))
    );
  }

  async function handleDelete(c: Campaign) {
    if (
      !window.confirm(
        `Delete "${c.title}"?\n\nContacts already captured will not be affected — only the campaign record is removed.`
      )
    )
      return;
    const { error } = await supabase.from("campaigns").delete().eq("id", c.id);
    if (!error) setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
  }

  // ── Loading spinner ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12060e] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
      </div>
    );
  }

  // ── Form view ───────────────────────────────────────────────────────────────

  if (view === "form") {
    return (
      <div className="min-h-screen bg-[#12060e] pt-8 pb-16 px-8">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => setView("list")}
              className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.35)] hover:text-brass mb-5 flex items-center gap-2 transition-colors"
            >
              ← Back to Lead Magnets
            </button>
            <p className="font-display text-[0.52rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.40)] mb-2">
              Admin · Lead Magnets
            </p>
            <h1
              className="font-display text-ivory"
              style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", letterSpacing: "0.05em" }}
            >
              {editing ? "Edit Campaign" : "New Campaign"}
            </h1>
            <div className="mt-5 w-10 h-px bg-[rgba(196,163,115,0.22)]" />
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-5">

            {/* Title + Slug */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Title *">
                <input
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Fragrance Personalities"
                  className={inputCls}
                />
              </Field>
              <Field label="Slug *" hint="/guide/[slug]">
                <input
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  placeholder="fragrance-personalities"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Headline */}
            <Field
              label="Headline *"
              hint="Use | to split two-tone: 'First Line|Brass Line'"
            >
              <input
                value={form.headline}
                onChange={(e) => set("headline", e.target.value)}
                placeholder="What Your Fragrance|Says About You"
                className={inputCls}
              />
            </Field>

            {/* Subheadline */}
            <Field label="Subheadline" hint="Small eyebrow text above the headline">
              <input
                value={form.subheadline}
                onChange={(e) => set("subheadline", e.target.value)}
                placeholder="The Fragrance Personalities"
                className={inputCls}
              />
            </Field>

            {/* Body Copy */}
            <Field label="Body Copy" hint="Italic text below the headline on the landing page">
              <textarea
                value={form.body_copy}
                onChange={(e) => set("body_copy", e.target.value)}
                rows={3}
                placeholder="The scent you reach for is never an accident..."
                className={inputCls + " resize-none"}
              />
            </Field>

            {/* Tag */}
            <Field label="Contact Tag *" hint="Written to contacts.tag on form submission">
              <input
                value={form.tag}
                onChange={(e) => set("tag", e.target.value)}
                placeholder="reel_lead"
                className={inputCls}
              />
            </Field>

            {/* PDF Upload */}
            <Field label="PDF Guide" hint="Attached to the delivery email via Cloudinary">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
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
                        : form.pdf_url
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
                      : form.pdf_url
                      ? "Replace PDF"
                      : "Upload PDF"}
                  </button>
                  {form.pdf_url && (
                    <span className="font-body text-[0.68rem] text-[rgba(245,237,224,0.28)] truncate max-w-xs">
                      {form.pdf_url.split("/").pop()}
                    </span>
                  )}
                </div>
                {pdfError && (
                  <p className="font-body font-light text-[rgba(210,90,90,0.70)] text-[0.70rem]">
                    {pdfError}
                  </p>
                )}
              </div>
            </Field>

            {/* DM Copy */}
            <Field label="DM Copy" hint="For reference only — not sent in emails">
              <textarea
                value={form.dm_copy}
                onChange={(e) => set("dm_copy", e.target.value)}
                rows={3}
                placeholder="Optional Instagram DM script..."
                className={inputCls + " resize-none"}
              />
            </Field>

            {/* Active toggle */}
            <div className="flex items-center gap-3 py-1">
              <button
                type="button"
                onClick={() => set("active", !form.active)}
                className={[
                  "relative w-10 h-5 rounded-full border transition-all duration-200",
                  form.active
                    ? "bg-[rgba(196,163,115,0.20)] border-[rgba(196,163,115,0.45)]"
                    : "bg-transparent border-[rgba(196,163,115,0.18)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200",
                    form.active
                      ? "left-5 bg-brass"
                      : "left-0.5 bg-[rgba(196,163,115,0.22)]",
                  ].join(" ")}
                />
              </button>
              <span className="font-display text-[0.46rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.50)]">
                {form.active
                  ? "Active — landing page accessible at /guide/" + (form.slug || "slug")
                  : "Inactive — landing page hidden"}
              </span>
            </div>

            {/* Error */}
            {saveError && (
              <p className="font-body font-light text-[rgba(210,90,90,0.75)] text-[0.80rem]">
                {saveError}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="font-display text-[0.52rem] tracking-[0.22em] uppercase bg-brass text-ink rounded-[3px] px-6 py-3 hover:bg-[#d4b383] transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Campaign"}
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className="font-display text-[0.50rem] tracking-[0.18em] uppercase border border-[rgba(196,163,115,0.20)] text-[rgba(196,163,115,0.38)] rounded-[3px] px-5 py-3 hover:text-[rgba(196,163,115,0.65)] hover:border-[rgba(196,163,115,0.38)] transition-colors"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────

  const activeCount = campaigns.filter((c) => c.active).length;

  return (
    <div className="min-h-screen bg-[#12060e] pt-8 pb-16 px-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="font-display text-[0.52rem] tracking-[0.24em] uppercase text-[rgba(196,163,115,0.40)] mb-3">
              Admin · Internal Tool
            </p>
            <h1
              className="font-display text-ivory mb-2"
              style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", letterSpacing: "0.05em" }}
            >
              Lead Magnets
            </h1>
            <p className="font-body font-light italic text-[rgba(245,237,224,0.38)] text-sm leading-relaxed max-w-lg">
              Each campaign is a landing page at{" "}
              <span className="text-[rgba(196,163,115,0.45)]">/guide/[slug]</span> that
              captures emails and delivers a PDF guide.
            </p>
            <div className="mt-6 w-10 h-px bg-[rgba(196,163,115,0.22)]" />
          </div>
          <button
            onClick={openCreate}
            className="mt-10 font-display text-[0.50rem] tracking-[0.18em] uppercase bg-brass text-ink rounded-[3px] px-5 py-2.5 hover:bg-[#d4b383] transition-colors active:scale-[0.98] whitespace-nowrap flex-shrink-0"
          >
            + New Campaign
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total",    value: campaigns.length,                  color: "text-ivory" },
            { label: "Active",   value: activeCount,                       color: "text-brass" },
            { label: "Inactive", value: campaigns.length - activeCount,    color: "text-[rgba(245,237,224,0.38)]" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-damson border border-[rgba(196,163,115,0.14)] rounded-[5px] px-4 py-3.5"
            >
              <p className="font-display text-[0.44rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.40)] mb-1.5">
                {label}
              </p>
              <p
                className={`font-display ${color}`}
                style={{ fontSize: "1.4rem", letterSpacing: "0.04em" }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Campaign list */}
        {campaigns.length === 0 ? (
          <div className="bg-damson border border-[rgba(196,163,115,0.14)] rounded-[6px] px-8 py-14 text-center">
            <p className="font-body font-light italic text-[rgba(245,237,224,0.28)] text-sm">
              No campaigns yet. Create your first one.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="bg-damson border border-[rgba(196,163,115,0.14)] rounded-[6px] px-6 py-4 flex items-center gap-4"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p
                      className="font-display text-ivory"
                      style={{ fontSize: "0.88rem", letterSpacing: "0.05em" }}
                    >
                      {c.title}
                    </p>
                    <span className="font-display text-[0.36rem] tracking-[0.10em] uppercase border border-[rgba(196,163,115,0.22)] text-[rgba(196,163,115,0.45)] rounded-full px-2 py-0.5">
                      {c.tag}
                    </span>
                    {!c.pdf_url && (
                      <span className="font-display text-[0.36rem] tracking-[0.10em] uppercase border border-[rgba(200,140,60,0.28)] text-[rgba(200,140,60,0.55)] rounded-full px-2 py-0.5">
                        no pdf
                      </span>
                    )}
                  </div>
                  <p className="font-body text-[0.70rem] text-[rgba(245,237,224,0.28)] truncate">
                    dhyom.in/guide/{c.slug}
                  </p>
                </div>

                {/* Active toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleActive(c)}
                  title={c.active ? "Active — click to deactivate" : "Inactive — click to activate"}
                  className={[
                    "relative w-10 h-5 rounded-full border transition-all duration-200 flex-shrink-0",
                    c.active
                      ? "bg-[rgba(196,163,115,0.18)] border-[rgba(196,163,115,0.40)]"
                      : "bg-transparent border-[rgba(196,163,115,0.15)]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200",
                      c.active
                        ? "left-5 bg-brass"
                        : "left-0.5 bg-[rgba(196,163,115,0.20)]",
                    ].join(" ")}
                  />
                </button>
                <span className="font-display text-[0.38rem] tracking-[0.10em] uppercase text-[rgba(196,163,115,0.30)] w-10 text-center flex-shrink-0">
                  {c.active ? "on" : "off"}
                </span>

                {/* Buttons */}
                <button
                  onClick={() => openEdit(c)}
                  className="font-display text-[0.44rem] tracking-[0.12em] uppercase border border-[rgba(196,163,115,0.20)] text-[rgba(196,163,115,0.42)] rounded-[3px] px-3.5 py-2 hover:text-brass hover:border-[rgba(196,163,115,0.45)] transition-colors whitespace-nowrap"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  className="font-display text-[0.44rem] tracking-[0.12em] uppercase border border-[rgba(200,80,80,0.16)] text-[rgba(200,80,80,0.38)] rounded-[3px] px-3.5 py-2 hover:text-[rgba(200,80,80,0.68)] hover:border-[rgba(200,80,80,0.32)] transition-colors whitespace-nowrap"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <p className="font-body font-light italic text-[rgba(245,237,224,0.18)] text-[0.72rem] text-center mt-10 leading-relaxed">
          Landing pages live at{" "}
          <span className="text-[rgba(196,163,115,0.30)]">dhyom.in/guide/[slug]</span>.
          Inactive campaigns return a &ldquo;no longer available&rdquo; message.
        </p>

      </div>
    </div>
  );
}
