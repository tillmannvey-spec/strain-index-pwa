const SYSTEM_PROMPT = `
Extrahiere aus dem Eingabetext ein JSON-Objekt fuer ein Medical-Cannabis-Strain-Profil.
Nutze exakt diese Felder:
name, manufacturer, genetics, thc, cbd, cultivation, terpenes, effects, aromaFlavor, overallEffect, onsetDuration, characteristic, medicalApplications, communityFeedback, notes.
terpenes ist ein Array aus Objekten: {name, amount, effects[]}.
effects, aromaFlavor, medicalApplications und terpene.effects sind Arrays von Strings.
Wenn etwas fehlt, nutze leere Strings oder leere Arrays.
Antworte nur mit JSON.
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
    return JSON.parse(stripCodeFence(text));
  } catch (error) {
    throw new Error(`Gemini-JSON ungueltig: ${error.message}`);
  }
}
