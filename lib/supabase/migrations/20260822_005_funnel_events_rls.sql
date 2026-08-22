-- Run this in Supabase SQL Editor if not already done when creating funnel_events.
-- Allows anonymous visitors to INSERT tracking events (no auth required).
-- Service-role key (used in /api/admin/funnel) bypasses RLS automatically.

alter table funnel_events enable row level security;

-- Anyone (including anon visitors) can insert events
create policy "anon can insert funnel events"
  on funnel_events
  for insert
  to anon
  with check (true);

-- Only authenticated users (admin) can read
create policy "authed can read funnel events"
  on funnel_events
  for select
  to authenticated
  using (true);
