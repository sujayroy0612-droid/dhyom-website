-- RLS hardening: lock down admin-only tables so the anon key can never
-- read or write them directly. All writes to these tables go through API
-- routes that use the service-role key, which bypasses RLS entirely.

-- ── store_settings ──────────────────────────────────────────────────────────
alter table if exists store_settings enable row level security;

drop policy if exists "authed can manage store_settings" on store_settings;
create policy "authed can manage store_settings"
  on store_settings
  for all
  to authenticated
  using (true)
  with check (true);

-- ── soap_opera_emails ────────────────────────────────────────────────────────
alter table if exists soap_opera_emails enable row level security;

drop policy if exists "authed can manage soap_opera_emails" on soap_opera_emails;
create policy "authed can manage soap_opera_emails"
  on soap_opera_emails
  for all
  to authenticated
  using (true)
  with check (true);

-- ── newsletter_settings ──────────────────────────────────────────────────────
alter table if exists newsletter_settings enable row level security;

drop policy if exists "authed can manage newsletter_settings" on newsletter_settings;
create policy "authed can manage newsletter_settings"
  on newsletter_settings
  for all
  to authenticated
  using (true)
  with check (true);

-- ── campaigns ────────────────────────────────────────────────────────────────
alter table if exists campaigns enable row level security;

drop policy if exists "authed can manage campaigns" on campaigns;
create policy "authed can manage campaigns"
  on campaigns
  for all
  to authenticated
  using (true)
  with check (true);

-- ── category_visibility ──────────────────────────────────────────────────────
alter table if exists category_visibility enable row level security;

drop policy if exists "anon can read category_visibility" on category_visibility;
create policy "anon can read category_visibility"
  on category_visibility
  for select
  to anon
  using (true);

drop policy if exists "authed can manage category_visibility" on category_visibility;
create policy "authed can manage category_visibility"
  on category_visibility
  for all
  to authenticated
  using (true)
  with check (true);

-- ── collection_visibility ────────────────────────────────────────────────────
alter table if exists collection_visibility enable row level security;

drop policy if exists "anon can read collection_visibility" on collection_visibility;
create policy "anon can read collection_visibility"
  on collection_visibility
  for select
  to anon
  using (true);

drop policy if exists "authed can manage collection_visibility" on collection_visibility;
create policy "authed can manage collection_visibility"
  on collection_visibility
  for all
  to authenticated
  using (true)
  with check (true);

-- ── orders ───────────────────────────────────────────────────────────────────
-- anon can INSERT (COD orders go via service-role; this covers any edge case)
-- authenticated (admin JWT) can SELECT/UPDATE/DELETE for the dashboard

alter table if exists orders enable row level security;

drop policy if exists "anon can insert orders" on orders;
create policy "anon can insert orders"
  on orders
  for insert
  to anon
  with check (true);

drop policy if exists "authed can manage orders" on orders;
create policy "authed can manage orders"
  on orders
  for all
  to authenticated
  using (true)
  with check (true);

-- ── contacts ─────────────────────────────────────────────────────────────────
-- anon can INSERT (newsletter / contact form / checkout-started)
-- authenticated can manage (admin CRM)

alter table if exists contacts enable row level security;

drop policy if exists "anon can insert contacts" on contacts;
create policy "anon can insert contacts"
  on contacts
  for insert
  to anon
  with check (true);

drop policy if exists "authed can manage contacts" on contacts;
create policy "authed can manage contacts"
  on contacts
  for all
  to authenticated
  using (true)
  with check (true);
