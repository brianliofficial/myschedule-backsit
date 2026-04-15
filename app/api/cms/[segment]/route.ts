import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  CMS_SEGMENT_TABLE,
  type CmsAboutPayload,
  type CmsSegment,
  defaultCmsAboutPayload,
  defaultCmsContactPayload,
  defaultCmsDrBeautyPayload,
  defaultCmsIndexPayload,
  defaultCmsPortfolioPayload,
  isCmsSegment,
  validateCmsAboutPayload,
  validateCmsContactPayload,
  validateCmsDrBeautyPayload,
  validateCmsIndexPayload,
  validateCmsPortfolioPayload,
} from "@/lib/cmsPayloads";

export const dynamic = "force-dynamic";

const MISSING_KEY_MSG =
  "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL. Add the service role key to .env.local (Supabase Dashboard → Project Settings → API → service_role, never NEXT_PUBLIC_) and restart the dev server.";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type ServiceClient = NonNullable<ReturnType<typeof getServiceClient>>;

async function getLatestPayload(
  supabase: ServiceClient,
  table: string
): Promise<unknown | null> {
  const { data, error } = await supabase
    .from(table)
    .select("payload")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const row = data as { payload?: unknown } | null;
  return row?.payload ?? null;
}

function defaultPayloadForSegment(segment: CmsSegment): unknown {
  switch (segment) {
    case "index":
      return defaultCmsIndexPayload;
    case "about":
      return defaultCmsAboutPayload;
    case "contact":
      return defaultCmsContactPayload;
    case "dr-beauty":
      return defaultCmsDrBeautyPayload;
    case "portfolio":
      return defaultCmsPortfolioPayload;
    default:
      return {};
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ segment: string }> }
) {
  const { segment: raw } = await context.params;
  const segment = raw;

  if (process.env.NODE_ENV === "development") {
    const url = new URL(request.url);
    if (url.searchParams.get("diag") === "1") {
      return NextResponse.json({
        hasNextPublicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      });
    }
  }

  if (!isCmsSegment(segment)) {
    return NextResponse.json({ error: "Unknown CMS segment" }, { status: 404 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: MISSING_KEY_MSG }, { status: 500 });
  }

  const table = CMS_SEGMENT_TABLE[segment];

  try {
    const payload = await getLatestPayload(supabase, table);
    const fallback = defaultPayloadForSegment(segment);
    const out =
      payload === null
        ? structuredClone(fallback)
        : validatePayload(segment, payload)
          ? payload
          : structuredClone(fallback);

    return NextResponse.json({ payload: out });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function validatePayload(segment: CmsSegment, payload: unknown): boolean {
  switch (segment) {
    case "index":
      return validateCmsIndexPayload(payload);
    case "about":
      return validateCmsAboutPayload(payload);
    case "contact":
      return validateCmsContactPayload(payload);
    case "dr-beauty":
      return validateCmsDrBeautyPayload(payload);
    case "portfolio":
      return validateCmsPortfolioPayload(payload);
    default:
      return false;
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ segment: string }> }
) {
  const { segment: raw } = await context.params;
  const segment = raw;

  if (!isCmsSegment(segment)) {
    return NextResponse.json({ error: "Unknown CMS segment" }, { status: 404 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: MISSING_KEY_MSG }, { status: 500 });
  }

  const table = CMS_SEGMENT_TABLE[segment];

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (segment === "about") {
      const url = new URL(request.url);
      const section = url.searchParams.get("section");
      const latestRaw = await getLatestPayload(supabase, table);
      const base: CmsAboutPayload = validateCmsAboutPayload(latestRaw)
        ? (latestRaw as CmsAboutPayload)
        : structuredClone(defaultCmsAboutPayload);

      let merged: CmsAboutPayload;

      if (section === "about") {
        const o = body as Record<string, unknown>;
        if (!Array.isArray(o.aboutVideos)) {
          return NextResponse.json(
            { error: "aboutVideos array required for section=about" },
            { status: 400 }
          );
        }
        merged = { ...base, aboutVideos: o.aboutVideos as CmsAboutPayload["aboutVideos"] };
      } else if (section === "members") {
        const o = body as Record<string, unknown>;
        if (!Array.isArray(o.memberData)) {
          return NextResponse.json(
            { error: "memberData array required for section=members" },
            { status: 400 }
          );
        }
        merged = { ...base, memberData: o.memberData as CmsAboutPayload["memberData"] };
      } else {
        if (!validateCmsAboutPayload(body)) {
          return NextResponse.json(
            { error: "Invalid cms_about payload (expect aboutVideos + memberData)" },
            { status: 400 }
          );
        }
        merged = body as CmsAboutPayload;
      }

      const { data, error } = await supabase
        .from(table)
        .insert({ payload: merged })
        .select("payload")
        .single();

      if (error) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: 500 }
        );
      }
      return NextResponse.json({ payload: (data as { payload: CmsAboutPayload }).payload });
    }

    if (!validateBody(segment, body)) {
      return NextResponse.json(
        { error: `Invalid payload for ${segment}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from(table)
      .insert({ payload: body })
      .select("payload")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ payload: (data as { payload: unknown }).payload });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function validateBody(segment: CmsSegment, body: unknown): boolean {
  switch (segment) {
    case "index":
      return validateCmsIndexPayload(body);
    case "contact":
      return validateCmsContactPayload(body);
    case "dr-beauty":
      return validateCmsDrBeautyPayload(body);
    case "portfolio":
      return validateCmsPortfolioPayload(body);
    default:
      return false;
  }
}
