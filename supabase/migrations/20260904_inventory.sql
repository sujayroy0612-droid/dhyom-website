-- ══════════════════════════════════════════════════════════════════════════════
--  Inventory module
--  Run in: Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Per-product low-stock threshold (admin-configurable)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 10;

-- 2. Track whether an offline sale already deducted product stock
--    (guards against double-deduction on edit, and backward-compat for old orders)
ALTER TABLE offline_sales_orders
  ADD COLUMN IF NOT EXISTS stock_deducted boolean NOT NULL DEFAULT false;

-- ── New tables ────────────────────────────────────────────────────────────────

-- 3. Raw materials master list
CREATE TABLE IF NOT EXISTS raw_materials (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text        NOT NULL,
  category            text        NOT NULL DEFAULT 'other'
                        CHECK (category IN ('wax','wick','container','fragrance_oil','packaging','other')),
  unit                text        NOT NULL DEFAULT 'pieces'
                        CHECK (unit IN ('g','ml','pieces')),
  current_stock       numeric     NOT NULL DEFAULT 0,
  low_stock_threshold numeric     NOT NULL DEFAULT 100,
  cost_per_unit       numeric,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- 4. Bill of materials — qty of each raw material needed for ONE finished-product unit
CREATE TABLE IF NOT EXISTS product_recipes (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid    NOT NULL REFERENCES products(id)      ON DELETE CASCADE,
  raw_material_id   uuid    NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  quantity_used     numeric NOT NULL CHECK (quantity_used > 0),
  UNIQUE (product_id, raw_material_id)
);

-- 5. Log of every production run (raw materials → finished goods)
CREATE TABLE IF NOT EXISTS production_batches (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid        NOT NULL REFERENCES products(id),
  quantity_produced integer     NOT NULL CHECK (quantity_produced > 0),
  batch_date        date        NOT NULL DEFAULT CURRENT_DATE,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── Helpers: atomically adjust product stock ──────────────────────────────────
-- Called by verify-payment (online orders) and offline-sales API.

CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id uuid, p_quantity integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE products
  SET    stock = GREATEST(0, stock - p_quantity)
  WHERE  id = p_product_id;
END;
$$;

-- Symmetric increment — used when an offline sale is deleted or edited (undo deduction).
CREATE OR REPLACE FUNCTION increment_product_stock(p_product_id uuid, p_quantity integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE products
  SET    stock = stock + p_quantity
  WHERE  id = p_product_id;
END;
$$;

-- ── Atomic production function ────────────────────────────────────────────────
-- Checks stock, deducts raw materials, increments finished goods, records batch
-- — all in one transaction so a partial failure is impossible.
-- Returns: { ok: true } or { ok: false, shortages: [{name,unit,required,available,short_by}] }

CREATE OR REPLACE FUNCTION log_production_batch(
  p_product_id  uuid,
  p_quantity    integer,
  p_batch_date  date,
  p_notes       text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec       RECORD;
  shortages jsonb   := '[]'::jsonb;
  required  numeric;
BEGIN
  -- 1. Preflight: check every recipe ingredient against current stock
  FOR rec IN
    SELECT pr.raw_material_id,
           pr.quantity_used,
           rm.name,
           rm.current_stock,
           rm.unit
    FROM   product_recipes pr
    JOIN   raw_materials   rm ON rm.id = pr.raw_material_id
    WHERE  pr.product_id = p_product_id
  LOOP
    required := rec.quantity_used * p_quantity;
    IF rec.current_stock < required THEN
      shortages := shortages || jsonb_build_array(
        jsonb_build_object(
          'name',      rec.name,
          'unit',      rec.unit,
          'required',  required,
          'available', rec.current_stock,
          'short_by',  required - rec.current_stock
        )
      );
    END IF;
  END LOOP;

  -- 2. Abort if any shortage found — return list so UI can display it
  IF jsonb_array_length(shortages) > 0 THEN
    RETURN jsonb_build_object('ok', false, 'shortages', shortages);
  END IF;

  -- 3. Deduct raw materials
  FOR rec IN
    SELECT raw_material_id, quantity_used
    FROM   product_recipes
    WHERE  product_id = p_product_id
  LOOP
    UPDATE raw_materials
    SET    current_stock = current_stock - (rec.quantity_used * p_quantity)
    WHERE  id = rec.raw_material_id;
  END LOOP;

  -- 4. Increment finished goods stock
  UPDATE products
  SET    stock = stock + p_quantity
  WHERE  id = p_product_id;

  -- 5. Record the batch
  INSERT INTO production_batches (product_id, quantity_produced, batch_date, notes)
  VALUES (p_product_id, p_quantity, p_batch_date, p_notes);

  RETURN jsonb_build_object('ok', true);
END;
$$;
