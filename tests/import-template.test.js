import test from "node:test";
import assert from "node:assert/strict";

import { IMPORT_TEMPLATE, validateImportText } from "../src/logic/import-template.js";

test("IMPORT_TEMPLATE includes all expected labels", () => {
  assert.match(IMPORT_TEMPLATE, /Strain:/);
  assert.match(IMPORT_TEMPLATE, /Hersteller:/);
  assert.match(IMPORT_TEMPLATE, /Genetik:/);
  assert.match(IMPORT_TEMPLATE, /THC:/);
  assert.match(IMPORT_TEMPLATE, /CBD:/);
  assert.match(IMPORT_TEMPLATE, /Anbau:/);
  assert.match(IMPORT_TEMPLATE, /Terpenprofil:/);
  assert.match(IMPORT_TEMPLATE, /Wirkungsprofil:/);
  assert.match(IMPORT_TEMPLATE, /Geschmack\/Aroma:/);
  assert.match(IMPORT_TEMPLATE, /Gesamtwirkung:/);
  assert.match(IMPORT_TEMPLATE, /Onset & Dauer:/);
  assert.match(IMPORT_TEMPLATE, /Characteristic:/);
  assert.match(IMPORT_TEMPLATE, /Medizinische Anwendungen:/);
  assert.match(IMPORT_TEMPLATE, /Community-Feedback:/);
});

test("validateImportText returns missing labels and blocks import when key sections are absent", () => {
  const result = validateImportText("Strain: Test\nHersteller: X");

  assert.equal(result.valid, false);
  assert.ok(result.missing.includes("Genetik"));
  assert.ok(result.missing.includes("Terpenprofil"));
});

test("validateImportText accepts complete template-like text", () => {
  const result = validateImportText(IMPORT_TEMPLATE);

  assert.equal(result.valid, true);
  assert.deepEqual(result.missing, []);
});
