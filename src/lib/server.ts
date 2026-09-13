import "server-only";
import { createClient } from "@supabase/supabase-js";
import { parseTour } from "./tour-response";
import { fixtures, demoRegions } from "./fixtures";
import {
  overlaps,
  plain,
  homepageUrl,
  type FestivalDetail,
  type FestivalSummary,
} from "./domain";
export const demo = () =>
  process.env.DATA_MODE === "demo" ||
  (!process.env.DATA_MODE &&
    process.env.NODE_ENV !== "production" &&
    !process.env.SUPABASE_URL);
export function db(write = false) {
  const url = process.env.SUPABASE_URL,
    key = write
      ? process.env.SUPABASE_SERVER_SECRET_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Database is not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function tour(
  operation: string,
  params: Record<string, string> = {},
) {
  const key = process.env.TOUR_API_SERVICE_KEY;
  if (!key) throw new Error("TourAPI is not configured");
  const budget = await db(true).rpc("reserve_tour_call");
  if (budget.error || !budget.data)
    throw new Error("TourAPI daily budget exhausted");
  const u = new URL("https://apis.data.go.kr/B551011/KorService2/" + operation);
  u.search = new URLSearchParams({
    serviceKey: key,
    MobileOS: "WEB",
    MobileApp: "DateMap",
    _type: "json",
    numOfRows: "100",
    pageNo: "1",
    ...params,
  }).toString();
  const res = await fetch(u, {
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error("Upstream unavailable");
  return parseTour(text);
}
export async function list(
  start: string,
  end: string,
  region: string,
  page: number,
  limit: number,
) {
  if (demo()) {
    const rows = fixtures().filter(
      (f) => overlaps(f, start, end) && (!region || f.regionCode === region),
    );
    return {
      items: rows.slice((page - 1) * limit, page * limit).map(summary),
      total: rows.length,
      demo: true,
    };
  }
  let query = db()
    .from("festivals")
    .select("data", { count: "exact" })
    .lte("start_date", end)
    .gte("end_date", start)
    .eq("visible", true);
  if (region) query = query.eq("region_code", region);
  const { data, error, count } = await query
    .order("start_date")
    .order("content_id")
    .range((page - 1) * limit, page * limit - 1);
  if (error) throw new Error("Database read failed");
  return {
    items: (data ?? []).map((r) => summary(r.data)),
    total: count ?? 0,
    demo: false,
  };
}
function summary(f: FestivalDetail): FestivalSummary {
  const {
    contentId,
    title,
    startDate,
    endDate,
    address,
    latitude,
    longitude,
    imageUrl,
    thumbnailUrl,
    regionCode,
    districtCode,
    copyrightCode,
  } = f;
  return {
    contentId,
    title,
    startDate,
    endDate,
    address,
    latitude,
    longitude,
    imageUrl,
    thumbnailUrl,
    regionCode,
    districtCode,
    copyrightCode,
  };
}
export async function detail(
  id: string,
): Promise<{ item: FestivalDetail; demo: boolean; stale?: boolean } | null> {
  if (demo()) {
    const item = fixtures().find((f) => f.contentId === id);
    return item ? { item, demo: true } : null;
  }
  const { data, error } = await db()
    .from("festivals")
    .select("*")
    .eq("content_id", id)
    .eq("visible", true)
    .maybeSingle();
  if (error) throw new Error("Database read failed");
  if (!data) return null;
  let item = data.data as FestivalDetail;
  if (
    !data.detail_synced_at ||
    Date.now() - Date.parse(data.detail_synced_at) > 86400000
  ) {
    try {
      const [c, i] = await Promise.all([
        tour("detailCommon2", { contentId: id }),
        tour("detailIntro2", { contentId: id, contentTypeId: "15" }),
      ]);
      if (!c.items.length || !i.items.length) throw new Error("Missing detail");
      const common = c.items[0],
        intro = i.items[0];
      item = {
        ...item,
        overview: plain(common.overview),
        eventPlace: plain(intro.eventplace),
        program: plain(intro.program),
        performanceTime: plain(intro.playtime),
        fee: plain(intro.usetimefestival),
        parking: null,
        bookingPlace: plain(intro.bookingplace),
        homepageUrl:
          homepageUrl(common.homepage) || homepageUrl(intro.eventhomepage),
        contact: plain(intro.sponsor1tel) || plain(common.tel),
      };
      const saved = await db(true)
        .from("festivals")
        .update({ data: item, detail_synced_at: new Date().toISOString() })
        .eq("content_id", id)
        .eq("source_modified", data.source_modified);
      if (saved.error) throw new Error("Detail save failed");
    } catch {
      return { item, demo: false, stale: true };
    }
  }
  return { item, demo: false };
}
export async function regions() {
  if (demo()) return demoRegions;
  const { data, error } = await db()
    .from("regions")
    .select("code,name,district_code,district_name")
    .order("code");
  if (error) throw new Error("Regions unavailable");
  return data ?? [];
}
