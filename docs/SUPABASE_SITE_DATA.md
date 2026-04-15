# Supabase: `site_data` table

Stores the full `[SiteData](lib/siteData.ts)` document as JSON (`jsonb`).

## Recommended: server writes (no broad anon RLS)

The admin UI calls `**/api/site-data**` (`[app/api/site-data/route.ts](../app/api/site-data/route.ts)`), which uses `**SUPABASE_SERVICE_ROLE_KEY**` only on the server. The service role bypasses RLS, so you **do not** need permissive `anon` policies for saves.

Add to `**.env.local`** (never prefix with `NEXT_PUBLIC_`):

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Project Settings → API → service_role
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
```

Restart `next dev` after changing env.

**Dev-only check:** open `http://localhost:3000/api/site-data?diag=1` (port as needed). You should see `hasServiceRoleKey: true` after the key is loaded. If it is `false`, the server process does not see `SUPABASE_SERVICE_ROLE_KEY` (wrong filename, typo, or dev server not restarted).

## Error `42501` / `new row violates row-level security policy for table "site_data"`

If you still call Supabase **from the browser** with the **anon** key, RLS applies. Either use `**/api/site-data` + service role** (above) or add policies for your role.

**Alternative fix (anon in browser):** In Supabase → **SQL Editor**, run [RLS: browser + anon key](#rls-browser--anon-key) or `[supabase/policies_site_data_anon.sql](../supabase/policies_site_data_anon.sql)`.

## SQL (run in Supabase SQL Editor)

```sql
create table if not exists public.site_data (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_site_data_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists site_data_set_updated_at on public.site_data;
create trigger site_data_set_updated_at
  before update on public.site_data
  for each row execute function public.set_site_data_updated_at();

-- Optional seed: empty but schema-valid payload (app still works if this row is missing)
insert into public.site_data (id, payload)
values (
  'main',
  jsonb_build_object(
    'homeVideos', '[]'::jsonb,
    'aboutVideos', '[]'::jsonb,
    'memberData', '[]'::jsonb,
    'drBeautyVideos', '[]'::jsonb,
    'profilo', '[]'::jsonb
  )
)
on conflict (id) do nothing;
```

The app reads/writes `id = 'main'`. If no row exists, `[getSiteData()](app/supabase.ts)` returns the bundled `[defaultSiteData](lib/siteData.ts)`.

## Row Level Security

Enable RLS and add policies that match how you deploy.

### RLS: browser + anon key

Use this when the admin UI calls Supabase **from the browser** with `**NEXT_PUBLIC_ANON_KEY`** and **no logged-in Supabase Auth user**. Everyone with your anon key can read/write `site_data` — acceptable only for **private / dev** admin; for production prefer **Auth + `authenticated` policies** or a **server route** with the service role.

```sql
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
```

### RLS: authenticated users only

If users sign in with Supabase Auth, use `**authenticated**` (not `anon`) and drop or avoid broad anon policies:

```sql
alter table public.site_data enable row level security;

drop policy if exists "site_data_select_authenticated" on public.site_data;
drop policy if exists "site_data_insert_authenticated" on public.site_data;
drop policy if exists "site_data_update_authenticated" on public.site_data;

create policy "site_data_select_authenticated"
  on public.site_data for select
  to authenticated
  using (true);

create policy "site_data_insert_authenticated"
  on public.site_data for insert
  to authenticated
  with check (true);

create policy "site_data_update_authenticated"
  on public.site_data for update
  to authenticated
  using (true)
  with check (true);
```

If you use only `NEXT_PUBLIC_ANON_KEY` **without** Auth sessions, the `**authenticated`** policies above will **not** apply; use the **anon** block or switch to Auth / server-side writes.

## Legacy `profile_videos`

The admin UI no longer uses `profile_videos`. Migrate data manually if needed, then archive or drop that table when safe.