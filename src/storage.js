import { buildStrainsDocument, extractStrainsFromDocument } from "./logic/cloud-storage.js";

const STRAINS_KEY = "strain-index-v2:strains";
const SETTINGS_KEY = "strain-index-v2:settings";

const SEED_STRAINS = [
  {
    id: "blue-dream",
    name: "Blue Dream",
    manufacturer: "Aurora",
    genetics: "Blueberry x Haze",
    thc: "22%",
    cbd: "0.7%",
    cultivation: "Unbestrahlt, Kanada",
    terpenes: [
      { name: "Myrcene", amount: "0.8%", effects: ["Entspannend", "Sedierend"] },
      { name: "Pinene", amount: "0.4%", effects: ["Fokus", "Klarheit"] },
      { name: "Caryophyllene", amount: "0.3%", effects: ["Antientzuendlich"] }
    ],
    effects: ["Euphorisch", "Kreativ", "Ausgeglichen"],
    aromaFlavor: ["Beere", "Kiefer", "Erde"],
    overallEffect: "Ausgleichende Tageswirkung mit mentaler Klarheit.",
    onsetDuration: "Onset: 8 min, Dauer: 3 h",
    characteristic: "Dichte Buds, harzig, helle Trichome",
    medicalApplications: ["Schmerz", "Stress", "Depression"],
    communityFeedback: "Viele berichten von klarer Wirkung ohne schwere Sedierung.",
    notes: "",
    image: "",
    createdAt: "2026-02-17T00:00:00.000Z"
  },
  {
    id: "pink-kush",
    name: "Pink Kush",
    manufacturer: "Canopy",
    genetics: "OG Kush Phenotyp",
    thc: "25%",
    cbd: "<1%",
    cultivation: "Indoor, unbestrahlt, Kanada",
    terpenes: [
      { name: "Limonene", amount: "0.5%", effects: ["Stimmungsaufhellend"] },
      { name: "Linalool", amount: "0.4%", effects: ["Beruhigend", "Schlaffoerdernd"] }
    ],
    effects: ["Entspannend", "Koerperlich schwer", "Muedigkeit"],
    aromaFlavor: ["Vanille", "Suesse Erde", "Blumig"],
    overallEffect: "Stark koerperbetonte Abendwirkung.",
    onsetDuration: "Onset: 5 min, Dauer: 4 h",
    characteristic: "Violette Akzente, kompakte Bluten",
    medicalApplications: ["Schlaf", "Chronischer Schmerz", "Angst"],
    communityFeedback: "Beliebt fuer Abendroutine und Schlafhilfe.",
    notes: "",
    image: "",
    createdAt: "2026-02-17T00:00:00.000Z"
  }
];

const DEFAULT_SETTINGS = {
  useLlmImport: true,
  apiKey: "",
  model: "gemini-3-flash-preview",
  endpoint: "https://generativelanguage.googleapis.com/v1beta"
};

function safeParse(json, fallback) {
  try {
    const parsed = JSON.parse(json);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

async function fetchCloudStrains() {
  const response = await fetch("./api/strains", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Cloud load failed (${response.status})`);
  }
  const payload = await response.json();
  return extractStrainsFromDocument(payload, []);
}

async function saveCloudStrains(strains) {
  const response = await fetch("./api/strains", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildStrainsDocument(strains))
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloud save failed (${response.status}): ${text.slice(0, 180)}`);
  }
}

export async function loadStrains() {
  const local = loadStrainsLocal();
  try {
    const cloud = await fetchCloudStrains();
    if (Array.isArray(cloud) && cloud.length) {
      localStorage.setItem(STRAINS_KEY, JSON.stringify(cloud));
      return cloud;
    }
    if (local.length) {
      await saveCloudStrains(local);
      return local;
    }
    return [...SEED_STRAINS];
  } catch {
    return local;
  }
}

function loadStrainsLocal() {
  const stored = localStorage.getItem(STRAINS_KEY);
  if (!stored) {
    return [...SEED_STRAINS];
  }
  const strains = safeParse(stored, []);
  if (!Array.isArray(strains) || strains.length === 0) {
    return [...SEED_STRAINS];
  }
  return strains;
}

export async function saveStrains(strains) {
  localStorage.setItem(STRAINS_KEY, JSON.stringify(strains));
  try {
    await saveCloudStrains(strains);
    return true;
  } catch {
    return false;
  }
}

export function loadSettings() {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) {
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...safeParse(stored, {}) };
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
