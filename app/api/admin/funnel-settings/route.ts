import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_FIELDS = ["bump_product_id", "oto_product_id", "downsell_product_id"];

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/* GET — return all products with their per-product funnel settings */
export async function GET() {
  const sb = adminSupabase();

  const [productsRes, settingsRes, optionsRes] = await Promise.all([
    sb.from("products").select("id,name,category,price").order("category").order("name"),
    sb.from("product_funnel_settings").select("*"),
    sb.from("products").select("id,name,category,price").eq("is_visible", true).order("category").order("name"),
  ]);

  if (productsRes.error) return NextResponse.json({ error: productsRes.error.message }, { status: 500 });

  type PFS = { id: string; product_id: string; bump_product_id: string | null; oto_product_id: string | null; downsell_product_id: string | null };
  const settingsMap = new Map<string, PFS>((settingsRes.data ?? []).map((r: PFS) => [r.product_id, r]));

  const rows = (productsRes.data ?? []).map((p: { id: string; name: string; category: string; price: number }) => {
    const s = settingsMap.get(p.id);
    return {
      productId:          p.id,
      productName:        p.name,
      category:           p.category,
      price:              p.price,
      settingsId:         s?.id ?? null,
      bump_product_id:    s?.bump_product_id ?? null,
      oto_product_id:     s?.oto_product_id ?? null,
      downsell_product_id: s?.downsell_product_id ?? null,
    };
  });

  return NextResponse.json({ rows, productOptions: optionsRes.data ?? [] });
}

/* PATCH — upsert a single funnel field for one product */
export async function PATCH(req: NextRequest) {
  const body = await req.json() as { productId: string; field: string; value: string | null };
  const { productId, field, value } = body;

  if (!productId || !ALLOWED_FIELDS.includes(field)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sb = adminSupabase();
  const { error } = await sb
    .from("product_funnel_settings")
    .upsert({ product_id: productId, [field]: value ?? null }, { onConflict: "product_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
