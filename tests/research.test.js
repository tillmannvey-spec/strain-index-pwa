import test from "node:test";
import assert from "node:assert/strict";

import { parseResearchInput } from "../src/logic/research.js";

test("parseResearchInput extracts unique strain names from lines and commas", () => {
  const result = parseResearchInput("Blue Dream, Pink Kush\nSour Diesel");
  assert.deepEqual(result, ["Blue Dream", "Pink Kush", "Sour Diesel"]);
});

test("parseResearchInput handles bullet lists and removes duplicates", () => {
  const result = parseResearchInput("• Blue Dream\n- Pink Kush\nBlue Dream");
  assert.deepEqual(result, ["Blue Dream", "Pink Kush"]);
});
