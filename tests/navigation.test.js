import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_VIEW, resolveViewFromHash, toViewHash } from "../src/logic/navigation.js";

test("resolveViewFromHash returns default for empty or unknown hash", () => {
  assert.equal(resolveViewFromHash(""), DEFAULT_VIEW);
  assert.equal(resolveViewFromHash("#"), DEFAULT_VIEW);
  assert.equal(resolveViewFromHash("#/unknown"), DEFAULT_VIEW);
});

test("resolveViewFromHash accepts dashboard strains profile hashes", () => {
  assert.equal(resolveViewFromHash("#/dashboard"), "dashboard");
  assert.equal(resolveViewFromHash("#/strains"), "strains");
  assert.equal(resolveViewFromHash("#/profile"), "profile");
});

test("toViewHash always builds canonical hash path", () => {
  assert.equal(toViewHash("dashboard"), "#/dashboard");
  assert.equal(toViewHash("strains"), "#/strains");
  assert.equal(toViewHash("profile"), "#/profile");
});
