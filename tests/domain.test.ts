import { test } from "node:test";
import assert from "node:assert/strict";
import {
  today,
  dateRange,
  validDate,
  normalize,
  distance,
  overlaps,
  safeUrl,
} from "../src/lib/domain";
import { fixtures } from "../src/lib/fixtures";
test("Korean midnight and weekend across month and year boundaries", () => {
  assert.equal(today(new Date("2026-12-31T15:00:00Z")), "2027-01-01");
  assert.deepEqual(dateRange("weekend", "2026-09-13"), {
    start: "2026-09-12",
    end: "2026-09-13",
  });
  assert.deepEqual(dateRange("weekend", "2026-09-14"), {
    start: "2026-09-19",
    end: "2026-09-20",
  });
  assert.deepEqual(dateRange("month", "2026-12-15"), {
    start: "2026-12-15",
    end: "2027-01-13",
  });
});
test("Inclusive overlap retains already-running and single-day events", () => {
  const f = {
    ...fixtures()[0],
    startDate: "2026-09-01",
    endDate: "2026-09-12",
  };
  assert.ok(overlaps(f, "2026-09-12", "2026-09-13"));
  assert.ok(!overlaps(f, "2026-09-13", "2026-09-13"));
});
test("Invalid dates and unusable coordinates are never rendered as real locations", () => {
  assert.ok(!validDate("2026-02-30"));
  assert.ok(!validDate("2026-2-3"));
  assert.equal(
    normalize({
      contentid: "1",
      title: "bad",
      eventstartdate: "20260230",
      eventenddate: "20260301",
    }),
    null,
  );
  const f = normalize({
    contentid: "1",
    title: "A",
    eventstartdate: "20260901",
    eventenddate: "20260902",
    mapx: "0",
    mapy: "bad",
    firstimage: "javascript:alert(1)",
  });
  assert.equal(f?.latitude, null);
  assert.equal(f?.longitude, null);
  assert.equal(f?.imageUrl, null);
});
test("Distance is straight-line kilometers and unsafe links are rejected", () => {
  assert.equal(distance(35, 128, 35, 128), 0);
  assert.ok(distance(0, 1, 0, 2) > 111 && distance(0, 1, 0, 2) < 112);
  assert.equal(safeUrl("javascript:alert(1)"), null);
});
