import type { SiteData } from "@/lib/siteData";
import { defaultSiteData, isValidSiteData } from "@/lib/siteData";
import {
  type CmsAboutPayload,
  type CmsContactPayload,
  type CmsSegment,
  composeSiteData,
  defaultCmsAboutPayload,
  defaultCmsContactPayload,
  defaultCmsDrBeautyPayload,
  defaultCmsIndexPayload,
  defaultCmsPortfolioPayload,
  validateCmsAboutPayload,
  validateCmsContactPayload,
  validateCmsDrBeautyPayload,
  validateCmsIndexPayload,
  validateCmsPortfolioPayload,
} from "@/lib/cmsPayloads";

/** Browser client: reads/writes go through \`/api/cms/[segment]\` (service role on server, bypasses RLS). */

export type AdminTab =
  | "home"
  | "about"
  | "members"
  | "contact"
  | "drbeauty"
  | "profilo";

function apiPath(segment: CmsSegment): string {
  return `/api/cms/${segment}`;
}

async function fetchCmsJson(segment: CmsSegment): Promise<unknown> {
  const res = await fetch(apiPath(segment), { cache: "no-store" });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
    };
    throw new Error(j.error ?? `GET ${segment} failed (${res.status})`);
  }
  const { payload } = (await res.json()) as { payload: unknown };
  return payload;
}

/** Load all CMS tables and merge into one \`SiteData\` (for the admin UI). */
export async function getSiteData(): Promise<SiteData> {
  const [index, about, contact, drBeauty, portfolio] = await Promise.all([
    fetchCmsJson("index"),
    fetchCmsJson("about"),
    fetchCmsJson("contact"),
    fetchCmsJson("dr-beauty"),
    fetchCmsJson("portfolio"),
  ]);

  const idx = validateCmsIndexPayload(index)
    ? index
    : structuredClone(defaultCmsIndexPayload);
  const ab = validateCmsAboutPayload(about)
    ? about
    : structuredClone(defaultCmsAboutPayload);
  const ct = validateCmsContactPayload(contact)
    ? contact
    : structuredClone(defaultCmsContactPayload);
  const dr = validateCmsDrBeautyPayload(drBeauty)
    ? drBeauty
    : structuredClone(defaultCmsDrBeautyPayload);
  const pf = validateCmsPortfolioPayload(portfolio)
    ? portfolio
    : structuredClone(defaultCmsPortfolioPayload);

  return composeSiteData({
    index: idx,
    about: ab,
    contact: ct,
    drBeauty: dr,
    portfolio: pf,
  });
}

/** Latest row from `cms_about` (About + Members tabs). */
export async function getCmsAboutPayload(): Promise<CmsAboutPayload> {
  const raw = await fetchCmsJson("about");
  return validateCmsAboutPayload(raw)
    ? raw
    : structuredClone(defaultCmsAboutPayload);
}

/** Latest row from `cms_contact` (Contact tab). */
export async function getCmsContactPayload(): Promise<CmsContactPayload> {
  const raw = await fetchCmsJson("contact");
  return validateCmsContactPayload(raw)
    ? raw
    : structuredClone(defaultCmsContactPayload);
}

/** Persist one admin tab’s slice (debounced per tab in the UI). */
export async function saveSiteDataTab(tab: AdminTab, data: SiteData): Promise<void> {
  switch (tab) {
    case "home": {
      const res = await fetch(apiPath("index"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeVideos: data.homeVideos }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `PUT index failed (${res.status})`);
      }
      return;
    }
    case "about": {
      const res = await fetch(`${apiPath("about")}?section=about`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aboutVideos: data.aboutVideos }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `PUT about failed (${res.status})`);
      }
      return;
    }
    case "members": {
      const res = await fetch(`${apiPath("about")}?section=members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberData: data.memberData }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `PUT about (members) failed (${res.status})`);
      }
      return;
    }
    case "contact": {
      const res = await fetch(apiPath("contact"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactVideos: data.contactVideos }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `PUT contact failed (${res.status})`);
      }
      return;
    }
    case "drbeauty": {
      const res = await fetch(apiPath("dr-beauty"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drBeautyVideos: data.drBeautyVideos }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `PUT dr-beauty failed (${res.status})`);
      }
      return;
    }
    case "profilo": {
      const res = await fetch(apiPath("portfolio"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilo: data.profilo }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `PUT portfolio failed (${res.status})`);
      }
      return;
    }
    default: {
      const _x: never = tab;
      throw new Error(`Unhandled tab: ${String(_x)}`);
    }
  }
}

/**
 * Save the current tab only (matches server merge rules for \`cms_about\`).
 * \`saveNow\` uses this; full multi-tab flush can call this once per distinct tab if needed.
 */
export async function upsertSiteDataForTab(tab: AdminTab, data: SiteData): Promise<void> {
  await saveSiteDataTab(tab, data);
}

/** @deprecated Prefer \`getSiteData\` + per-tab \`saveSiteDataTab\`. Replaces rows in all five CMS tables. */
export async function upsertSiteData(payload: SiteData): Promise<SiteData> {
  const put = async (segment: CmsSegment, body: unknown) => {
    const res = await fetch(apiPath(segment), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? `PUT ${segment} failed (${res.status})`);
    }
  };

  await Promise.all([
    put("index", { homeVideos: payload.homeVideos }),
    put("about", {
      aboutVideos: payload.aboutVideos,
      memberData: payload.memberData,
    }),
    put("contact", { contactVideos: payload.contactVideos }),
    put("dr-beauty", { drBeautyVideos: payload.drBeautyVideos }),
    put("portfolio", { profilo: payload.profilo }),
  ]);

  const out = await getSiteData();
  return isValidSiteData(out) ? out : structuredClone(defaultSiteData);
}
