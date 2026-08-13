-- ============================================================
-- Dhyom — starter product seed data
--
-- ⚠️  PRICES ARE ESTIMATES ONLY.
-- Every price below is a placeholder within the confirmed
-- ₹349–₹2,500 brand range and must be reviewed and confirmed
-- with final cost sheets before the store goes live.
-- Do not treat these numbers as approved retail prices.
-- ============================================================

insert into products
  (name, category, type, fragrance, price, stock, description, image_url)
values

  -- ── Fragrance · Incense Sticks ──────────────────────────

  (
    'Sandalwood Dhoop Sticks',
    'fragrance',
    'incense sticks',
    'Sandalwood',
    399,
    0,
    'Sandalwood. The fragrance of deep stillness and unhurried prayer.',
    ''
  ),

  (
    'Coffee Sadhana Incense Sticks',
    'fragrance',
    'incense sticks',
    'Coffee Sadhana',
    449,
    0,
    'For mornings begun in intention. The scent of dawn before the world intrudes.',
    ''
  ),

  (
    'Lavender Incense Sticks',
    'fragrance',
    'incense sticks',
    'Lavender',
    399,
    0,
    'Lavender, grown in patience. For spaces that ask nothing of you.',
    ''
  ),

  (
    'Magic Gold Incense Sticks',
    'fragrance',
    'incense sticks',
    'Magic Gold',
    499,
    0,
    'Our signature. Magic Gold — a fragrance with no reference point but its own depth.',
    ''
  ),

  (
    'Citrus Incense Sticks',
    'fragrance',
    'incense sticks',
    'Citrus',
    399,
    0,
    'A brightness that arrives without announcement, and lingers without effort.',
    ''
  ),

  -- ── Fragrance · Incense Cones ───────────────────────────

  (
    'Sandalwood Incense Cones',
    'fragrance',
    'incense cones',
    'Sandalwood',
    349,
    0,
    'Each cone, a quiet offering. Sandalwood rising slow and certain.',
    ''
  ),

  (
    'Lavender Incense Cones',
    'fragrance',
    'incense cones',
    'Lavender',
    349,
    0,
    'A single cone of lavender smoke — the hour turning soft.',
    ''
  ),

  -- ── Light · Candles ─────────────────────────────────────

  (
    'Sandalwood Ritual Candle',
    'light',
    'candle',
    'Sandalwood',
    899,
    0,
    'Sandalwood rendered into flame. For the altar, and for the hours between.',
    ''
  ),

  (
    'Magic Gold Signature Candle',
    'light',
    'candle',
    'Magic Gold',
    1299,
    0,
    'The Magic Gold fragrance held in wax. Our rarest and most enduring form of light.',
    ''
  ),

  -- ── Gifting · Idols ─────────────────────────────────────

  (
    'Ganesha Idol',
    'gifting',
    'idol',
    null,                -- idols carry no fragrance
    1899,
    0,
    'He who removes what stands between us and beginning. Cast for the threshold of a sacred home.',
    ''
  );
