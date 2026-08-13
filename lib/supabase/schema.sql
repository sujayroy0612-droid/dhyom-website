-- ============================================================
-- Dhyom — initial database schema
-- Run this in the Supabase SQL Editor (once, top to bottom).
-- ============================================================

-- UUID generation is built-in on Supabase; gen_random_uuid()
-- is available without any extension.


-- ─────────────────────────────────────────────────────────────
-- 1. products
-- ─────────────────────────────────────────────────────────────
create table if not exists products (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  category    text        not null
                          check (category in ('fragrance', 'light', 'gifting')),
  type        text        not null,             -- 'incense sticks', 'candle', etc.
  fragrance   text,                             -- nullable — not all products have one
  price       numeric     not null check (price >= 0),
  stock       integer     not null default 0
                          check (stock >= 0),
  description text        not null default '',
  image_url   text        not null default '',
  created_at  timestamptz not null default now()
);

-- Indexes for the most common listing / admin queries
create index if not exists products_category_idx   on products (category);
create index if not exists products_created_at_idx on products (created_at desc);


-- ─────────────────────────────────────────────────────────────
-- 2. orders
-- ─────────────────────────────────────────────────────────────
create table if not exists orders (
  id              uuid        primary key default gen_random_uuid(),
  customer_name   text        not null,
  phone           text        not null,
  email           text,                         -- nullable
  address         text        not null,
  -- items: [{product_id, name, quantity, price}]
  items           jsonb       not null default '[]'::jsonb,
  total           numeric     not null check (total >= 0),
  payment_method  text        not null
                              check (payment_method in ('cod', 'online')),
  payment_status  text        not null default 'pending'
                              check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  order_status    text        not null default 'pending'
                              check (order_status in ('pending', 'packed', 'shipped', 'delivered')),
  created_at      timestamptz not null default now()
);

create index if not exists orders_order_status_idx on orders (order_status);
create index if not exists orders_created_at_idx   on orders (created_at desc);
create index if not exists orders_phone_idx        on orders (phone);


-- ─────────────────────────────────────────────────────────────
-- 3. contacts
-- ─────────────────────────────────────────────────────────────
create table if not exists contacts (
  id                uuid        primary key default gen_random_uuid(),
  email             text,                       -- at least one of email/phone required
  phone             text,
  tag               text        not null default 'lead'
                                check (tag in ('lead', 'buyer')),
  captured_at       timestamptz not null default now(),
  sequence_day_sent integer     not null default 0,

  -- enforce that we have at least one contact method
  constraint contacts_has_email_or_phone
    check (email is not null or phone is not null)
);

create index if not exists contacts_email_idx on contacts (email);
create index if not exists contacts_tag_idx   on contacts (tag);


-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────

-- products — publicly readable; writes only via service role (admin)
alter table products enable row level security;

create policy "products_public_read"
  on products
  for select
  to anon, authenticated
  using (true);


-- orders — customers can place orders (insert) but cannot read any order list
alter table orders enable row level security;

create policy "orders_insert_only"
  on orders
  for insert
  to anon, authenticated
  with check (true);


-- contacts — form submissions can insert; no public reads
alter table contacts enable row level security;

create policy "contacts_insert_only"
  on contacts
  for insert
  to anon, authenticated
  with check (true);


-- ─────────────────────────────────────────────────────────────
-- Done.
-- Admin SELECT/UPDATE/DELETE on orders and contacts will be
-- added once the admin dashboard exists, scoped to the
-- authenticated service-role or a dedicated admin role.
-- ─────────────────────────────────────────────────────────────
