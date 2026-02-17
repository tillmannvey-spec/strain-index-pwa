const REQUIRED_LABELS = [
  "Strain",
  "Hersteller",
  "Genetik",
  "THC",
  "CBD",
  "Anbau",
  "Terpenprofil",
  "Wirkungsprofil",
  "Geschmack/Aroma",
  "Gesamtwirkung",
  "Onset & Dauer",
  "Characteristic",
  "Medizinische Anwendungen",
  "Community-Feedback"
];

export const IMPORT_TEMPLATE = `Strain:
Hersteller:
Genetik:
THC:
CBD:
Anbau:
Terpenprofil:
- Terpenname (0.0%) - Wirkung 1, Wirkung 2
Wirkungsprofil:
Geschmack/Aroma:
Gesamtwirkung:
Onset & Dauer:
Characteristic:
Medizinische Anwendungen:
Community-Feedback:
Notizen:
`;

function hasLabel(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^\\s*${escaped}\\s*:`, "mi");
  return pattern.test(text);
}

export function validateImportText(text) {
  const source = String(text || "");
  const missing = REQUIRED_LABELS.filter((label) => !hasLabel(source, label));
  return {
    valid: missing.length === 0,
    missing
  };
}
