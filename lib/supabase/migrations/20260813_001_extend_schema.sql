-- ============================================================
-- Migration: 20260813_001_extend_schema
-- Run in: Supabase Dashboard → SQL Editor → New query
-- Safe to run once on the existing database.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. orders — update order_status values + add customer_id
-- ─────────────────────────────────────────────────────────────

-- Drop the auto-named check constraint PostgreSQL created for
-- order_status so we can widen it. The generated name follows
-- the pattern <table>_<column>_check.
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_order_status_check;

-- Re-add with the full set of statuses (added: processing, cancelled)
ALTER TABLE orders
  ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN (
    'pending',
    'processing',
    'packed',
    'shipped',
    'delivered',
    'cancelled'
  ));

-- customer_id links to Supabase Auth users.
-- Nullable: guest checkout must work without an account.
-- ON DELETE SET NULL: deleting an auth user orphans the order
-- record rather than cascading a delete.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_id uuid
  REFERENCES auth.users (id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_customer_id_idx
  ON orders (customer_id)
  WHERE customer_id IS NOT NULL;


-- ─────────────────────────────────────────────────────────────
-- 2. coupons
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text        NOT NULL UNIQUE,
  discount_type   text        NOT NULL
                              CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value  numeric     NOT NULL
                              CHECK (discount_value > 0),
  campaign_tag    text        NOT NULL,          -- 'first-order', 'referral', etc.
  usage_limit     integer,                        -- null = unlimited
  times_used      integer     NOT NULL DEFAULT 0
                              CHECK (times_used >= 0),
  valid_from      timestamptz NOT NULL,
  valid_until     timestamptz NOT NULL,
  active          boolean     NOT NULL DEFAULT true,

  CONSTRAINT coupons_dates_ordered
    CHECK (valid_until > valid_from)
);

CREATE INDEX IF NOT EXISTS coupons_code_idx         ON coupons (code);
CREATE INDEX IF NOT EXISTS coupons_active_idx        ON coupons (active);
CREATE INDEX IF NOT EXISTS coupons_campaign_tag_idx  ON coupons (campaign_tag);

-- RLS: anyone can read (to validate a code at checkout)
-- writes happen only via the service role (admin dashboard)
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons_public_read"
  ON coupons FOR SELECT
  TO anon, authenticated
  USING (true);


-- ─────────────────────────────────────────────────────────────
-- 3. reviews
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid        NOT NULL
                              REFERENCES products (id)
                              ON DELETE CASCADE,
  customer_name   text        NOT NULL,
  rating          integer     NOT NULL
                              CHECK (rating BETWEEN 1 AND 5),
  review_text     text        NOT NULL,
  approved        boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_product_id_idx  ON reviews (product_id);
CREATE INDEX IF NOT EXISTS reviews_approved_idx     ON reviews (approved);
CREATE INDEX IF NOT EXISTS reviews_created_at_idx   ON reviews (created_at DESC);

-- RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Public can only see approved reviews
CREATE POLICY "reviews_public_read_approved"
  ON reviews FOR SELECT
  TO anon, authenticated
  USING (approved = true);

-- Anyone can submit a review, but the approved flag is forced
-- to false — no one can self-approve via the anon key
CREATE POLICY "reviews_public_insert"
  ON reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (approved = false);

-- ============================================================
-- Summary of RLS surface after this migration
-- ──────────────────────────────────────────────────────────
-- Table     │ anon / authenticated    │ service role (admin)
-- ──────────┼─────────────────────────┼───────────────────────
-- products  │ SELECT only             │ full access
-- orders    │ INSERT only             │ full access
-- contacts  │ INSERT only             │ full access
-- coupons   │ SELECT only             │ full access
-- reviews   │ SELECT(approved), INSERT│ full access (incl. approve)
-- ============================================================
