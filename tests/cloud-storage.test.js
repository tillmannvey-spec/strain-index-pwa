import test from "node:test";
import assert from "node:assert/strict";

import { buildStrainsDocument, extractStrainsFromDocument } from "../src/logic/cloud-storage.js";

test("buildStrainsDocument wraps strains with timestamp", () => {
  const doc = buildStrainsDocument([{ id: "a" }]);
  assert.deepEqual(doc.strains, [{ id: "a" }]);
  assert.equal(typeof doc.updatedAt, "string");
  assert.ok(doc.updatedAt.length > 10);
});

test("extractStrainsFromDocument returns strains when shape is valid", () => {
  const value = extractStrainsFromDocument({ strains: [{ id: "x" }] }, [{ id: "fallback" }]);
  assert.deepEqual(value, [{ id: "x" }]);
});

test("extractStrainsFromDocument falls back on invalid payload", () => {
  const value = extractStrainsFromDocument({ foo: "bar" }, [{ id: "fallback" }]);
  assert.deepEqual(value, [{ id: "fallback" }]);
});
