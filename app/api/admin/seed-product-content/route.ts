import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// One-shot seeder — protected by CRON_SECRET.
// After running once, delete this file from the repo.

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const UPDATES = [
  {
    name: "Coffee Nakshatra Jar Candle",
    short_description: "A dark-roast ritual for the mornings that matter.",
    bullet_points: "100% natural soy wax, no paraffin\nBurns for up to 40 hours\nHand-poured in small batches",
    long_description: "There is a particular kind of stillness that arrives with the first coffee of the day. This candle holds that moment — deep, grounding, unhurried. Lit at a desk before the day begins, or beside a window with nothing to do but sit, it brings the quiet weight of a ritual worth keeping.",
    meta_title: "Coffee Nakshatra Jar Candle | Dhyom",
    meta_description: "A dark-roast soy candle for morning rituals. 100% natural wax, 40-hour burn, hand-poured. Bring the sacred into everyday moments.",
  },
  {
    name: "Sandalwood Nakshatra Jar Candle",
    short_description: "The scent of temples, made for the home you have built.",
    bullet_points: "100% natural soy wax, no paraffin\nBurns for up to 40 hours\nHand-poured in small batches",
    long_description: "Sandalwood has marked sacred spaces for centuries — this candle carries that same warmth into a modern room. Woody, grounding, and unmistakably reverent, it turns any corner of the house into a place worth sitting still in.",
    meta_title: "Sandalwood Nakshatra Jar Candle | Dhyom",
    meta_description: "A sandalwood soy candle rooted in tradition. 100% natural wax, 40-hour burn, hand-poured for a sacred, grounded home.",
  },
  {
    name: "Lavender Nakshatra Jar Candle",
    short_description: "A quiet companion for the hours meant for rest.",
    bullet_points: "100% natural soy wax, no paraffin\nBurns for up to 40 hours\nHand-poured in small batches",
    long_description: "Some evenings ask for nothing more than stillness. This candle's soft lavender note is built for exactly that — unwinding, breathing slower, letting the day settle. A small ritual for closing one chapter before the next begins.",
    meta_title: "Lavender Nakshatra Jar Candle | Dhyom",
    meta_description: "A calming lavender soy candle for evening rituals. 100% natural wax, 40-hour burn, hand-poured for rest and quiet.",
  },
  {
    name: "Citrus Nakshatra Jar Candle",
    short_description: "A bright note for the mornings you choose to begin well.",
    bullet_points: "100% natural soy wax, no paraffin\nBurns for up to 40 hours\nHand-poured in small batches",
    long_description: "Citrus carries a kind of clarity that few other notes do — sharp, clean, awake. This candle is made for the start of something, whether that's a morning, a new space, or simply a mood worth shifting.",
    meta_title: "Citrus Nakshatra Jar Candle | Dhyom",
    meta_description: "A bright citrus soy candle for clarity and calm mornings. 100% natural wax, 40-hour burn, hand-poured.",
  },
  {
    name: "Vanilla Nakshatra Jar Candle",
    short_description: "A warm note for the rooms you want to feel like home.",
    bullet_points: "100% natural soy wax, no paraffin\nBurns for up to 40 hours\nHand-poured in small batches",
    long_description: "Vanilla is the scent of comfort — familiar, warm, unpretentious. This candle is made for the ordinary evenings that deserve a little more care, filling a room with the kind of warmth that makes a house feel lived in.",
    meta_title: "Vanilla Nakshatra Jar Candle | Dhyom",
    meta_description: "A warm vanilla soy candle for cozy, comforting spaces. 100% natural wax, 40-hour burn, hand-poured.",
  },
  {
    name: "Coffee Mandala Tin Candle",
    short_description: "A pocket-sized ritual, dark-roast and grounding.",
    bullet_points: "100% natural soy wax, no paraffin\nBurns for up to 20 hours\nHand-poured in small batches",
    long_description: "Smaller in size, no smaller in intention. This tin candle carries the same grounding coffee note in a format made for a desk, a shelf, or a bag — a portable moment of stillness wherever it's needed.",
    meta_title: "Coffee Mandala Tin Candle | Dhyom",
    meta_description: "A compact coffee soy candle in a mandala tin. 100% natural wax, 20-hour burn, hand-poured for daily ritual.",
  },
  {
    name: "Sandalwood Mandala Tin Candle",
    short_description: "Sacred warmth, in a tin made to travel with you.",
    bullet_points: "100% natural soy wax, no paraffin\nBurns for up to 20 hours\nHand-poured in small batches",
    long_description: "A smaller vessel for the same reverent sandalwood note — made for gifting, for travel, or simply for a second space in the home that deserves its own ritual.",
    meta_title: "Sandalwood Mandala Tin Candle | Dhyom",
    meta_description: "A sandalwood soy candle in a compact mandala tin. 100% natural wax, 20-hour burn, hand-poured.",
  },
  {
    name: "Lavender Mandala Tin Candle",
    short_description: "Calm, in a size made for anywhere you need it.",
    bullet_points: "100% natural soy wax, no paraffin\nBurns for up to 20 hours\nHand-poured in small batches",
    long_description: "This tin candle brings the same soft lavender stillness into a smaller form — ideal for a bedside table, an office desk, or a thoughtful gift for someone who needs a pause.",
    meta_title: "Lavender Mandala Tin Candle | Dhyom",
    meta_description: "A calming lavender soy candle in a mandala tin. 100% natural wax, 20-hour burn, hand-poured.",
  },
  {
    name: "Citrus Mandala Tin Candle",
    short_description: "A bright lift, in a tin small enough for anywhere.",
    bullet_points: "100% natural soy wax, no paraffin\nBurns for up to 20 hours\nHand-poured in small batches",
    long_description: "Clean and citrus-bright, this tin candle is made for the spaces that need a little clarity — a study corner, a kitchen counter, or a gift for someone starting something new.",
    meta_title: "Citrus Mandala Tin Candle | Dhyom",
    meta_description: "A bright citrus soy candle in a compact mandala tin. 100% natural wax, 20-hour burn, hand-poured.",
  },
  {
    name: "Sandalwood Incense Sticks",
    short_description: "A charcoal-free sandalwood ritual for the everyday altar.",
    bullet_points: "Charcoal-free, natural Panchagavya formula\nMade in India\nLong, even burn for daily use",
    long_description: "Incense has marked ritual and reflection for generations — this sandalwood blend, made with a natural Panchagavya formula and free of charcoal, brings that same intention into daily life without the smoke or shortcuts of mass-market agarbatti.",
    meta_title: "Sandalwood Incense Sticks | Dhyom",
    meta_description: "Charcoal-free sandalwood incense sticks, natural Panchagavya formula, Made in India. For daily ritual and reflection.",
  },
  {
    name: "Lavender Incense Sticks",
    short_description: "A calming, charcoal-free incense for quieter moments.",
    bullet_points: "Charcoal-free, natural Panchagavya formula\nMade in India\nLong, even burn for daily use",
    long_description: "A softer note for incense — this lavender blend carries the same natural, charcoal-free formula into a calmer register, suited for meditation, wind-down evenings, or simply a gentler kind of ritual.",
    meta_title: "Lavender Incense Sticks | Dhyom",
    meta_description: "Charcoal-free lavender incense sticks, natural Panchagavya formula, Made in India. For calm and quiet moments.",
  },
];

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth   = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  if (secret && auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = adminClient();
  const results: { name: string; status: "updated" | "not_found" | "error"; id?: string; error?: string }[] = [];

  for (const { name, ...fields } of UPDATES) {
    const { data: found, error: findErr } = await sb
      .from("products")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (findErr || !found) {
      results.push({ name, status: "not_found", error: findErr?.message });
      continue;
    }

    const { error: updateErr } = await sb
      .from("products")
      .update(fields)
      .eq("id", found.id);

    if (updateErr) {
      results.push({ name, status: "error", id: found.id, error: updateErr.message });
    } else {
      results.push({ name, status: "updated", id: found.id });
    }
  }

  const updated   = results.filter(r => r.status === "updated").length;
  const not_found = results.filter(r => r.status === "not_found").length;
  const errors    = results.filter(r => r.status === "error").length;

  return NextResponse.json({ summary: { updated, not_found, errors }, results });
}
