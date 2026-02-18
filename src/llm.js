const SYSTEM_PROMPT = `
Du bist ein Information-Extractor fuer Medical-Cannabis-Strain-Profile.
Analysiere den Nutzertext auch dann, wenn er frei geschrieben, unsortiert oder ohne feste Labels ist.
Nutze dein Textverstaendnis und ordne Informationen semantisch den Zielfeldern zu.

Ziel: Gib genau EIN JSON-Objekt mit diesen Feldern zurueck:
name, manufacturer, genetics, thc, cbd, cultivation, terpenes, effects, aromaFlavor, overallEffect, onsetDuration, characteristic, medicalApplications, communityFeedback, notes

Regeln:
- terpenes ist ein Array von Objekten: {name, amount, effects}
- effects, aromaFlavor, medicalApplications und terpene.effects sind Arrays von Strings
- Wenn Feld unbekannt: leerer String oder leeres Array
- Nicht halluzinieren: nur Informationen aus dem Text oder klare semantische Schlussfolgerungen
- Prozentangaben/Einheiten so nah wie moeglich am Originaltext beibehalten
- Du darfst Synonyme mappen (z.B. Produzent=manufacturer, Wirkung=effects, medizinische Nutzung=medicalApplications)
- Antworte nur mit JSON ohne Erklaerung
`.trim();

const RESEARCH_SYSTEM_PROMPT = `
Du bist ein Medical-Cannabis-Research-Assistent.
Du recherchierst im Web zu angefragten Strains und lieferst strukturierte Profile.

Antwortformat:
Gib genau EIN JSON-Objekt zurueck:
{
  "profiles": [
    {
      "name": "",
      "manufacturer": "",
      "genetics": "",
      "thc": "",
      "cbd": "",
      "cultivation": "",
      "terpenes": [{"name":"","amount":"","effects":[]}],
      "effects": [],
      "aromaFlavor": [],
      "overallEffect": "",
      "onsetDuration": "",
      "characteristic": "",
      "medicalApplications": [],
      "communityFeedback": "",
      "notes": ""
    }
  ]
}

Regeln:
- Ein Profil pro angefragtem Strain, gleiche Reihenfolge wie Anfrage.
- Wenn Information unklar: leerer String oder leeres Array.
- Keine Halluzinationen.
- effects/medicalApplications/aromaFlavor muessen Arrays bleiben.
- Antworte nur mit JSON.
`.trim();

function buildGeminiUrl(settings) {
  const endpoint = String(settings.endpoint || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
  const model = encodeURIComponent(settings.model || "gemini-3-flash-preview");
  return `${endpoint}/models/${model}:generateContent`;
}

function extractOutputText(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim()) {
        return part.text;
      }
    }
  }
  return "";
}

function stripCodeFence(text) {
  const trimmed = String(text || "").trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) {
    return fenced[1].trim();
  }
  return trimmed;
}

function extractFirstJsonObject(text) {
  const source = String(text || "");
  const start = source.indexOf("{");
  if (start < 0) {
    return "";
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  return "";
}

export function parseLlmJson(text) {
  const cleaned = stripCodeFence(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const extracted = extractFirstJsonObject(cleaned);
    if (!extracted) {
      throw new Error("Kein JSON-Objekt in der Modellantwort gefunden.");
    }
    return JSON.parse(extracted);
  }
}

export async function parseWithLlm(importText, settings) {
  if (!settings.apiKey) {
    throw new Error("Kein API-Key hinterlegt.");
  }

  const response = await fetch(buildGeminiUrl(settings), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": settings.apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: importText }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini-Import fehlgeschlagen (${response.status}): ${message.slice(0, 220)}`);
  }

  const payload = await response.json();
  const text = extractOutputText(payload);
  if (!text) {
    throw new Error("Gemini-Antwort enthaelt kein auswertbares Text-JSON.");
  }

  try {
    return parseLlmJson(text);
  } catch (error) {
    throw new Error(`Gemini-JSON ungueltig: ${error.message}`);
  }
}

export async function researchStrainsWithLlm(strainNames, settings) {
  if (!settings.apiKey) {
    throw new Error("Kein API-Key hinterlegt.");
  }

  const names = Array.isArray(strainNames) ? strainNames.filter(Boolean) : [];
  if (!names.length) {
    throw new Error("Keine Strain-Namen uebergeben.");
  }

  const query = `Recherchiere folgende Strains mit Websuche und liefere strukturierte Profile:\n${names
    .map((name, index) => `${index + 1}. ${name}`)
    .join("\n")}`;

  const response = await fetch(buildGeminiUrl(settings), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": settings.apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: RESEARCH_SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: query }]
        }
      ],
      tools: [{ google_search: {} }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini-Research fehlgeschlagen (${response.status}): ${message.slice(0, 220)}`);
  }

  const payload = await response.json();
  const text = extractOutputText(payload);
  if (!text) {
    throw new Error("Gemini-Antwort enthaelt kein auswertbares Research-JSON.");
  }

  const parsed = parseLlmJson(text);
  const profiles = Array.isArray(parsed?.profiles) ? parsed.profiles : [];
  if (!profiles.length) {
    throw new Error("Gemini-Research enthielt keine Profile.");
  }
  return profiles;
}
