import test from "node:test";
import assert from "node:assert/strict";

import { filterStrains, uniqueValues } from "../src/logic/filter.js";

const strains = [
  {
    id: "blue-dream",
    name: "Blue Dream",
    manufacturer: "Aurora",
    effects: ["Euphorisch", "Kreativ"],
    medicalApplications: ["Schmerz", "Stress"]
  },
  {
    id: "pink-kush",
    name: "Pink Kush",
    manufacturer: "Canopy",
    effects: ["Entspannend", "Muedigkeit"],
    medicalApplications: ["Schlaf", "Stress"]
  }
];

test("filterStrains applies manufacturer/effect/medical/search together", () => {
  const filtered = filterStrains(strains, {
    search: "blue",
    manufacturer: "Aurora",
    effect: "Euphorisch",
    medical: "Schmerz"
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "blue-dream");
});

test("uniqueValues returns sorted unique choices from profile arrays and strings", () => {
  const manufacturers = uniqueValues(strains, "manufacturer");
  const effects = uniqueValues(strains, "effects");

  assert.deepEqual(manufacturers, ["Aurora", "Canopy"]);
  assert.deepEqual(effects, ["Entspannend", "Euphorisch", "Kreativ", "Muedigkeit"]);
});
