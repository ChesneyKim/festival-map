export type FestivalSummary = {
  contentId: string;
  title: string;
  startDate: string;
  endDate: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  regionCode: string | null;
  districtCode: string | null;
  copyrightCode: string | null;
};
export type FestivalDetail = FestivalSummary & {
  overview: string | null;
  eventPlace: string | null;
  program: string | null;
  performanceTime: string | null;
  fee: string | null;
  parking: string | null;
  bookingPlace: string | null;
  homepageUrl: string | null;
  contact: string | null;
};
export type Region = {
  code: string;
  name: string;
  districtCode?: string;
  districtName?: string;
};
export function today(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function validDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
export function addDays(s: string, n: number) {
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function dateRange(preset: string, date = today()) {
  if (preset === "today") return { start: date, end: date };
  if (preset === "month") return { start: date, end: addDays(date, 29) };
  const day = new Date(date).getUTCDay();
  const start = addDays(date, day === 0 ? -1 : 6 - day);
  return { start, end: addDays(start, 1) };
}
export function overlaps(f: FestivalSummary, start: string, end: string) {
  return f.startDate <= end && f.endDate >= start;
}
export function distance(a: number, b: number, c: number, d: number) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((c - a) * rad) / 2) ** 2 +
    Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function safeUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v);
    return ["http:", "https:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
export function homepageUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const href = v.match(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
  return safeUrl((href ?? v).replace(/&amp;/g, "&"));
}
export function plain(v: unknown): string | null {
  return typeof v === "string"
    ? v
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim() || null
    : null;
}
export function normalize(r: Record<string, unknown>): FestivalSummary | null {
  const parse = (v: unknown) => {
    const s = String(v ?? "");
    const d =
      s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}` : s;
    return validDate(d) ? d : null;
  };
  const startDate = parse(r.eventstartdate),
    endDate = parse(r.eventenddate);
  if (
    !r.contentid ||
    !plain(r.title) ||
    !startDate ||
    !endDate ||
    endDate < startDate
  )
    return null;
  const coord = (v: unknown, min: number, max: number) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n !== 0 && n >= min && n <= max ? n : null;
  };
  return {
    contentId: String(r.contentid),
    title: plain(r.title)!,
    startDate,
    endDate,
    address: [plain(r.addr1), plain(r.addr2)].filter(Boolean).join(" ") || null,
    latitude: coord(r.mapy, -90, 90),
    longitude: coord(r.mapx, -180, 180),
    imageUrl: safeUrl(r.firstimage),
    thumbnailUrl: safeUrl(r.firstimage2),
    regionCode: plain(r.lDongRegnCd),
    districtCode: plain(r.lDongSignguCd),
    copyrightCode: plain(r.cpyrhtDivCd),
  };
}
