const FIELD_DEFINITIONS = [
  { key: "name", label: "Name" },
  { key: "manufacturer", label: "Hersteller" },
  { key: "genetics", label: "Genetik" },
  { key: "thc", label: "THC" },
  { key: "cbd", label: "CBD" },
  { key: "cultivation", label: "Anbau" },
  { key: "effects", label: "Wirkungen" },
  { key: "aromaFlavor", label: "Aroma/Geschmack" },
  { key: "overallEffect", label: "Gesamtwirkung" },
  { key: "onsetDuration", label: "Onset & Dauer" },
  { key: "characteristic", label: "Charakteristik" },
  { key: "medicalApplications", label: "Medizinische Anwendungen" },
  { key: "communityFeedback", label: "Community-Feedback" },
  { key: "notes", label: "Notizen" },
  { key: "terpenes", label: "Terpene" }
];

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  return [];
}

function stringifyTerpenes(terpenes) {
  if (!Array.isArray(terpenes)) {
    return "";
  }
  return terpenes
    .map((terpene) => {
      if (typeof terpene === "string") {
        return terpene.trim();
      }
      const name = String(terpene?.name || "").trim();
      if (!name) {
        return "";
      }
      const amount = String(terpene?.amount || "").trim();
      const effects = normalizeArray(terpene?.effects).join(", ");
      const withAmount = amount ? `${name} (${amount})` : name;
      return effects ? `${withAmount} - ${effects}` : withAmount;
    })
    .filter(Boolean)
    .join(" | ");
}

function toComparable(value) {
  if (Array.isArray(value)) {
    if (value.some((entry) => entry && typeof entry === "object")) {
      return stringifyTerpenes(value);
    }
    return value.map((entry) => String(entry).trim()).filter(Boolean).join(" | ");
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value || "").trim();
}

function toDisplayValue(key, value) {
  if (key === "terpenes") {
    return stringifyTerpenes(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean).join(", ");
  }
  return String(value || "").trim();
}

function hasValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return String(value || "").trim().length > 0;
}

function evaluateSource(localValue, llmValue, mergedValue, usedLlm) {
  const localFilled = hasValue(localValue);
  const llmFilled = hasValue(llmValue);
  const mergedFilled = hasValue(mergedValue);
  const localComparable = toComparable(localValue);
  const llmComparable = toComparable(llmValue);
  const mergedComparable = toComparable(mergedValue);

  if (!mergedFilled) {
    return { source: "-", confidence: "Niedrig" };
  }

  if (!usedLlm || !llmFilled) {
    return { source: localFilled ? "Lokal" : "-", confidence: localFilled ? "Mittel" : "Niedrig" };
  }

  if (!localFilled && llmFilled) {
    return { source: "Gemini", confidence: "Mittel" };
  }

  if (localFilled && llmFilled && localComparable === llmComparable) {
    return { source: "Lokal + Gemini", confidence: "Hoch" };
  }

  if (mergedComparable === llmComparable) {
    return { source: "Gemini", confidence: "Mittel" };
  }

  if (mergedComparable === localComparable) {
    return { source: "Lokal", confidence: "Mittel" };
  }

  return { source: "Lokal + Gemini", confidence: "Niedrig" };
}

export function buildImportReviewRows(localProfile = {}, llmProfile = {}, mergedProfile = {}, usedLlm = false) {
  return FIELD_DEFINITIONS.map(({ key, label }) => {
    const localValue = localProfile[key];
    const llmValue = llmProfile[key];
    const mergedValue = mergedProfile[key];
    const sourceMeta = evaluateSource(localValue, llmValue, mergedValue, usedLlm);

    return {
      key,
      label,
      value: toDisplayValue(key, mergedValue),
      localValue: toDisplayValue(key, localValue),
      llmValue: toDisplayValue(key, llmValue),
      source: sourceMeta.source,
      confidence: sourceMeta.confidence
    };
  }).filter((row) => row.value);
}
