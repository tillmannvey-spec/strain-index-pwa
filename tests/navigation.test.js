import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_VIEW, resolveViewFromHash, toViewHash } from "../src/logic/navigation.js";

test("resolveViewFromHash returns default for empty or unknown hash", () => {
  assert.equal(resolveViewFromHash(""), DEFAULT_VIEW);
  assert.equal(resolveViewFromHash("#"), DEFAULT_VIEW);
  assert.equal(resolveViewFromHash("#/unknown"), DEFAULT_VIEW);
});

test("resolveViewFromHash accepts list and detail hashes", () => {
  assert.equal(resolveViewFromHash("#/list"), "list");
  assert.equal(resolveViewFromHash("#/detail"), "detail");
});

test("toViewHash always builds canonical hash path", () => {
  assert.equal(toViewHash("list"), "#/list");
  assert.equal(toViewHash("detail"), "#/detail");
});
