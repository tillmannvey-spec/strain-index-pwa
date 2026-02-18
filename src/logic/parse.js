function splitList(value) {
  return String(value || "")
    .replace(/[•∙]/g, ",")
    .split(/[,\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferEffectsFromText(text) {
  const source = String(text || "").toLowerCase();
  if (!source.trim()) {
    return [];
  }

  const patterns = [
    { pattern: /entspann|beruhig|relax/i, label: "Entspannend" },
    { pattern: /fokus|konzent|klarheit/i, label: "Fokussiert" },
    { pattern: /kreativ/i, label: "Kreativ" },
    { pattern: /euphor/i, label: "Euphorisch" },
    { pattern: /sedier|schlaf|mued|müd/i, label: "Sedierend" },
    { pattern: /aktiv|antrieb/i, label: "Aktivierend" },
    { pattern: /angst|paranoia/i, label: "Angstlösend" },
    { pattern: /koerper|körper|muskel/i, label: "Körperlich" }
  ];

  return patterns.filter((item) => item.pattern.test(source)).map((item) => item.label);
}

function normalizeLabel(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/^-+\s*/u, "")
    .replace(/[^\p{L}\d/&\- ]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mapField(label) {
  const key = normalizeLabel(label);
  const mapping = {
    strain: "name",
    "strain name": "name",
    name: "name",
    steckbrief: "sectionProfile",
    hersteller: "manufacturer",
    breeder: "manufacturer",
    manufacturer: "manufacturer",
    genetik: "genetics",
    genetics: "genetics",
    thc: "thc",
    cbd: "cbd",
    "thc/cbd": "thcCbd",
    "thc cbd": "thcCbd",
    anbau: "cultivation",
    cultivation: "cultivation",
    terpenprofil: "terpenes",
    terpene: "terpenes",
    terpeneprofil: "terpenes",
    "dominante terpene": "terpenes",
    wirkungsprofil: "effects",
    wirkung: "effects",
    effects: "effects",
    "geschmack/aroma": "aromaFlavor",
    "geschmack aroma": "aromaFlavor",
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
    communityfeedback: "communityFeedback",
    empfehlung: "notes"
  };
  return mapping[key] || "";
}

function normalizeLine(rawLine) {
  return String(rawLine || "")
    .replace(/\t/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[✅⚠️]/g, "")
    .replace(/^\s*[•∙]\s*/u, "- ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelySection(line) {
  const key = normalizeLabel(line);
  return [
    "steckbrief",
    "terpenprofil",
    "dominante terpene",
    "wirkungsprofil",
    "medizinische anwendungen",
    "community-feedback",
    "community feedback"
  ].includes(key);
}

function parseThcCbd(value, profile) {
  const normalized = String(value || "");
  const thcMatch = normalized.match(/(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?\s*%?)\s*THC/i);
  const cbdMatch = normalized.match(/(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?\s*%?)\s*CBD/i);
  if (thcMatch) {
    profile.thc = thcMatch[1].replace(/\s+/g, "");
  }
  if (cbdMatch) {
    profile.cbd = cbdMatch[1].replace(/\s+/g, "");
  }
}

function parseTerpeneLine(line) {
  const clean = String(line || "").replace(/^\-\s*/, "").trim();
  if (!clean) {
    return null;
  }

  let namePart = clean;
  let tail = "";

  const dashSplit = clean.match(/^(.*?)\s+\-\s+(.+)$/);
  if (dashSplit) {
    namePart = dashSplit[1].trim();
    tail = dashSplit[2].trim();
  } else {
    const colonSplit = clean.match(/^(.*?):\s*(.+)$/);
    if (colonSplit) {
      namePart = colonSplit[1].trim();
      tail = colonSplit[2].trim();
    }
  }

  let amount = "";
  const amountMatch = namePart.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (amountMatch) {
    namePart = amountMatch[1].trim();
    amount = amountMatch[2].trim();
  }

  if (!namePart || namePart.length < 2) {
    return null;
  }

  return {
    name: namePart,
    amount,
    effects: splitList(tail)
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
    .map((line) => normalizeLine(line))
    .filter((line) => line.length > 0);

  let currentSection = "";

  lines.forEach((line) => {
    if (!profile.name && !line.includes(":") && !line.startsWith("- ") && line.length <= 60) {
      profile.name = line;
      return;
    }

    if (isLikelySection(line) && !line.includes(":")) {
      currentSection = mapField(line);
      return;
    }

    const pairMatch = line.match(/^([^:]+):\s*(.*)$/);
    if (pairMatch) {
      const field = mapField(pairMatch[1]);
      const value = (pairMatch[2] || "").trim();
      if (field && !field.startsWith("section")) {
        currentSection = field;
      }

      if (!field) {
        if (currentSection === "communityFeedback") {
          profile.communityFeedback = profile.communityFeedback
            ? `${profile.communityFeedback}\n${line}`
            : line;
          return;
        }
        profile.notes = profile.notes ? `${profile.notes}\n${line}` : line;
        return;
      }

      if (field === "thcCbd") {
        parseThcCbd(value, profile);
        return;
      }

      if (field === "effects" || field === "aromaFlavor" || field === "medicalApplications") {
        profile[field] = splitList(value);
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

      if (field === "notes") {
        profile.notes = profile.notes ? `${profile.notes}\n${value}` : value;
      } else {
        profile[field] = value;
      }
      return;
    }

    if (line.startsWith("- ") && currentSection === "terpenes") {
      const terpene = parseTerpeneLine(line);
      if (terpene) {
        profile.terpenes.push(terpene);
        return;
      }
    }

    if (line.startsWith("- ") && currentSection === "medicalApplications") {
      profile.medicalApplications.push(line.replace(/^\-\s*/, "").trim());
      return;
    }

    if (line.startsWith("- ") && currentSection === "effects") {
      profile.effects.push(line.replace(/^\-\s*/, "").trim());
      return;
    }

    if (currentSection === "communityFeedback") {
      profile.communityFeedback = profile.communityFeedback
        ? `${profile.communityFeedback}\n${line}`
        : line;
      return;
    }

    if (currentSection === "overallEffect") {
      profile.overallEffect = profile.overallEffect ? `${profile.overallEffect}\n${line}` : line;
      return;
    }

    profile.notes = profile.notes ? `${profile.notes}\n${line}` : line;
  });

  const inferredEffects = inferEffectsFromText(
    [profile.overallEffect, profile.characteristic, profile.communityFeedback, profile.notes].join("\n")
  );
  profile.effects = Array.from(new Set([...profile.effects, ...inferredEffects]));
  profile.aromaFlavor = Array.from(new Set(profile.aromaFlavor));
  profile.medicalApplications = Array.from(new Set(profile.medicalApplications));

  return profile;
}
