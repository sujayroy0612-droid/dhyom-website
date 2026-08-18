import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body as { id?: string; [key: string]: unknown };

  if (!fields.title || !fields.slug || !fields.headline || !fields.tag) {
    return NextResponse.json({ error: "Title, slug, headline, and tag are required." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    title:        (fields.title as string).trim(),
    slug:         (fields.slug  as string).trim(),
    headline:     (fields.headline as string).trim(),
    subheadline:  (fields.subheadline as string | null | undefined)?.trim() || null,
    body_copy:    (fields.body_copy   as string | null | undefined)?.trim() || null,
    pdf_url:      (fields.pdf_url     as string | null | undefined) ?? null,
    tag:          (fields.tag  as string).trim(),
    dm_copy:      (fields.dm_copy as string | null | undefined)?.trim() || null,
    active:       Boolean(fields.active),
  };

  if (fields.pdf_base64) {
    payload.pdf_base64   = fields.pdf_base64;
    payload.pdf_filename = fields.pdf_filename ?? null;
  }

  const sb = adminClient();

  console.log(`[campaign-save] id=${id ?? "NEW"} pdf_base64=${payload.pdf_base64 ? `YES (${String(payload.pdf_base64).length} chars)` : "null"}`);

  const { error } = id
    ? await sb.from("campaigns").update(payload).eq("id", id)
    : await sb.from("campaigns").insert(payload);

  if (error) {
    console.error("[campaign-save] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[campaign-save] saved OK`);
  return NextResponse.json({ ok: true });
}
