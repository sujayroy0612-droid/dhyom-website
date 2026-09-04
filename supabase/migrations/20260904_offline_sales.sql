-- Offline Sales module — two normalized tables

CREATE TABLE IF NOT EXISTS offline_sales_orders (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date      DATE        NOT NULL,
  channel        TEXT        NOT NULL CHECK (channel IN ('wholesale','corporate_gifting','dm_order','exhibition')),
  customer_name  TEXT        NOT NULL,
  location       TEXT,
  payment_mode   TEXT        NOT NULL CHECK (payment_mode IN ('cash','upi','bank_transfer','pending')),
  payment_status TEXT        NOT NULL CHECK (payment_status IN ('paid','partial','pending')),
  amount_paid    NUMERIC     NOT NULL DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offline_sales_items (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID    NOT NULL REFERENCES offline_sales_orders(id) ON DELETE CASCADE,
  product_id  UUID    NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC NOT NULL CHECK (unit_price >= 0),
  line_total  NUMERIC NOT NULL
);

-- Service role bypasses RLS; enable it so anon/public can't read
ALTER TABLE offline_sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sales_items  ENABLE ROW LEVEL SECURITY;
