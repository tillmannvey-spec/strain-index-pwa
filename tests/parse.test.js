import test from "node:test";
import assert from "node:assert/strict";

import { parseStrainText } from "../src/logic/parse.js";

test("parseStrainText maps structured import text into profile fields", () => {
  const text = `
Strain: Blue Dream
Hersteller: Aurora
Genetik: Blueberry x Haze
THC: 22%
CBD: 0.7%
Anbau: Unbestrahlt, Kanada
Terpenprofil:
- Myrcene (0.8%) - Sedierend, Entspannend
- Pinene (0.4%) - Fokus, Klarheit
Wirkungsprofil: Euphorisch, Kreativ
Geschmack/Aroma: Beere, Erde, Kiefer
Gesamtwirkung: Ausgeglichen und klar.
Onset & Dauer: 8 min / 3 h
Characteristic: Harzig, dichte Buds
Medizinische Anwendungen: Schmerz, Stress
Community-Feedback: Sehr beliebter Tagesstrain
`;

  const result = parseStrainText(text);

  assert.equal(result.name, "Blue Dream");
  assert.equal(result.manufacturer, "Aurora");
  assert.equal(result.genetics, "Blueberry x Haze");
  assert.equal(result.thc, "22%");
  assert.equal(result.cbd, "0.7%");
  assert.equal(result.cultivation, "Unbestrahlt, Kanada");
  assert.deepEqual(result.effects, ["Euphorisch", "Kreativ"]);
  assert.deepEqual(result.aromaFlavor, ["Beere", "Erde", "Kiefer"]);
  assert.deepEqual(result.medicalApplications, ["Schmerz", "Stress"]);
  assert.equal(result.terpenes.length, 2);
  assert.deepEqual(result.terpenes[0], {
    name: "Myrcene",
    amount: "0.8%",
    effects: ["Sedierend", "Entspannend"]
  });
  assert.equal(result.communityFeedback, "Sehr beliebter Tagesstrain");
});

test("parseStrainText keeps unknown sections in notes and handles missing optional fields", () => {
  const text = `
Strain: LA Confidential
Hersteller: 420 Pharma
Wirkungsprofil: Ruhig
Freitext: Nur abends nutzen
`;

  const result = parseStrainText(text);

  assert.equal(result.name, "LA Confidential");
  assert.deepEqual(result.effects, ["Ruhig"]);
  assert.match(result.notes, /Freitext: Nur abends nutzen/);
  assert.equal(result.thc, "");
  assert.deepEqual(result.terpenes, []);
});
