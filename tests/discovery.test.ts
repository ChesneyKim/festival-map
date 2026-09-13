import { test } from "node:test";
import assert from "node:assert/strict";
import { discover, isLongRunning, validRange } from "../src/lib/discovery";
import type { FestivalSummary } from "../src/lib/domain";
const make = (
  id: string,
  start: string,
  end: string,
  district = "110",
  km: number | null = null,
) =>
  ({
    contentId: id,
    title: `축제 ${id}`,
    address: "서울",
    startDate: start,
    endDate: end,
    districtCode: district,
    regionCode: "11",
    latitude: null,
    longitude: null,
    imageUrl: null,
    thumbnailUrl: null,
    copyrightCode: null,
    km,
  }) satisfies FestivalSummary & { km: number | null };
const options = {
  query: "",
  district: "",
  duration: "all",
  sort: "ending",
  date: "2026-09-13",
} as const;
test("custom date ranges validate boundaries and maximum span", () => {
  assert.equal(validRange("2026-09-13", "2026-09-13"), true);
  assert.equal(validRange("2026-09-13", "2027-09-13"), true);
  assert.equal(validRange("2026-09-13", "2027-09-14"), false);
  assert.equal(validRange("2026-02-30", "2026-03-01"), false);
  assert.equal(validRange("", "2026-03-01"), false);
  assert.equal(validRange("2026-03-02", "2026-03-01"), false);
});
test("duration labels use inclusive 30 day boundary without inferring category", () => {
  assert.equal(isLongRunning(make("a", "2026-09-01", "2026-09-30")), false);
  assert.equal(isLongRunning(make("b", "2026-09-01", "2026-10-01")), true);
});
test("query, district and duration combine without mutating input", () => {
  const items = [
    make("A", "2026-09-01", "2026-09-30"),
    make("B", "2026-01-01", "2026-12-31", "140"),
  ];
  assert.deepEqual(
    discover(items, {
      ...options,
      query: "  축제 a ",
      district: "110",
      duration: "short",
    }).map((f) => f.contentId),
    ["A"],
  );
  assert.equal(
    discover(items, { ...options, query: "서울", duration: "long" }).length,
    1,
  );
  assert.equal(discover(items, { ...options, district: "999" }).length, 0);
  assert.equal(items[0].contentId, "A");
});
test("ending, upcoming and distance orders are deterministic", () => {
  const items = [
    make("long", "2026-01-01", "2026-12-31"),
    make("new", "2026-09-15", "2026-09-20", "110", 12),
    make("now", "2026-09-12", "2026-09-14", "110", 3),
  ];
  assert.deepEqual(
    discover(items, options).map((f) => f.contentId),
    ["now", "new", "long"],
  );
  assert.deepEqual(
    discover(items, { ...options, sort: "starting" }).map((f) => f.contentId),
    ["new", "now", "long"],
  );
  assert.deepEqual(
    discover(items, { ...options, sort: "distance" }).map((f) => f.contentId),
    ["now", "new", "long"],
  );
});
