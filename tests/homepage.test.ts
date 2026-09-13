import { test } from "node:test";
import assert from "node:assert/strict";
import { homepageUrl } from "../src/lib/domain";
test("Official homepage HTML is reduced to a safe HTTP link", () => {
  assert.equal(
    homepageUrl(
      '<a href="https://example.org/?a=1&amp;b=2" target="_blank">공식</a>',
    ),
    "https://example.org/?a=1&b=2",
  );
  assert.equal(homepageUrl('<a href="javascript:alert(1)">bad</a>'), null);
  assert.equal(homepageUrl(null), null);
});
