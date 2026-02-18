export function parseResearchInput(value) {
  const lines = String(value || "")
    .replace(/[•∙]/g, "\n")
    .split(/[\n,;]+/)
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);

  const unique = [];
  lines.forEach((name) => {
    if (!unique.includes(name)) {
      unique.push(name);
    }
  });
  return unique;
}
