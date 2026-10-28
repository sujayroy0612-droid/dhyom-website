export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

interface Inquiry {
  id: string;
  name: string | null;
  phone: string | null;
  email: string;
  message: string | null;
  captured_at: string;
}

export default async function BulkInquiriesPage() {
  const sb = adminClient();
  const { data, error } = await sb
    .from("contacts")
    .select("id,name,phone,email,message,captured_at")
    .eq("tag", "bulk_inquiry")
    .order("captured_at", { ascending: false });

  const inquiries = (data ?? []) as Inquiry[];

  function parseDetails(message: string | null) {
    if (!message) return { boxes: "—", category: "—", notes: "" };
    const boxesMatch = message.match(/(\d+)\s*boxes?/i);
    const catMatch   = message.match(/·\s*([\w-]+)(?:\s*·|$)/);
    const notesMatch = message.match(/Notes:\s*(.+)$/i);
    return {
      boxes:    boxesMatch?.[1] ?? "—",
      category: catMatch?.[1] ?? "—",
      notes:    notesMatch?.[1] ?? "",
    };
  }

  const CELL = "px-4 py-3 font-body text-sm text-[rgba(245,237,224,0.70)] border-b border-[rgba(196,163,115,0.07)]";
  const HEAD = "px-4 py-2.5 font-display text-[0.38rem] tracking-[0.16em] uppercase text-[rgba(196,163,115,0.50)] border-b border-[rgba(196,163,115,0.12)] text-left";

  return (
    <div className="min-h-screen bg-[#12060e] pl-52">
      <div className="max-w-5xl mx-auto px-8 py-10">

        <div className="mb-8">
          <p className="font-display text-[0.40rem] tracking-[0.22em] uppercase text-[rgba(196,163,115,0.35)] mb-1">Admin</p>
          <h1 className="font-display text-ivory" style={{ fontSize: "1.4rem", letterSpacing: "0.04em" }}>Bulk Inquiries</h1>
          <p className="font-body font-light text-[rgba(245,237,224,0.38)] text-sm mt-1">{inquiries.length} enquir{inquiries.length === 1 ? "y" : "ies"} received</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-[rgba(220,80,80,0.08)] border border-[rgba(220,80,80,0.20)] rounded-[4px]">
            <p className="font-body text-sm text-[rgba(220,80,80,0.80)]">Could not load inquiries. Check SUPABASE_SERVICE_ROLE_KEY in Vercel env vars.</p>
          </div>
        )}

        {inquiries.length === 0 && !error ? (
          <div className="text-center py-20 border border-[rgba(196,163,115,0.10)] rounded-[6px]">
            <p className="font-display text-[0.44rem] tracking-[0.18em] uppercase text-[rgba(196,163,115,0.30)]">No inquiries yet</p>
          </div>
        ) : (
          <div className="border border-[rgba(196,163,115,0.14)] rounded-[6px] overflow-hidden">
            <table className="w-full border-collapse">
              <thead className="bg-[rgba(196,163,115,0.04)]">
                <tr>
                  <th className={HEAD}>Date</th>
                  <th className={HEAD}>Name</th>
                  <th className={HEAD}>Phone</th>
                  <th className={HEAD}>Email</th>
                  <th className={HEAD}>Boxes</th>
                  <th className={HEAD}>Category</th>
                  <th className={HEAD}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map(inq => {
                  const { boxes, category, notes } = parseDetails(inq.message);
                  const date = new Date(inq.captured_at).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                  });
                  return (
                    <tr key={inq.id} className="hover:bg-[rgba(196,163,115,0.03)] transition-colors">
                      <td className={CELL + " text-[rgba(245,237,224,0.40)] text-xs whitespace-nowrap"}>{date}</td>
                      <td className={CELL + " font-medium text-ivory"}>{inq.name ?? "—"}</td>
                      <td className={CELL}>
                        {inq.phone
                          ? <a href={`tel:${inq.phone}`} className="text-brass hover:underline">{inq.phone}</a>
                          : "—"}
                      </td>
                      <td className={CELL}>
                        <a href={`mailto:${inq.email}`} className="text-brass hover:underline">{inq.email}</a>
                      </td>
                      <td className={CELL + " text-center font-display text-brass"}>{boxes}</td>
                      <td className={CELL + " capitalize"}>{category}</td>
                      <td className={`${CELL} text-[rgba(245,237,224,0.45)] text-xs max-w-[180px] truncate`} title={notes}>{notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
