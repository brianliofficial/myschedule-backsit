"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCmsAboutPayload,
  getCmsContactPayload,
  getSiteData,
  saveSiteDataTab,
  type AdminTab,
} from "./supabase";
import type { SiteData } from "@/lib/siteData";
import { defaultSiteData } from "@/lib/siteData";
import { debounce } from "@/lib/debounce";

/** @dnd-kit generates aria-describedby ids that differ SSR vs client — load DnD only in the browser. */
const dndLoading = (
  <div className="py-8 text-sm text-gray-500">載入中…</div>
);

const VideoUrlSection = dynamic(
  () =>
    import("./components/VideoUrlSection").then((m) => m.VideoUrlSection),
  { ssr: false, loading: () => dndLoading }
);

const MemberDataSection = dynamic(
  () =>
    import("./components/MemberDataSection").then((m) => m.MemberDataSection),
  { ssr: false, loading: () => dndLoading }
);

const DrBeautySection = dynamic(
  () =>
    import("./components/DrBeautySection").then((m) => m.DrBeautySection),
  { ssr: false, loading: () => dndLoading }
);

const ProfiloBoard = dynamic(
  () => import("./components/ProfiloBoard").then((m) => m.ProfiloBoard),
  { ssr: false, loading: () => dndLoading }
);

export default function SiteDataAdminPage() {
  const [siteData, setSiteData] = useState<SiteData>(() =>
    structuredClone(defaultSiteData)
  );
  const [tab, setTab] = useState<AdminTab>("profilo");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "saving" | "saved" | "error"
  >("loading");

  const debouncedByTab = useMemo(() => {
    const wrap = (t: AdminTab) =>
      debounce((data: SiteData) => {
        setSaveError(null);
        setStatus("saving");
        saveSiteDataTab(t, data)
          .then(() => {
            setStatus("saved");
            setTimeout(() => setStatus("idle"), 1200);
          })
          .catch((e) => {
            console.error(e);
            const msg = e instanceof Error ? e.message : String(e);
            setSaveError(msg);
            setStatus("error");
          });
      }, 900);
    return {
      home: wrap("home"),
      about: wrap("about"),
      members: wrap("members"),
      contact: wrap("contact"),
      drbeauty: wrap("drbeauty"),
      profilo: wrap("profilo"),
    };
  }, []);

  function tabForSiteDataKey(key: keyof SiteData): AdminTab | null {
    switch (key) {
      case "homeVideos":
        return "home";
      case "aboutVideos":
        return "about";
      case "memberData":
        return "members";
      case "drBeautyVideos":
        return "drbeauty";
      case "profilo":
        return "profilo";
      case "contactVideos":
        return "contact";
      default: {
        const _u: never = key;
        return _u;
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    getSiteData()
      .then((data) => {
        if (!cancelled) {
          setSiteData(data);
          setLoadError(null);
          setStatus("idle");
        }
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setLoadError(
            `無法載入 CMS 資料，已顯示預設內容。${msg ? `（${msg}）` : ""}`
          );
          setSiteData(structuredClone(defaultSiteData));
          setStatus("idle");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** About / Members：只與 `cms_about` 同步；Contact：只與 `cms_contact` 同步。 */
  useEffect(() => {
    if (tab !== "about" && tab !== "members" && tab !== "contact") return;
    let cancelled = false;
    const run = async () => {
      try {
        if (tab === "contact") {
          const ct = await getCmsContactPayload();
          if (cancelled) return;
          setSiteData((prev) => ({
            ...prev,
            contactVideos: ct.contactVideos,
          }));
        } else {
          const ab = await getCmsAboutPayload();
          if (cancelled) return;
          setSiteData((prev) => ({
            ...prev,
            aboutVideos: ab.aboutVideos,
            memberData: ab.memberData,
          }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  function update<K extends keyof SiteData>(key: K, value: SiteData[K]) {
    setSiteData((prev) => {
      const next = { ...prev, [key]: value };
      const t = tabForSiteDataKey(key);
      if (t) debouncedByTab[t](next);
      return next;
    });
  }

  async function saveNow() {
    setSaveError(null);
    setStatus("saving");
    try {
      await saveSiteDataTab(tab, siteData);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1200);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setSaveError(msg);
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col md:h-screen md:overflow-hidden">
      <div className="mx-auto w-full max-w-7xl shrink-0 px-4 pt-8 md:px-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              SiteData 後台
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              About／Members 讀寫 <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">cms_about</code>
              ；Contact 讀寫 <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">cms_contact</code>
              。切換至該分頁會向對應表重新 GET 最新資料。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {status === "loading" && (
              <span className="text-sm text-gray-500">載入中…</span>
            )}
            {status === "saving" && (
              <span className="text-sm text-gray-500">儲存中…</span>
            )}
            {status === "saved" && (
              <span className="text-sm text-green-600">已儲存</span>
            )}
          {status === "error" && (
            <span className="max-w-md truncate text-sm text-red-600" title={saveError ?? ""}>
              儲存失敗{saveError ? `：${saveError}` : ""}
            </span>
          )}
            <button
              type="button"
              onClick={saveNow}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              立即儲存
            </button>
          </div>
        </header>

        {loadError ? (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {loadError}
          </p>
        ) : null}

        <nav className="mb-8 flex flex-wrap gap-2 border-b border-gray-200 pb-2">
          {(
            [
              ["home", "Homepage"],
              ["about", "About"],
              ["members", "Members"],
              ["contact", "Contact"],
              ["drbeauty", "DR.BEAUTY"],
              ["profilo", "Profilo"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === key
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mx-auto min-h-0 w-full max-w-7xl flex-1 overflow-y-auto px-4 pb-8 md:px-8">
      {tab === "home" && (
        <div className="w-full md:mx-auto md:max-w-[500px]">
          <VideoUrlSection
            title="Homepage 影片（homeVideos）"
            items={siteData.homeVideos}
            onChange={(items) => update("homeVideos", items)}
          />
        </div>
      )}

      {tab === "about" && (
        <div className="w-full md:mx-auto md:max-w-[500px]">
          <VideoUrlSection
            title="About 影片（aboutVideos）"
            items={siteData.aboutVideos}
            onChange={(items) => update("aboutVideos", items)}
          />
        </div>
      )}

      {tab === "members" && (
        <div className="w-full md:mx-auto md:max-w-[500px]">
          <MemberDataSection
            items={siteData.memberData}
            onChange={(items) => update("memberData", items)}
          />
        </div>
      )}

      {tab === "contact" && (
        <div className="w-full md:mx-auto md:max-w-[500px]">
          <VideoUrlSection
            title="Contact 影片（contactVideos）"
            items={siteData.contactVideos}
            onChange={(items) => update("contactVideos", items)}
          />
        </div>
      )}

      {tab === "drbeauty" && (
        <div className="w-full md:mx-auto md:max-w-[500px]">
          <DrBeautySection
            items={siteData.drBeautyVideos}
            onChange={(items) => update("drBeautyVideos", items)}
          />
        </div>
      )}

      {tab === "profilo" && (
        <ProfiloBoard
          profilo={siteData.profilo}
          onChange={(nextProfilo) => update("profilo", nextProfilo)}
        />
      )}
      </div>
    </div>
  );
}
