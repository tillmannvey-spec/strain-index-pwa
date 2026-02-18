import test from "node:test";
import assert from "node:assert/strict";

import { buildImportReviewRows } from "../src/logic/import-review.js";

test("buildImportReviewRows marks identical local/llm field as high confidence", () => {
  const rows = buildImportReviewRows(
    { name: "Blue Dream" },
    { name: "Blue Dream" },
    { name: "Blue Dream" },
    true
  );

  const nameRow = rows.find((row) => row.key === "name");
  assert.equal(nameRow.source, "Lokal + Gemini");
  assert.equal(nameRow.confidence, "Hoch");
});

test("buildImportReviewRows marks conflicting local/llm field as medium confidence", () => {
  const rows = buildImportReviewRows(
    { manufacturer: "Aurora" },
    { manufacturer: "Canopy" },
    { manufacturer: "Canopy" },
    true
  );

  const manufacturerRow = rows.find((row) => row.key === "manufacturer");
  assert.equal(manufacturerRow.source, "Gemini");
  assert.equal(manufacturerRow.confidence, "Mittel");
  assert.equal(manufacturerRow.localValue, "Aurora");
  assert.equal(manufacturerRow.llmValue, "Canopy");
});

test("buildImportReviewRows falls back to local source when llm is disabled", () => {
  const rows = buildImportReviewRows(
    { effects: ["Euphorisch", "Kreativ"] },
    {},
    { effects: ["Euphorisch", "Kreativ"] },
    false
  );

  const effectsRow = rows.find((row) => row.key === "effects");
  assert.equal(effectsRow.source, "Lokal");
  assert.equal(effectsRow.confidence, "Mittel");
});
