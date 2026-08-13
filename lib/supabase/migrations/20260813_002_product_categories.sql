-- ============================================================
-- Migration: 20260813_002_product_categories
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. Widen category constraint to new 5-category structure
-- ─────────────────────────────────────────────────────────────
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_category_check;

ALTER TABLE products
  ADD CONSTRAINT products_category_check
  CHECK (category IN ('candle', 'idol', 'bracelet', 'gift', 'pooja-essentials'));


-- ─────────────────────────────────────────────────────────────
-- 2. subcategory — meaning varies by category
--    idol: deity | bracelet: stone | gift: occasion
--    pooja-essentials: item type | candle: unused (use collection)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS subcategory text;

CREATE INDEX IF NOT EXISTS products_subcategory_idx ON products (subcategory);


-- ─────────────────────────────────────────────────────────────
-- 3. collection — candles only: 'nakshatra' | 'mandala'
--    Constraint ensures collection is only ever set on candles
--    and only to one of the two valid values.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS collection text;

ALTER TABLE products
  ADD CONSTRAINT products_collection_check
  CHECK (
    collection IS NULL
    OR (category = 'candle' AND collection IN ('nakshatra', 'mandala'))
  );

CREATE INDEX IF NOT EXISTS products_collection_idx ON products (collection);


-- ─────────────────────────────────────────────────────────────
-- 4. Delete all placeholder products
-- ─────────────────────────────────────────────────────────────
DELETE FROM products;


-- ─────────────────────────────────────────────────────────────
-- 5. Insert real product catalogue
--
-- ⚠️  PRICES ARE ESTIMATES ONLY.
-- All prices below are placeholders within the confirmed
-- ₹349–₹2,500 brand range and must be confirmed against
-- final cost sheets before the store goes live.
-- ─────────────────────────────────────────────────────────────

INSERT INTO products
  (name, category, type, subcategory, collection, fragrance, price, stock, description, image_url)
