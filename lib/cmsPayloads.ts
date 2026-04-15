import defaultSiteData, {
  type AboutVideo,
  type DrBeautyVideo,
  type HomeVideo,
  type MemberItem,
  type ProfiloCategory,
  type SiteData,
} from "./siteData";

/** URL segment → Supabase table name */
export const CMS_SEGMENT_TABLE: Record<CmsSegment, string> = {
  index: "cms_index",
  about: "cms_about",
  contact: "cms_contact",
  "dr-beauty": "cms_dr_beauty",
  portfolio: "cms_portfolio",
};

export type CmsSegment = "index" | "about" | "contact" | "dr-beauty" | "portfolio";

export const CMS_SEGMENTS: CmsSegment[] = ["index", "about", "contact", "dr-beauty", "portfolio"];

export type CmsIndexPayload = Pick<SiteData, "homeVideos">;
export type CmsAboutPayload = Pick<SiteData, "aboutVideos" | "memberData">;
export type CmsContactPayload = Pick<SiteData, "contactVideos">;
export type CmsDrBeautyPayload = Pick<SiteData, "drBeautyVideos">;
export type CmsPortfolioPayload = Pick<SiteData, "profilo">;

export const defaultCmsIndexPayload: CmsIndexPayload = {
  homeVideos: defaultSiteData.homeVideos,
};

export const defaultCmsAboutPayload: CmsAboutPayload = {
  aboutVideos: defaultSiteData.aboutVideos,
  memberData: defaultSiteData.memberData,
};

export const defaultCmsContactPayload: CmsContactPayload = {
  contactVideos: defaultSiteData.contactVideos,
};

export const defaultCmsDrBeautyPayload: CmsDrBeautyPayload = {
  drBeautyVideos: defaultSiteData.drBeautyVideos,
};

export const defaultCmsPortfolioPayload: CmsPortfolioPayload = {
  profilo: defaultSiteData.profilo,
};

export function isCmsSegment(s: string): s is CmsSegment {
  return CMS_SEGMENTS.includes(s as CmsSegment);
}

export function validateCmsIndexPayload(p: unknown): p is CmsIndexPayload {
  if (typeof p !== "object" || p === null) return false;
  const o = p as Record<string, unknown>;
  return Array.isArray(o.homeVideos);
}

export function validateCmsAboutPayload(p: unknown): p is CmsAboutPayload {
  if (typeof p !== "object" || p === null) return false;
  const o = p as Record<string, unknown>;
  return Array.isArray(o.aboutVideos) && Array.isArray(o.memberData);
}

export function validateCmsContactPayload(p: unknown): p is CmsContactPayload {
  if (typeof p !== "object" || p === null) return false;
  const o = p as Record<string, unknown>;
  return Array.isArray(o.contactVideos);
}

export function validateCmsDrBeautyPayload(p: unknown): p is CmsDrBeautyPayload {
  if (typeof p !== "object" || p === null) return false;
  const o = p as Record<string, unknown>;
  return Array.isArray(o.drBeautyVideos);
}

export function validateCmsPortfolioPayload(p: unknown): p is CmsPortfolioPayload {
  if (typeof p !== "object" || p === null) return false;
  const o = p as Record<string, unknown>;
  return Array.isArray(o.profilo);
}

/** Merge partial About tab save into existing `cms_about` row. */
export function mergeCmsAboutAboutVideos(
  base: CmsAboutPayload,
  aboutVideos: AboutVideo[],
): CmsAboutPayload {
  return { ...base, aboutVideos };
}

/** Merge partial Members tab save into existing `cms_about` row. */
export function mergeCmsAboutMemberData(
  base: CmsAboutPayload,
  memberData: MemberItem[],
): CmsAboutPayload {
  return { ...base, memberData };
}

/** Assemble full SiteData from per-table payloads (same shape as defaultSiteData). */
export function composeSiteData(parts: {
  index: CmsIndexPayload;
  about: CmsAboutPayload;
  contact: CmsContactPayload;
  drBeauty: CmsDrBeautyPayload;
  portfolio: CmsPortfolioPayload;
}): SiteData {
  return {
    homeVideos: parts.index.homeVideos as HomeVideo[],
    aboutVideos: parts.about.aboutVideos,
    memberData: parts.about.memberData,
    contactVideos: parts.contact.contactVideos as HomeVideo[],
    drBeautyVideos: parts.drBeauty.drBeautyVideos as DrBeautyVideo[],
    profilo: parts.portfolio.profilo as ProfiloCategory[],
  };
}
