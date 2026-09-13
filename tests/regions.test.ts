import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRegion } from "../src/lib/regions";

test("Legal regions retain distinct provinces with the same district code", () => {
  const rows = [
    {
      lDongRegnCd: "11",
      lDongRegnNm: "서울특별시",
      lDongSignguCd: "110",
      lDongSignguNm: "종로구",
    },
    {
      lDongRegnCd: "26",
      lDongRegnNm: "부산광역시",
      lDongSignguCd: "110",
      lDongSignguNm: "중구",
    },
  ].map(normalizeRegion);
  assert.equal(rows[0].code, "11");
  assert.equal(rows[1].code, "26");
  assert.equal(
    new Set(rows.map((r) => r.code + ":" + r.district_code)).size,
    2,
  );
});

test("Missing or renamed region fields fail before database writes", () => {
  const row = {
    lDongRegnCd: "11",
    lDongRegnNm: "서울특별시",
    lDongSignguCd: "110",
    lDongSignguNm: "종로구",
  };
  for (const key of Object.keys(row)) {
    assert.throws(
      () => normalizeRegion({ ...row, [key]: undefined }),
      /Invalid region field/,
    );
  }
  assert.throws(
    () => normalizeRegion({ ...row, lDongRegnCd: " " }),
    /Invalid region field/,
  );
});
