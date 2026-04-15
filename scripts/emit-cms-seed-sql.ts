/**
 * Prints SQL for Supabase SQL Editor: inserts default slices into cms_* tables.
 * Run: npx tsx scripts/emit-cms-seed-sql.ts > supabase/cms_seed_defaults.sql
 */
import {
  defaultCmsAboutPayload,
  defaultCmsContactPayload,
  defaultCmsDrBeautyPayload,
  defaultCmsIndexPayload,
  defaultCmsPortfolioPayload,
} from "../lib/cmsPayloads";

const tag = "cms_payload";
const json = (obj: unknown) => JSON.stringify(obj);
const delim = `$${tag}$`;

function insert(table: string, payload: unknown) {
  const j = json(payload);
  return `insert into public.${table} (payload)
values (
${delim}${j}${delim}::jsonb
);`;
}

console.log(`-- Generated from lib/cmsPayloads defaults. Regenerate: npx tsx scripts/emit-cms-seed-sql.ts
-- Run in Supabase SQL Editor after cms_tables.sql has been applied.

${insert("cms_index", defaultCmsIndexPayload)}

${insert("cms_about", defaultCmsAboutPayload)}

${insert("cms_contact", defaultCmsContactPayload)}

${insert("cms_dr_beauty", defaultCmsDrBeautyPayload)}

${insert("cms_portfolio", defaultCmsPortfolioPayload)}
`);
