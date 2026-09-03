-- Shiprocket fulfillment tracking columns on orders table
-- Run this once in the Supabase SQL editor (or via supabase db push)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_order_id    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_shipment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS awb_number             TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name           TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url           TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS label_url              TEXT;
