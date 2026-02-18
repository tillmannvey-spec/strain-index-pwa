# Strain Index Vol2 - Umsetzungsplan

> **Für Coding-Agent:** Arbeite diesen Plan strikt task-basiert ab. Jede Aufgabe mit Tests/Validierung abschließen, dann erst zur nächsten.

## Ziel
Die App soll sich wie ein produktionsreifes Tech-Produkt anfühlen: maximale Fläche für Strain-Inhalte, robuste Text-Importe (auch lange, halbstrukturierte Texte), und eine Detailsicht ohne separaten, platzverschwendenden "Profile"-Reiter.

## Aktuelle Probleme und vermutete Root Causes

### 1) Textfelder sind praktisch "fix"
- In `index.html` sind mehrere Felder als einzeilige `<input>` angelegt, obwohl dort lange Inhalte landen können (`onsetDuration`, `characteristic`, `medicalApplications`).
- Mehrzeilige Felder (`textarea`) haben feste `rows` ohne Auto-Resize (`overallEffect`, `communityFeedback`, `notes`).
- In der Detailansicht werden lange Strings nur als einzelne `<p>`-Zeilen ausgegeben; Newlines aus Importtext werden nicht als Absätze/Listen dargestellt (`src/app.js`, `renderProfile`).

### 2) Text-Import funktioniert bei realen Textblöcken schlecht
- Parser ist stark schema-basiert und erwartet fast nur `Label: Value` pro Zeile (`src/logic/parse.js`).
- Beispieltext enthält:
  - Abschnittsüberschriften ohne Doppelpunkt (z.B. `Steckbrief`, `Terpenprofil`, `Wirkungsprofil`)
  - Unicode-Bullets (`∙`) und Marker (`✅`, `⚠️`)
  - Kombifelder (`THC/CBD: 20-22% THC / 1% CBD`)
  - gemischte Sätze + Listen
- `mapField()` kennt nicht genug Synonyme/Komposit-Felder.
- `splitCsv()` verarbeitet nur Kommata, nicht Bullet-Listen oder Zeilenlisten.
- `parseTerpeneLine()` ist zu eng gefasst für reale Schreibweisen (Gedankenstriche, Klammern, Bullet-Formate).

### 3) Zu viel UI-Fläche für geringe Nutzlast
- Großer Hero-Header + 2 primäre Aktionen belegen konstant viel vertikalen Raum (`index.html`, `.hero` in `styles.css`).
- Separater `profileView` verdoppelt Strukturen und zwingt Navigation, statt direkte Detailanzeige am gewählten Strain.
- Wichtige Listenfläche wird durch statische Überschriften und redundante Seitenköpfe reduziert.

## Zielbild (High-Level)
- Ein primärer Arbeitsbereich: Strain-Liste als Hauptfläche.
- Ein einziges Plus-Element (`+`) als primäre Aktion.
- Klick auf `+` öffnet Action-Sheet: `Strain importieren` / `Strain eingeben`.
- Klick auf Strain öffnet eine echte Detailsicht (Sheet/Route), nicht einen separaten Profile-Reiter.
- Lange Texte sind überall variabel (Auto-Grow im Formular, saubere Absatzdarstellung in der Detailansicht).
- Import robust gegen halbstrukturierte Inhalte.

---

## Task 1 - Navigation und Layout vereinfachen

**Dateien**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `src/app.js`
- Modify: `src/logic/navigation.js`
- Test: `tests/navigation.test.js`

**Schritte**
1. Hero-Bereich entfernen/komprimieren (kein permanenter Marketing-Block).
2. Bottom-Nav auf nutzungsgetriebene Struktur reduzieren (kein separater Profile-Reiter).
3. Primäre FAB/Plus-Aktion einführen.
4. Action-Sheet für `Importieren` und `Neu eingeben` ergänzen.
5. Routing auf `list` + `detail` umstellen (Hash-basiert).
6. Navigationstests anpassen/ergänzen.

**Definition of Done**
- Obere 25% des Viewports sind nicht mehr dauerhaft durch Header-Block belegt.
- Detailansicht ist direkt aus Kartenklick erreichbar, ohne Profile-Tab.

---

## Task 2 - Flexible Eingabe- und Anzeige-Felder

**Dateien**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `src/app.js`
- Test: `tests/` (neu: UI/DOM-Tests oder gezielte Helper-Tests)

