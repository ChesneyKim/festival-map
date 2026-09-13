import { timingSafeEqual } from "node:crypto";
import { db, tour, demo } from "@/lib/server";
import { today, addDays, normalize } from "@/lib/domain";
import { normalizeRegion } from "@/lib/regions";
export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from("Bearer " + secret);
  if (
    !secret ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (demo())
    return Response.json({ error: "Demo cannot sync" }, { status: 409 });
  let run: string | undefined;
  const started = Date.now();
  try {
    const client = db(true);
    const locked = await client.rpc("begin_festival_sync");
    if (locked.error) throw new Error("Cannot begin sync");
    if (!locked.data)
      return Response.json({ status: "already_running" }, { status: 409 });
    run = locked.data;
    const start = today(),
      end = addDays(start, 365);
    const rows = [];
    let pages = 1;
    // Fetch the complete published festival catalogue to include events that started before today.
    for (let page = 1; page <= pages; page++) {
      if (page > 300 || Date.now() - started > 220000)
        throw new Error("Sync budget exceeded");
      const result = await tour("areaBasedList2", {
        contentTypeId: "15",
        pageNo: String(page),
        numOfRows: "100",
        arrange: "A",
      });
      pages = Math.ceil(result.total / 100);
      for (const raw of result.items) {
        // Area lists have no event dates. Retain catalogue and enrich using festival date query below.
        rows.push(raw);
      }
    }
    const byId = new Map<string, Record<string, unknown>>();
    pages = 1;
    for (let page = 1; page <= pages; page++) {
      if (page > 300 || Date.now() - started > 240000)
        throw new Error("Sync budget exceeded");
      const result = await tour("searchFestival2", {
        eventStartDate: "19000101",
        eventEndDate: end.replaceAll("-", ""),
        pageNo: String(page),
        arrange: "A",
      });
      pages = Math.ceil(result.total / 100);
      for (const raw of result.items) byId.set(String(raw.contentid), raw);
    }
    const catalog = new Set(rows.map((r) => String(r.contentid)));
    const records = Array.from(byId.values())
      .map((raw) => ({ raw, item: normalize(raw) }))
      .filter(
        ({ item }) =>
          item &&
          item.endDate >= start &&
          item.startDate <= end &&
          catalog.has(item.contentId),
      )
      .map(({ raw, item }) => ({
        content_id: item!.contentId,
        start_date: item!.startDate,
        end_date: item!.endDate,
        region_code: item!.regionCode,
        latitude: item!.latitude,
        longitude: item!.longitude,
        data: item,
        source_modified: String(raw.modifiedtime || ""),
      }));
    if (rows.length && byId.size === 0)
      throw new Error("Unexpected empty festival response");
    const codes = [];
    pages = 1;
    for (let page = 1; page <= pages; page++) {
      if (page > 30 || Date.now() - started > 260000)
        throw new Error("Region budget exceeded");
      const r = await tour("ldongCode2", {
        lDongListYn: "Y",
        pageNo: String(page),
      });
      pages = Math.ceil(r.total / 100);
      codes.push(...r.items.map(normalizeRegion));
    }
    const saved = await client.rpc("commit_festival_sync", {
      run_id: run,
      records,
      region_records: codes,
    });
    if (saved.error) throw new Error("Commit failed");
    return Response.json({ status: "success", count: records.length });
  } catch {
    if (run) await db(true).rpc("fail_festival_sync", { run_id: run });
    return Response.json(
      { error: "동기화에 실패했습니다. 기존 데이터를 유지합니다." },
      { status: 502 },
    );
  }
}
