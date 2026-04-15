/**
 * Prints SQL for Supabase SQL Editor: upserts `defaultSiteData` into `site_data`.
 * Run: npx tsx scripts/emit-default-site-data-sql.ts > supabase/seed_default_site_data.sql
 */
import { defaultSiteData } from "../lib/siteData";

const tag = "site_data_payload";
const json = JSON.stringify(defaultSiteData);
// PostgreSQL dollar-quote: $tag$ ... $tag$ — build delimiters without nested `${json}` touching `$${tag}`
const delim = `$${tag}$`;

console.log(`-- Generated from lib/siteData.ts (defaultSiteData). Regenerate: npx tsx scripts/emit-default-site-data-sql.ts
-- Run in Supabase → SQL Editor after \`site_data\` table exists.

insert into public.site_data (id, payload)
values (
  'main',
${delim}${json}${delim}::jsonb
)
on conflict (id) do update
  set payload = excluded.payload,
      updated_at = now();
`);
