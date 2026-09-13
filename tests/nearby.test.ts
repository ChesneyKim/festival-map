import { test } from "node:test";
import assert from "node:assert/strict";
import { nearbyFestivals, requestPosition } from "../src/lib/nearby";
import { fixtures } from "../src/lib/fixtures";

test("10/30/50 km radii include boundaries, exclude missing coordinates and sort nearest first", () => {
  const base = fixtures()[0];
  const rows = [45, 25, 5].map((km) => ({
    ...base,
    contentId: String(km),
    latitude: 0,
    longitude: ((km / 6371) * 180) / Math.PI,
  }));
  const missing = {
    ...base,
    contentId: "missing",
    latitude: null,
    longitude: null,
  };
  assert.deepEqual(
    nearbyFestivals([...rows, missing], [0, 0], 10).map((r) => r.contentId),
    ["5"],
  );
  assert.deepEqual(
    nearbyFestivals([...rows, missing], [0, 0], 30).map((r) => r.contentId),
    ["5", "25"],
  );
  assert.deepEqual(
    nearbyFestivals([...rows, missing], [0, 0], 50).map((r) => r.contentId),
    ["5", "25", "45"],
  );
  const boundary = nearbyFestivals(rows, [0, 0], 50)[0].km!;
  assert.equal(nearbyFestivals(rows, [0, 0], boundary).length, 1);
  assert.equal(nearbyFestivals([...rows, missing], null, 30).length, 4);
});

test("Permission granted returns coordinates using a bounded, cached request", async () => {
  let calls = 0;
  const result = await requestPosition({
    getCurrentPosition(success, _failure, options) {
      calls++;
      assert.deepEqual(options, { timeout: 10000, maximumAge: 60000 });
      success({
        coords: { latitude: 35.15, longitude: 129.11 },
      } as GeolocationPosition);
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, [35.15, 129.11]);
});

test("Permission denied, unavailable and timeout return actionable messages", async () => {
  for (const [code, message] of [
    [1, /권한/],
    [2, /확인하지 못/],
    [3, /시간이 초과/],
  ] as const) {
    await assert.rejects(
      requestPosition({
        getCurrentPosition(_success, failure) {
          failure!({ code } as GeolocationPositionError);
        },
      }),
      message,
    );
  }
});

test("Unsupported browsers and invalid positions are rejected", async () => {
  await assert.rejects(requestPosition(), /브라우저/);
  await assert.rejects(
    requestPosition({
      getCurrentPosition(success) {
        success({
          coords: { latitude: NaN, longitude: 181 },
        } as GeolocationPosition);
      },
    }),
    /정확한 위치/,
  );
});
