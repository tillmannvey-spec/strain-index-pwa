# Strain Index Vol2 - Produkt- und UX-Design

## Produktziel
Die App ist ein persönliches Arbeitswerkzeug für medizinische Strain-Analyse. Der dominante Use Case ist: schnell Strains finden, vergleichen, Details lesen und neue Strains importieren. Alles, was davon ablenkt, wird entfernt.

## Design-Prinzipien
1. Content First: maximale Fläche für Strain-Inhalte.
2. One Primary Action: nur ein primärer Einstiegspunkt (`+`).
3. Progressive Disclosure: komplexe Funktionen erst bei Bedarf öffnen.
4. Trust through Clarity: Import-Ergebnisse transparent anzeigen, nicht stillschweigend mappen.
5. Mobile-native: Daumenfreundlich, kurze Wege, klare visuelle Hierarchie.

## Informationsarchitektur

### Primäre Struktur
- `Strain List` (Hauptscreen)
- `Strain Detail` (über Karte geöffnet, als Sheet oder dedizierte Route)
- Modale Flows:
  - `Import Strain`
  - `Manual Entry / Edit`
  - `Import Settings` (sekundär, nicht im Hauptfluss sichtbar)

### Entfernt
- Permanenter großer Hero-Block.
- Separater `Profile`-Tab als Hauptnavigation.
- Sichtbare Technik-Settings im primären Content-Bereich.

## Ziel-Navigation

### Top Bar (kompakt)
- Links: App-Titel klein
- Mitte: optional Suchfeld / Kontext
- Rechts: `+` Floating/Top Action

### Plus-Aktion
Tap auf `+` öffnet Action-Sheet:
1. `Strain importieren`
2. `Strain eingeben`

### Karteninteraktion
- Tap auf Strain-Karte -> öffnet Detailansicht.
- Detailansicht enthält `Bearbeiten`, `Löschen`, `Zurück`.
- Kein Kontextwechsel in einen separaten Profil-Reiter.

## Screen-Spezifikation

### 1) Strain List
- Sticky Suchzeile + Filter-Chips.
- Kartenliste mit hoher Dichte:
  - Name
  - Hersteller
  - THC/CBD kompakt
  - 2-3 Key Tags (Wirkung/Terpene)
- Optionales Sort-Menü (zuletzt bearbeitet, A-Z, THC).

### 2) Strain Detail
- Header: Name, Hersteller, Aktionen.
- Inhalt als flexible Sektionen:
  - Steckbrief
  - Wirkungsprofil
  - Terpenprofil
  - Medizinische Anwendungen
  - Community-Feedback
  - Notizen
- Jeder Abschnitt wächst mit Inhalt (keine starre Höhe).
- Längere Texte mit klaren Absätzen/Listen.

### 3) Import Flow
- Schritt A: Rohtext einfügen.
- Schritt B: Analyse (lokaler Parser + optional LLM Merge).
- Schritt C: Review-Maske:
  - Feldweise Vorschau
  - Hervorhebung unklarer/unzugeordneter Zeilen
  - Quick Edit vor Übernahme
- Schritt D: In Editor öffnen und speichern.

## Formular- und Textverhalten
- Lange Felder als `textarea` mit Auto-Grow.
- Parser kann Listen in strukturierte Arrays überführen, UI zeigt Chips oder Listenpunkte.
- Bei Mehrzeileninhalten bleiben Zeilenumbrüche erhalten.
- Kein horizontaler Textverlust in Inputs.

## Parser-Design (fachlich)

### Pipeline
1. Normalize: Unicode-Bullets, Dashes, Sondermarker, Whitespace.
2. Segment: Abschnitte erkennen (`Steckbrief`, `Terpenprofil`, `Wirkungsprofil`, etc.).
3. Extract:
   - Key/Value-Paare
   - Listenblöcke
   - Kompositfelder (THC/CBD)
4. Interpret: Synonyme/Feldmapping, Terpenmuster.
5. Preserve: nicht gemappte Inhalte in `notes` mit Kontext.

### Qualitätsziele
- Hohe Recall-Rate für reale, unsaubere Texte.
- Keine Datenverluste durch zu striktes Pattern-Matching.
- Review vor Persistierung als Sicherheitsnetz.

## Visuelle Richtung
- Reduziert, professionell, datenorientiert.
- Weniger dekorative Flächen, stärkere Kontrastführung für Lesbarkeit.
- Konsistente Abstände (8px-Raster), klare Typostufen.
- Buttons/States eindeutig (primary, neutral, danger).

## Accessibility
- Touch Targets >= 44px.
- Klare Focus-States für Tastaturbedienung.
- Ausreichende Kontraste für Text und Interaktion.
- Semantische Überschriftenreihenfolge.

## Responsives Verhalten
- Mobile: einspaltig, schnelle vertikale Scans.
- Tablet/Desktop: Liste + optionale parallele Detailansicht (Master-Detail) möglich.
- Modale Inhalte mit sicherer Scrollbarkeit und sticky Footer-Aktionen.

## Erfolgskriterien
1. Nutzer sieht deutlich mehr Strain-Content "above the fold".
2. Beispieltext aus der Anfrage wird sinnvoll strukturiert importiert.
3. Lange Texte sind im Formular und in der Detailansicht ohne Abschneiden nutzbar.
4. Detailansicht fühlt sich als natürlicher Drilldown an, nicht als separater Tab-Workaround.
5. App wirkt wie ein fokussiertes Produkt statt wie ein Demo-Layout.
