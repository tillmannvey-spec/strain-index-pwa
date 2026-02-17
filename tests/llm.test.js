import test from "node:test";
import assert from "node:assert/strict";

import { parseLlmJson } from "../src/llm.js";

test("parseLlmJson parses plain JSON", () => {
  const value = parseLlmJson('{"name":"Blue Dream","effects":["Euphorisch"]}');
  assert.equal(value.name, "Blue Dream");
  assert.deepEqual(value.effects, ["Euphorisch"]);
});

test("parseLlmJson parses fenced JSON with extra explanation text", () => {
  const text = `
Hier ist das Ergebnis:
\`\`\`json
{"name":"Pink Kush","manufacturer":"Canopy","medicalApplications":["Schlaf"]}
\`\`\`
`;
  const value = parseLlmJson(text);
  assert.equal(value.name, "Pink Kush");
  assert.equal(value.manufacturer, "Canopy");
});
