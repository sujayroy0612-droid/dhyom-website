import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// One-shot copy seeder — delete after use.
// GET  → preview: shows matched product ID + current name (no writes)
// POST → applies the updates

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function auth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret set — open (shouldn't happen in prod)
  const token = (req.headers.get("authorization") ?? "").replace(/^bearer\s+/i, "").trim();
  return token === secret;
}

// bullet_points is a plain text column — join with newline
const B = (items: string[]) => items.join("\n");

const UPDATES: {
  match: { fragrance: string; format: string }; // used for fuzzy name lookup
  short_description: string;
  bullet_points: string;
  long_description: string;
}[] = [
  {
    match: { fragrance: "sandalwood", format: "nakshatra" },
    short_description: "Aroma of Meditation — deep, grounding, ancient.",
    bullet_points: B([
      "100% natural soy wax",
      "Burns for up to 40 hours",
      "Hand-poured in small batches",
      "Constellation-etched jar, star shadows on the wall when lit",
    ]),
    long_description:
      "The fragrance that turns a room into a ritual space. Deep, grounding, ancient — the scent of a mantle that has always been there, even in a home that's new.",
  },
  {
    match: { fragrance: "lavender", format: "nakshatra" },
    short_description: "Aroma of the Quiet Hour — the pause before rest.",
    bullet_points: B([
      "100% natural soy wax",
      "Burns for up to 40 hours",
      "Hand-poured in small batches",
      "Constellation-etched jar, star shadows on the wall when lit",
    ]),
    long_description:
      "The fragrance of the hour between the last task and the first moment of rest. Not sleep. The quiet just before it.",
  },
  {
    match: { fragrance: "vanilla", format: "nakshatra" },
    short_description: "Aroma of Coming Home — warm, unchanged, exactly where you left it.",
    bullet_points: B([
      "100% natural soy wax",
      "Burns for up to 40 hours",
      "Hand-poured in small batches",
      "Constellation-etched jar, star shadows on the wall when lit",
    ]),
    long_description:
      "The fragrance that waits at the end of the day, warm and unchanged, exactly where you left it. Nothing to prove. Nothing to explain.",
  },
  {
    match: { fragrance: "coffee", format: "nakshatra" },
    short_description: "Aroma of Dawn — warm, intentional, awake.",
    bullet_points: B([
      "100% natural soy wax",
      "Burns for up to 40 hours",
      "Hand-poured in small batches",
      "Constellation-etched jar, star shadows on the wall when lit",
    ]),
    long_description:
      "The fragrance that begins the day before the city does. Warm, intentional, awake — for the ritual that happens before anyone else is up.",
  },
  {
    match: { fragrance: "citrus", format: "nakshatra" },
    short_description: "Aroma of the Reset — a cleaner place to begin again.",
    bullet_points: B([
      "100% natural soy wax",
      "Burns for up to 40 hours",
      "Hand-poured in small batches",
      "Constellation-etched jar, star shadows on the wall when lit",
    ]),
    long_description:
      "The afternoon fragrance. When the day needs to begin again from a cleaner place.",
  },
  {
    match: { fragrance: "sandalwood", format: "mandala" },
    short_description: "Aroma of Meditation, in a form made to travel with you.",
    bullet_points: B([
      "100% natural soy wax",
      "Burns for up to 20 hours",
      "Hand-poured in small batches",
      "Geometric mandala tin, doubles as keepsake once the candle is spent",
    ]),
    long_description:
      "The fragrance that turns a room into a ritual space. Deep, grounding, ancient — carried anywhere the day takes you.",
  },
  {
    match: { fragrance: "lavender", format: "mandala" },
    short_description: "Aroma of the Quiet Hour, carried anywhere the day ends.",
    bullet_points: B([
      "100% natural soy wax",
      "Burns for up to 20 hours",
      "Hand-poured in small batches",
      "Geometric mandala tin, doubles as keepsake once the candle is spent",
    ]),
    long_description:
      "The fragrance of the hour between the last task and the first moment of rest. Not sleep. The quiet just before it.",
  },
  {
    match: { fragrance: "coffee", format: "mandala" },
    short_description: "Aroma of Dawn, in a tin built for every room.",
    bullet_points: B([
      "100% natural soy wax",
      "Burns for up to 20 hours",
      "Hand-poured in small batches",
      "Geometric mandala tin, doubles as keepsake once the candle is spent",
    ]),
    long_description:
      "The fragrance that begins the day before the city does. Warm, intentional, awake — for the ritual that happens before anyone else is up.",
  },
  {
    match: { fragrance: "citrus", format: "mandala" },
    short_description: "Aroma of the Reset, compact and unmistakably yours.",
    bullet_points: B([
      "100% natural soy wax",
      "Burns for up to 20 hours",
      "Hand-poured in small batches",
      "Geometric mandala tin, doubles as keepsake once the candle is spent",
    ]),
    long_description:
      "The afternoon fragrance. When the day needs to begin again from a cleaner place.",
  },
  {
    match: { fragrance: "sandalwood", format: "incense" },
    short_description: "Aroma of Meditation, in daily ritual form.",
    bullet_points: B([
      "Hand-rolled, natural ingredients",
      "Clean-burning — no black soot, no synthetic smoke",
      "Pack of 40 sticks",
    ]),
    long_description:
      "The fragrance that turns a room into a ritual space. Deep, grounding, ancient — the scent of a mantle that has always been there, even in a home that's new.",
  },
  {
    match: { fragrance: "lavender", format: "incense" },
    short_description: "Aroma of the Quiet Hour, one stick at a time.",
    bullet_points: B([
      "Hand-rolled, natural ingredients",
      "Clean-burning — no black soot, no synthetic smoke",
      "Pack of 40 sticks",
    ]),
    long_description:
      "The fragrance of the hour between the last task and the first moment of rest. Not sleep. The quiet just before it.",
  },
];

