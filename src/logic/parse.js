function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLabel(label) {
  return label
    .toLowerCase()
    .replace(/[^\p{L}\d/& ]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mapField(label) {
  const key = normalizeLabel(label);
  const mapping = {
    strain: "name",
    "strain name": "name",
    name: "name",
    hersteller: "manufacturer",
    breeder: "manufacturer",
    manufacturer: "manufacturer",
    genetik: "genetics",
    genetics: "genetics",
    thc: "thc",
    cbd: "cbd",
    anbau: "cultivation",
    cultivation: "cultivation",
    terpenprofil: "terpenes",
    terpene: "terpenes",
    terpeneprofil: "terpenes",
    wirkungsprofil: "effects",
    effects: "effects",
    "geschmack/aroma": "aromaFlavor",
    aroma: "aromaFlavor",
    geschmack: "aromaFlavor",
    "gesamtwirkung": "overallEffect",
    "onset & dauer": "onsetDuration",
    "onset und dauer": "onsetDuration",
    characteristic: "characteristic",
    charakteristik: "characteristic",
    "medizinische anwendungen": "medicalApplications",
    "medical applications": "medicalApplications",
    medicalapplications: "medicalApplications",
    "community-feedback": "communityFeedback",
    "community feedback": "communityFeedback",
    communityfeedback: "communityFeedback"
  };
  return mapping[key] || "";
}

function parseTerpeneLine(line) {
  const match = line.match(/^-?\s*([^(-]+?)\s*(?:\(([^)]+)\))?\s*(?:-\s*(.*))?$/);
  if (!match) {
    return null;
  }
  const name = (match[1] || "").trim();
  if (!name) {
    return null;
  }
  return {
    name,
    amount: (match[2] || "").trim(),
    effects: splitCsv((match[3] || "").replace(/\s*;\s*/g, ","))
  };
}

function createEmptyProfile() {
  return {
    id: "",
    name: "",
    manufacturer: "",
    genetics: "",
    thc: "",
    cbd: "",
    cultivation: "",
    terpenes: [],
    effects: [],
    aromaFlavor: [],
    overallEffect: "",
    onsetDuration: "",
    characteristic: "",
    medicalApplications: [],
    communityFeedback: "",
    notes: "",
    image: "",
    createdAt: ""
  };
}

export function parseStrainText(text) {
  const profile = createEmptyProfile();
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let inTerpeneBlock = false;

  lines.forEach((line) => {
    const pairMatch = line.match(/^([^:]+):\s*(.*)$/);
    if (pairMatch) {
      const field = mapField(pairMatch[1]);
      const value = (pairMatch[2] || "").trim();
      inTerpeneBlock = field === "terpenes";

      if (!field) {
        profile.notes = profile.notes ? `${profile.notes}\n${line}` : line;
        return;
      }

      if (field === "effects" || field === "aromaFlavor" || field === "medicalApplications") {
        profile[field] = splitCsv(value);
        return;
      }

      if (field === "terpenes") {
        if (!value) {
          return;
        }
        const terpene = parseTerpeneLine(value);
        if (terpene) {
          profile.terpenes.push(terpene);
        }
        return;
      }

      profile[field] = value;
      return;
    }

    if (inTerpeneBlock) {
      const terpene = parseTerpeneLine(line);
      if (terpene) {
        profile.terpenes.push(terpene);
        return;
      }
      inTerpeneBlock = false;
    }

    profile.notes = profile.notes ? `${profile.notes}\n${line}` : line;
  });

  return profile;
}
