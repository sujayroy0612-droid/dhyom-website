"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

type Message = {
  id: string;
  text: string;
  link_url: string | null;
  sort_order: number;
  active: boolean;
};

type Settings = {
  id: string;
  enabled: boolean;
  speed: number;
};

const inputCls =
  "bg-[#1e0c17] border border-[rgba(196,163,115,0.18)] rounded-[3px] px-3 py-2 text-[0.82rem] text-ivory placeholder:text-[rgba(245,237,224,0.20)] focus:outline-none focus:border-[rgba(196,163,115,0.45)] transition-colors";

// Inline marquee preview — real CSS, same as the storefront component
function BarPreview({ messages, speed, enabled }: { messages: Message[]; speed: number; enabled: boolean }) {
  const active = messages.filter(m => m.active);
  if (!enabled || active.length === 0) {
    return (
      <div
        className="h-9 flex items-center justify-center border border-[rgba(196,163,115,0.12)] rounded-[3px]"
        style={{ background: "rgba(196,163,115,0.03)" }}
      >
        <span className="font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.25)]">
          Bar hidden — {!enabled ? "disabled" : "no active messages"}
        </span>
      </div>
    );
  }

  const strip = active.map((m) => (
    <span key={m.id} style={{ display: "inline-flex", alignItems: "center" }}>
      <span style={{
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: "0.52rem",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "#C4A373",
        fontWeight: 400,
        whiteSpace: "nowrap",
      }}>
        {m.text}
      </span>
      <span style={{ color: "rgba(196,163,115,0.35)", margin: "0 14px", userSelect: "none" }}>·</span>
    </span>
  ));

  return (
    <div
      style={{
        height: "36px",
        background: "#1A0A14",
        border: "1px solid rgba(196,163,115,0.20)",
        borderRadius: "3px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        className="animate-marquee"
        style={{ display: "inline-flex", alignItems: "center", animationDuration: `${speed}s`, willChange: "transform" }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", paddingLeft: "2rem" }}>{strip}</span>
        <span style={{ display: "inline-flex", alignItems: "center", paddingLeft: "2rem" }}>{strip}</span>
      </div>
    </div>
  );
}

export default function AnnouncementPage() {
  const [settings,    setSettings]    = useState<Settings | null>(null);
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [newText,     setNewText]     = useState("");
  const [newLink,     setNewLink]     = useState("");
  const [adding,      setAdding]      = useState(false);
  const [editId,      setEditId]      = useState<string | null>(null);
  const [editText,    setEditText]    = useState("");
  const [editLink,    setEditLink]    = useState("");
  const [token,       setToken]       = useState("");

  const load = useCallback(async (tk: string) => {
    const res  = await fetch("/api/admin/announcement", {
      headers: { Authorization: `Bearer ${tk}` },
    });
    const data = await res.json();
    setSettings(data.settings ?? null);
    setMessages(data.messages ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setToken(session.access_token);
      load(session.access_token);
    });
  }, [load]);

  async function saveSettings(patch: Partial<Settings>) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    await fetch("/api/admin/announcement", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ type: "settings", id: settings.id, enabled: next.enabled, speed: next.speed }),
    });
    setSaving(false);
  }

  async function toggleEnabled() {
    await saveSettings({ enabled: !settings?.enabled });
  }

  async function saveSpeed(speed: number) {
    await saveSettings({ speed });
  }

  async function toggleMessage(msg: Message) {
    const updated = { ...msg, active: !msg.active };
    setMessages(prev => prev.map(m => m.id === msg.id ? updated : m));
    await fetch("/api/admin/announcement", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ type: "message", ...updated }),
    });
  }

  async function deleteMessage(id: string) {
    if (!window.confirm("Delete this message?")) return;
    setMessages(prev => prev.filter(m => m.id !== id));
    await fetch("/api/admin/announcement", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ id }),
    });
  }

  async function moveMessage(index: number, dir: -1 | 1) {
    const swapIndex = index + dir;
    if (swapIndex < 0 || swapIndex >= messages.length) return;

    const next = [...messages];
    const aSort = next[index].sort_order;
    const bSort = next[swapIndex].sort_order;

    // Swap sort_orders
    next[index]    = { ...next[index],    sort_order: bSort };
    next[swapIndex] = { ...next[swapIndex], sort_order: aSort };
    // Re-sort array
    next.sort((a, b) => a.sort_order - b.sort_order);
    setMessages(next);

    // Persist both
    await Promise.all([
      fetch("/api/admin/announcement", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ type: "message", ...next.find(m => m.id === messages[index].id) }),
      }),
      fetch("/api/admin/announcement", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ type: "message", ...next.find(m => m.id === messages[swapIndex].id) }),
      }),
    ]);
  }

  async function addMessage() {
    if (!newText.trim()) return;
    setAdding(true);
    const res  = await fetch("/api/admin/announcement", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ text: newText.trim(), link_url: newLink.trim() || null }),
    });
    const data = await res.json();
    if (data.message) {
      setMessages(prev => [...prev, data.message]);
      setNewText("");
      setNewLink("");
    }
    setAdding(false);
  }

  function startEdit(msg: Message) {
    setEditId(msg.id);
    setEditText(msg.text);
    setEditLink(msg.link_url ?? "");
  }

  async function saveEdit(msg: Message) {
    const updated = { ...msg, text: editText.trim(), link_url: editLink.trim() || null };
    setMessages(prev => prev.map(m => m.id === msg.id ? updated : m));
    setEditId(null);
    await fetch("/api/admin/announcement", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ type: "message", ...updated }),
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12060e] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[rgba(196,163,115,0.18)] border-t-brass animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen" style={{ color: "rgba(245,237,224,0.85)" }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="font-display text-[0.44rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.45)] mb-1">
            Admin · Marketing
          </p>
          <h1 className="font-display text-[1.4rem] tracking-[0.08em] text-brass">Announcement Bar</h1>
          <p className="font-body font-light italic text-[rgba(245,237,224,0.30)] text-sm mt-1">
            Scrolling banner above the storefront header.
          </p>
        </div>

        {/* Live preview */}
        <div className="mb-8">
          <p className="font-display text-[0.40rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.35)] mb-2">
            Live Preview
          </p>
          <BarPreview
            messages={messages}
            speed={settings?.speed ?? 30}
            enabled={settings?.enabled ?? false}
          />
        </div>

        {/* Settings card */}
        <div className="border border-[rgba(196,163,115,0.14)] rounded-[4px] overflow-hidden mb-6">
          <div className="px-5 py-3.5 bg-[rgba(196,163,115,0.05)] border-b border-[rgba(196,163,115,0.10)]">
            <span className="font-display text-[0.50rem] tracking-[0.16em] uppercase text-brass">Settings</span>
          </div>
          <div className="px-5 py-5 flex flex-col gap-5">

            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-[0.50rem] tracking-[0.14em] uppercase text-ivory">
                  Bar Enabled
                </p>
                <p className="font-body text-[0.74rem] text-[rgba(245,237,224,0.35)] mt-0.5">
                  {settings?.enabled ? "Showing on all storefront pages" : "Hidden from storefront"}
                </p>
              </div>
              <button
                onClick={toggleEnabled}
                disabled={saving}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40"
                style={{ background: settings?.enabled ? "rgba(196,163,115,0.70)" : "rgba(196,163,115,0.15)" }}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full bg-ivory shadow transition-transform duration-200"
                  style={{ transform: settings?.enabled ? "translateX(22px)" : "translateX(4px)" }}
                />
              </button>
            </div>

            {/* Speed */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-display text-[0.50rem] tracking-[0.14em] uppercase text-ivory">
                  Scroll Speed
                </p>
                <span className="font-display text-[0.58rem] text-brass">
                  {settings?.speed ?? 30}s loop
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={settings?.speed ?? 30}
                onChange={e => setSettings(s => s ? { ...s, speed: Number(e.target.value) } : s)}
                onMouseUp={e => saveSpeed(Number((e.target as HTMLInputElement).value))}
                onTouchEnd={e => saveSpeed(Number((e.target as HTMLInputElement).value))}
                className="w-full accent-brass"
              />
              <div className="flex justify-between mt-1">
                <span className="font-body text-[0.65rem] text-[rgba(245,237,224,0.28)]">Fast (10s)</span>
                <span className="font-body text-[0.65rem] text-[rgba(245,237,224,0.28)]">Slow (90s)</span>
              </div>
            </div>

          </div>
        </div>

        {/* Messages card */}
        <div className="border border-[rgba(196,163,115,0.14)] rounded-[4px] overflow-hidden mb-6">
          <div className="px-5 py-3.5 bg-[rgba(196,163,115,0.05)] border-b border-[rgba(196,163,115,0.10)]">
            <span className="font-display text-[0.50rem] tracking-[0.16em] uppercase text-brass">Messages</span>
          </div>

          {messages.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="font-body font-light italic text-[rgba(245,237,224,0.25)] text-sm">
                No messages yet. Add one below.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(196,163,115,0.07)]">
              {messages.map((msg, i) => (
                <div
                  key={msg.id}
                  className="px-5 py-4"
                  style={{ opacity: msg.active ? 1 : 0.45 }}
                >
                  {editId === msg.id ? (
                    // Edit mode
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        placeholder="Message text"
                        className={inputCls + " w-full"}
                        autoFocus
                      />
                      <input
                        type="url"
                        value={editLink}
                        onChange={e => setEditLink(e.target.value)}
                        placeholder="Link URL (optional)"
                        className={inputCls + " w-full"}
                      />
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => saveEdit(msg)}
                          className="font-display text-[0.46rem] tracking-[0.14em] uppercase px-4 py-1.5 rounded-[3px] bg-[rgba(196,163,115,0.14)] border border-[rgba(196,163,115,0.35)] text-brass hover:bg-[rgba(196,163,115,0.22)] transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="font-display text-[0.44rem] tracking-[0.12em] uppercase px-4 py-1.5 rounded-[3px] border border-[rgba(196,163,115,0.15)] text-[rgba(196,163,115,0.40)] hover:text-brass transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-center gap-3">
                      {/* Reorder */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          onClick={() => moveMessage(i, -1)}
                          disabled={i === 0}
                          className="text-[rgba(196,163,115,0.35)] hover:text-brass disabled:opacity-20 transition-colors leading-none text-[0.65rem]"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveMessage(i, 1)}
                          disabled={i === messages.length - 1}
                          className="text-[rgba(196,163,115,0.35)] hover:text-brass disabled:opacity-20 transition-colors leading-none text-[0.65rem]"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-[0.54rem] tracking-[0.12em] uppercase text-ivory truncate">
                          {msg.text}
                        </p>
                        {msg.link_url && (
                          <p className="font-body text-[0.68rem] text-[rgba(196,163,115,0.40)] truncate mt-0.5">
                            {msg.link_url}
                          </p>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Active toggle */}
                        <button
                          onClick={() => toggleMessage(msg)}
                          className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none"
                          style={{ background: msg.active ? "rgba(196,163,115,0.65)" : "rgba(196,163,115,0.12)" }}
                          title={msg.active ? "Active — click to hide" : "Inactive — click to show"}
                        >
                          <span
                            className="inline-block h-3.5 w-3.5 rounded-full bg-ivory shadow transition-transform duration-200"
                            style={{ transform: msg.active ? "translateX(18px)" : "translateX(3px)" }}
                          />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => startEdit(msg)}
                          className="font-display text-[0.42rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.38)] hover:text-brass transition-colors"
                        >
                          Edit
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="text-[rgba(210,90,90,0.35)] hover:text-[rgba(210,90,90,0.70)] transition-colors text-base leading-none"
                          title="Delete message"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add message */}
          <div className="px-5 py-4 border-t border-[rgba(196,163,115,0.10)] bg-[rgba(196,163,115,0.02)]">
            <p className="font-display text-[0.42rem] tracking-[0.14em] uppercase text-[rgba(196,163,115,0.38)] mb-3">
              Add Message
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newText}
                onChange={e => setNewText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !adding && addMessage()}
                placeholder="Free shipping on all orders above ₹999"
                className={inputCls + " w-full"}
              />
              <input
                type="url"
                value={newLink}
                onChange={e => setNewLink(e.target.value)}
                placeholder="Link URL (optional)"
                className={inputCls + " w-full"}
              />
              <button
                onClick={addMessage}
                disabled={adding || !newText.trim()}
                className="self-start font-display text-[0.48rem] tracking-[0.16em] uppercase px-5 py-2 rounded-[3px] bg-[rgba(196,163,115,0.10)] border border-[rgba(196,163,115,0.28)] text-[rgba(196,163,115,0.65)] hover:border-brass hover:text-brass transition-all duration-150 disabled:opacity-30"
              >
                {adding ? "Adding…" : "Add Message"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
