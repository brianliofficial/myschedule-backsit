-- Run in Supabase SQL Editor if you see:
--   42501 new row violates row-level security policy for table "site_data"
-- while using NEXT_PUBLIC_ANON_KEY from the browser (role: anon).

alter table public.site_data enable row level security;

drop policy if exists "site_data_anon_select" on public.site_data;
drop policy if exists "site_data_anon_insert" on public.site_data;
drop policy if exists "site_data_anon_update" on public.site_data;

create policy "site_data_anon_select"
  on public.site_data for select
  to anon
  using (true);

create policy "site_data_anon_insert"
  on public.site_data for insert
  to anon
  with check (true);

create policy "site_data_anon_update"
  on public.site_data for update
  to anon
  using (true)
  with check (true);
