-- Add invoice tracking columns to offline_sales_orders
ALTER TABLE offline_sales_orders
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_date   TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS offline_sales_orders_invoice_number_key
  ON offline_sales_orders (invoice_number)
  WHERE invoice_number IS NOT NULL;