type ProductRow = { id: string; name: string };

async function matchProducts(sb: ReturnType<typeof adminClient>): Promise<
  { update: (typeof UPDATES)[number]; product: ProductRow | null }[]
> {
  const { data: allProducts } = await sb
    .from("products")
    .select("id, name");

  const rows = (allProducts ?? []) as ProductRow[];

  return UPDATES.map(u => {
    const { fragrance, format } = u.match;
    const matched = rows.find(p => {
      const n = p.name.toLowerCase();
      return n.includes(fragrance) && n.includes(format);
    }) ?? null;
    return { update: u, product: matched };
  });
}

// GET — preview: show what would be matched, no writes
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = adminClient();
  const matches = await matchProducts(sb);

  return NextResponse.json({
    preview: matches.map(m => ({
      match_key: `${m.update.match.fragrance} × ${m.update.match.format}`,
      matched_name: m.product?.name ?? null,
      matched_id:   m.product?.id   ?? null,
      status: m.product ? "WILL UPDATE" : "NOT FOUND",
    })),
  });
}

// POST — apply updates
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = adminClient();
  const matches = await matchProducts(sb);

  const results = [];

  for (const { update, product } of matches) {
    const key = `${update.match.fragrance} × ${update.match.format}`;
    if (!product) { results.push({ key, status: "NOT_FOUND" }); continue; }

    const { error } = await sb.from("products").update({
      short_description: update.short_description,
      bullet_points:     update.bullet_points,
      long_description:  update.long_description,
    }).eq("id", product.id);

    results.push({
      key,
      id:   product.id,
      name: product.name,
      status: error ? `ERROR: ${error.message}` : "UPDATED",
    });
  }

  // Read back all 11 to confirm
  const updatedIds = results.filter(r => r.status === "UPDATED").map(r => r.id!);
  let readback: Record<string, unknown>[] = [];
  if (updatedIds.length > 0) {
    const { data } = await sb.from("products")
      .select("id, name, short_description, bullet_points, long_description")
      .in("id", updatedIds)
      .order("name");
    readback = (data ?? []) as Record<string, unknown>[];
  }

  return NextResponse.json({ results, readback });
}
