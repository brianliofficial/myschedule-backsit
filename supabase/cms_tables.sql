-- One table per CMS page; multiple rows allowed — app uses latest updated_at.
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.set_cms_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.cms_index (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_about (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_contact (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_dr_beauty (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_portfolio (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists cms_index_updated_at_idx on public.cms_index (updated_at desc);
create index if not exists cms_about_updated_at_idx on public.cms_about (updated_at desc);
create index if not exists cms_contact_updated_at_idx on public.cms_contact (updated_at desc);
create index if not exists cms_dr_beauty_updated_at_idx on public.cms_dr_beauty (updated_at desc);
create index if not exists cms_portfolio_updated_at_idx on public.cms_portfolio (updated_at desc);

drop trigger if exists cms_index_set_updated_at on public.cms_index;
create trigger cms_index_set_updated_at
  before insert or update on public.cms_index
  for each row execute function public.set_cms_updated_at();

drop trigger if exists cms_about_set_updated_at on public.cms_about;
create trigger cms_about_set_updated_at
  before insert or update on public.cms_about
  for each row execute function public.set_cms_updated_at();

drop trigger if exists cms_contact_set_updated_at on public.cms_contact;
create trigger cms_contact_set_updated_at
  before insert or update on public.cms_contact
  for each row execute function public.set_cms_updated_at();

drop trigger if exists cms_dr_beauty_set_updated_at on public.cms_dr_beauty;
create trigger cms_dr_beauty_set_updated_at
  before insert or update on public.cms_dr_beauty
  for each row execute function public.set_cms_updated_at();

drop trigger if exists cms_portfolio_set_updated_at on public.cms_portfolio;
create trigger cms_portfolio_set_updated_at
  before insert or update on public.cms_portfolio
  for each row execute function public.set_cms_updated_at();

alter table public.cms_index enable row level security;
alter table public.cms_about enable row level security;
alter table public.cms_contact enable row level security;
alter table public.cms_dr_beauty enable row level security;
alter table public.cms_portfolio enable row level security;

drop policy if exists "Allow public read cms_index" on public.cms_index;
create policy "Allow public read cms_index" on public.cms_index for select using (true);

drop policy if exists "Allow public read cms_about" on public.cms_about;
create policy "Allow public read cms_about" on public.cms_about for select using (true);

drop policy if exists "Allow public read cms_contact" on public.cms_contact;
create policy "Allow public read cms_contact" on public.cms_contact for select using (true);

drop policy if exists "Allow public read cms_dr_beauty" on public.cms_dr_beauty;
create policy "Allow public read cms_dr_beauty" on public.cms_dr_beauty for select using (true);

drop policy if exists "Allow public read cms_portfolio" on public.cms_portfolio;
create policy "Allow public read cms_portfolio" on public.cms_portfolio for select using (true);