**Schritte**
1. Lange textuelle Felder von `<input>` auf `<textarea>` umstellen (`onsetDuration`, `characteristic`, optional `medicalApplications` als Chips-Input behalten oder multiline parsergestützt).
2. Auto-Grow-Mechanik für alle relevanten Textareas (on input: Höhe auf `scrollHeight`).
3. In `renderProfile` Textblöcke mit Zeilenumbrüchen/Listen darstellen (z.B. `<p>` + `<ul>` Hybrid oder Text-to-List Renderer).
4. Sehr lange Inhalte in Cards kürzen, aber in Detailansicht vollständig anzeigen.

**Definition of Done**
- Kein abgeschnittener Inhalt in Formularfeldern bei langen Texten.
- Detailansicht zeigt lange Importtexte lesbar mit Struktur.

---

## Task 3 - Parser robust machen (ohne LLM-Abhängigkeit)

**Dateien**
- Modify: `src/logic/parse.js`
- Modify: `src/app.js` (Import-Flow, Preview)
- Test: `tests/parse.test.js`

**Schritte**
1. Preprocessing-Layer bauen:
   - Unicode-Bullets/Marker normalisieren (`∙`, `•`, `✅`, `⚠️` etc.).
   - Mehrfach-Whitespace, typografische Dashes vereinheitlichen.
2. Abschnittsdetektion ergänzen (`Steckbrief`, `Terpenprofil`, `Wirkungsprofil`, `Medizinische Anwendungen`, `Community-Feedback`).
3. Feld-Mapping-Synonyme erweitern inkl. Kompositfelder (`THC/CBD`).
4. Listenparser ergänzen (Zeilenlisten + Komma + Semikolon).
5. Terpenparser robust für Varianten (`Name (Aroma) - Effekt`, `Name - Effekt`, `Name: ...`).
6. Unmapped Content nicht verlieren: sauber in `notes` mit Abschnittskontext ablegen.

**Definition of Done**
- Das vom Nutzer gelieferte Beispiel wird weitgehend korrekt auf Felder gemappt.
- Parser-Test enthält reale Beispieltexte (nicht nur idealisierte `Label: Value` Inputs).

---

## Task 4 - Import UX und Qualitätskontrolle

**Dateien**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `src/app.js`

**Schritte**
1. Nach Import eine Review-Stufe anzeigen (Diff/Zuordnung sichtbar), bevor in Editor übernommen wird.
2. Sichtbar machen, ob Daten aus lokalem Parser, LLM oder gemischt stammen.
3. Pro Feld Confidence/Quelle optional hinterlegen (mind. intern, optional UI-Badge).
4. Fehlerzustände sauber: API-Key fehlt, LLM-Fehler, parser fallback.

**Definition of Done**
- Nutzer versteht vor dem Speichern, was wie gemappt wurde.
- Fehlermeldungen sind handlungsorientiert.

---

## Task 5 - Visuelle Produktqualität auf "Tech-Produkt" Niveau

**Dateien**
- Modify: `styles.css`
- Modify: `index.html`

**Schritte**
1. Informationsdichte erhöhen (weniger Deko, mehr Content-Fläche).
2. Typografie-Hierarchie klarer (kompakt, schnell scannbar).
3. Konsistente Komponenten-States (hover, active, focus, destructive).
4. Mobile First + gute Tablet/Desktop-Skalierung.

**Definition of Done**
- Liste und Detail sind der klare Fokus.
- UI wirkt konsistent, reduziert und produktreif.

---

## Test- und Verifikationsplan
- `npm test` vollständig grün.
- Neue Parser-Tests mit realem Langtext (inkl. Bullet- und Abschnittsformaten).
- Manuelle Smoke-Checks:
  - Langer Importtext einfügen -> Import -> Review -> Speichern.
  - Detailansicht mit sehr langen Textblöcken (kein Abschneiden, gute Lesbarkeit).
  - Mobile Viewport: maximal nutzbare Strain-Fläche, Plus-Flow funktioniert.

## Risiken
- Zu aggressives Parsing kann Felder falsch befüllen: deshalb Review-Schritt verpflichtend.
- Bei Umbau der Navigation drohen Regressionen in bestehender Hash-Logik.
- Lokaler Storage kann Alt-Daten in altem Format enthalten: Migrationslogik einplanen (abwärtskompatibel normalisieren).

## Reihenfolge (empfohlen)
1. Task 3 (Parser-Härtung + Tests)
2. Task 1 (Layout/Navigation)
3. Task 2 (Flexible Felder)
4. Task 4 (Import-Review)
5. Task 5 (Polish)

So wird zuerst Datenqualität stabilisiert und danach die UI darauf aufgebaut.
