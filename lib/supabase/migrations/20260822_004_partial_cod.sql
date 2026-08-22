-- ============================================================
-- Migration: 20260822_004_partial_cod
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Add partial COD fields to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_type         text    DEFAULT 'online'
    CHECK (payment_type IN ('online', 'partial_cod')),
  ADD COLUMN IF NOT EXISTS cod_convenience_fee  numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid_online   numeric,
  ADD COLUMN IF NOT EXISTS amount_due_cod       numeric;

-- Backfill existing online orders
UPDATE orders
SET payment_type = 'online'
WHERE payment_type IS NULL;