VALUES

  -- ── Candles · Nakshatra Collection (jar) ─────────────────

  (
    'Sandalwood Nakshatra Jar Candle',
    'candle', 'jar candle', null, 'nakshatra', 'sandalwood',
    799, 0,
    'Sandalwood held in glass. Slow to burn, slow to leave — the way stillness moves.',
    ''
  ),
  (
    'Lavender Nakshatra Jar Candle',
    'candle', 'jar candle', null, 'nakshatra', 'lavender',
    799, 0,
    'Lavender in a long, unhurried burn. For the evening that has earned its quiet.',
    ''
  ),
  (
    'Vanilla Nakshatra Jar Candle',
    'candle', 'jar candle', null, 'nakshatra', 'vanilla',
    799, 0,
    'Warm and unhurried, like the hour before sleep. Vanilla as a form of shelter.',
    ''
  ),
  (
    'Coffee Nakshatra Jar Candle',
    'candle', 'jar candle', null, 'nakshatra', 'coffee',
    799, 0,
    'The ritual of dawn, rendered into wax. For mornings lit with intention.',
    ''
  ),
  (
    'Citrus Nakshatra Jar Candle',
    'candle', 'jar candle', null, 'nakshatra', 'citrus',
    799, 0,
    'A brightness that does not announce itself and does not leave quickly. Citrus in glass.',
    ''
  ),

  -- ── Candles · Mandala Collection (tin) ───────────────────

  (
    'Sandalwood Mandala Tin Candle',
    'candle', 'tin candle', null, 'mandala', 'sandalwood',
    599, 0,
    'Sandalwood in its most portable form. The tin travels. The fragrance does not change.',
    ''
  ),
  (
    'Lavender Mandala Tin Candle',
    'candle', 'tin candle', null, 'mandala', 'lavender',
    599, 0,
    'A tin of lavender for the surface you choose to make sacred — the desk, the sill, the shelf.',
    ''
  ),
  (
    'Coffee Mandala Tin Candle',
    'candle', 'tin candle', null, 'mandala', 'coffee',
    599, 0,
    'Coffee, pressed into a tin. The morning ritual, wherever the morning finds you.',
    ''
  ),
  (
    'Citrus Mandala Tin Candle',
    'candle', 'tin candle', null, 'mandala', 'citrus',
    599, 0,
    'Clean, clear, present. Citrus Mandala for any space that deserves a little brightness.',
    ''
  ),

  -- ── Idols ────────────────────────────────────────────────

  (
    'Ganesha Idol',
    'idol', 'idol', 'ganesha', null, null,
    1499, 0,
    'He who clears the way. Cast for the home that holds space for new beginnings.',
    ''
  ),
  (
    'Lakshmi Idol',
    'idol', 'idol', 'lakshmi', null, null,
    1499, 0,
    'Abundance arrived as a presence. Lakshmi for the threshold of the home.',
    ''
  ),

  -- ── Spiritual Bracelets ───────────────────────────────────
  -- New product line — descriptions are factual, no overclaiming

  (
    'Rudraksh Mala Bracelet',
    'bracelet', 'bracelet', 'rudraksh', null, null,
    549, 0,
    'Rudraksh beads, hand-knotted for the wrist. Traditional in form, worn in daily practice.',
    ''
  ),
  (
    'Rose Quartz Bracelet',
    'bracelet', 'bracelet', 'rose-quartz', null, null,
    649, 0,
    'Rose quartz, strung simply for the wrist. A stone with a long history of being carried close.',
    ''
  ),

  -- ── Gift Boxes ────────────────────────────────────────────

  (
    'Diwali Gifting Box',
    'gift', 'gift box', 'diwali', null, null,
    1299, 0,
    'Light, fragrance, and intention — assembled for the festival of lights.',
    ''
  ),
  (
    'Rakhi Gifting Set',
    'gift', 'gift box', 'rakhi', null, null,
    899, 0,
    'Curated for the bond that does not need occasion to mean something.',
    ''
  ),
  (
    'Chhath Puja Gift Set',
    'gift', 'gift box', 'chhath', null, null,
    999, 0,
    'Sacred items gathered for the festival of the sun and the dawn it honours.',
    ''
  ),
  (
    'Ganesh Chaturthi Gift Box',
    'gift', 'gift box', 'ganesh-chaturthi', null, null,
    1199, 0,
    'Assembled for the arrival of Ganesha. A box that greets him with the care he deserves.',
    ''
  ),
  (
    'Dussehra Gifting Box',
    'gift', 'gift box', 'dussehra', null, null,
    999, 0,
    'For the day that marks what goodness can do. A curated gift for the season.',
    ''
  ),
  (
    'Corporate Gifting Box',
    'gift', 'gift box', 'corporate', null, null,
    1499, 0,
    'A gifting set rooted in Indian tradition. For the workplace that values meaning over novelty.',
    ''
  ),
  (
    'Wedding Favor Box',
    'gift', 'gift box', 'wedding', null, null,
    1299, 0,
    'For the beginning of a shared sacred life. A wedding favour assembled with reverence for what begins.',
    ''
  ),

  -- ── Pooja Essentials ──────────────────────────────────────

  (
    'Sandalwood Incense Sticks',
    'pooja-essentials', 'incense sticks', 'incense-sticks', null, 'sandalwood',
    399, 0,
    'Sandalwood, hand-rolled and slow to burn. For the daily ritual, offered without ceremony.',
    ''
  ),
  (
    'Lavender Incense Cones',
    'pooja-essentials', 'incense cones', 'incense-cones', null, 'lavender',
    349, 0,
    'Lavender cones for the corner you return to. One cone, the room entirely changed.',
    ''
  ),
  (
    'Pure Ghee Batti (Pack of 20)',
    'pooja-essentials', 'ghee batti', 'ghee-batti', null, null,
    349, 0,
    'Pure cow ghee in the traditional form. For the diya that has always burned this way.',
    ''
  ),
  (
    'Temple Camphor Tablets',
    'pooja-essentials', 'camphor tablets', 'camphor', null, null,
    399, 0,
    'Camphor for the aarti flame. As clean and certain as it has always been.',
    ''
  );
