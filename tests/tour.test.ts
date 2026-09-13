import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTour } from "../src/lib/tour-response";
test("TourAPI accepts success lists and explicit empty results", () => {
  const response = (body: object) =>
    JSON.stringify({ response: { header: { resultCode: "0000" }, body } });
  assert.deepEqual(parseTour(response({ totalCount: 0, items: "" })), {
    items: [],
    total: 0,
  });
  assert.equal(
    parseTour(response({ totalCount: 1, items: { item: { contentid: "1" } } }))
      .items.length,
    1,
  );
});
test("TourAPI rejects XML auth errors, quota errors and partial pages", () => {
  assert.throws(() =>
    parseTour("<OpenAPI_ServiceResponse>30</OpenAPI_ServiceResponse>"),
  );
  assert.throws(
    () =>
      parseTour(JSON.stringify({ response: { header: { resultCode: "22" } } })),
    /22/,
  );
  assert.throws(
    () =>
      parseTour(
        JSON.stringify({
          response: {
            header: { resultCode: "0000" },
            body: { totalCount: 10, items: "" },
          },
        }),
      ),
    /Incomplete/,
  );
});
