-- ============================================================
-- Migration: 20260815_003_product_funnel_settings
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Create per-product funnel settings table
CREATE TABLE IF NOT EXISTS product_funnel_settings (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id          uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  bump_product_id     uuid REFERENCES products(id) ON DELETE SET NULL,
  oto_product_id      uuid REFERENCES products(id) ON DELETE SET NULL,
  downsell_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  UNIQUE(product_id)
);

-- Block direct client access; admin API uses service role key
ALTER TABLE product_funnel_settings ENABLE ROW LEVEL SECURITY;

-- Seed every product row, carrying forward current category-level settings
INSERT INTO product_funnel_settings (product_id, bump_product_id, oto_product_id, downsell_product_id)
SELECT
  p.id,
  fs.bump_product_id,
  fs.oto_product_id,
  fs.downsell_product_id
FROM products p
LEFT JOIN funnel_settings fs ON fs.category = p.category
ON CONFLICT (product_id) DO NOTHING;
