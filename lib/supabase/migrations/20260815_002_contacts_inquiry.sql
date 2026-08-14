-- ============================================================
-- Migration: 20260815_002_contacts_inquiry
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Drop the restrictive tag check so all actual values are allowed
-- (the original only allowed 'lead' and 'buyer', which meant
--  'checkout_lead' from the checkout page was silently failing)
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_tag_check;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_tag_check1;

-- Add name and message columns for inquiry form submissions
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS name    text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS message text;
