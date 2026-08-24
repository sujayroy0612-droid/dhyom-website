-- Customer account tables: saved_addresses, wishlist, and customer_id link on orders

-- ── orders: link authenticated purchases to user account ────────────────────
alter table orders add column if not exists customer_id uuid references auth.users(id);
create index if not exists orders_customer_id_idx on orders(customer_id);

-- authenticated users can see their own orders
drop policy if exists "users can view own orders" on orders;
create policy "users can view own orders"
  on orders for select to authenticated
  using (auth.uid() = customer_id);

-- ── saved_addresses ──────────────────────────────────────────────────────────
create table if not exists saved_addresses (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  label         text,
  customer_name text        not null,
  phone         text,
  street        text        not null,
  city          text        not null,
  state         text        not null,
  pincode       text        not null,
  is_default    boolean     not null default false,
  created_at    timestamptz not null default now()
);

alter table saved_addresses enable row level security;

drop policy if exists "users manage own addresses" on saved_addresses;
create policy "users manage own addresses"
  on saved_addresses for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── wishlist ─────────────────────────────────────────────────────────────────
create table if not exists wishlist (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  product_id text        not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table wishlist enable row level security;

drop policy if exists "users manage own wishlist" on wishlist;
create policy "users manage own wishlist"
  on wishlist for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
