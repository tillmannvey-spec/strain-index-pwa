# Strain Index PWA

Persoenliche, lokale PWA fuer Medical-Cannabis-Strain-Profile.

## Start

1. Lokalen Server starten (z.B. mit VSCode Live Server oder `npx serve` im Projektordner).
2. `index.html` im Browser oeffnen.
3. Optional ueber Browser-Menue als App installieren.

## Features

- Strains anlegen, bearbeiten, loeschen
- Profilfelder fuer Steckbrief, Terpene, Wirkungen, Aroma, medizinische Anwendungen, Community-Feedback
- Profilbild-Upload (lokal in Browser-Speicher)
- Dashboard-Filter (Hersteller, Wirkung, medizinische Wirkung) + Suche
- Text-Import mit festem Schema-Template + Validierung
- Optionaler LLM-Import mit Gemini API (AI Studio)
- Offline-Unterstuetzung via Service Worker

## Tests

```bash
npm test
```

## Gemini (AI Studio) einrichten

1. Import-Dialog oeffnen.
2. "Gemini fuer automatische Zuordnung nutzen" aktivieren.
3. API Key, Model und Endpoint speichern.

Standard:
- Model: `gemini-3-flash-preview`
- Endpoint: `https://generativelanguage.googleapis.com/v1beta`

## Vercel Deploy

Dieses Projekt ist als statische PWA vorbereitet (`vercel.json` + `.vercelignore` vorhanden).

```bash
vercel
```

Oder mit Git-Import direkt in Vercel deployen.
