# PLAN – Cockpit

Umsetzungsplan zu [SPEC.md](SPEC.md). Nach jeder Phase wird hier abgehakt.
**Status:** Phase 3 erledigt – Arbeit läuft am Stück weiter (Auftrag: ohne Zwischenstopps).

---

## Grundsatzentscheide

- **Ort:** Die App liegt im Ordner `cockpit/`. Das Poker-Projekt im Hauptordner bleibt unberührt. Bei Netlify/Vercel wird `cockpit` als Basisordner eingetragen.
- **Eigenständig:** Statische Web-App ohne Server, ohne KI-Anbindung und ohne Netzwerkanfragen zur Laufzeit. Schriften und Icons sind im Build enthalten.
- **Persönliches als Vorschlagspakete:** Montpellier-Countdown, Startdecks, Klavierstücke, Studienoptionen und Kriterien werden nicht fest eingebaut. Man übernimmt sie mit einem Tap im Onboarding oder später im Leerzustand des Moduls. Kolleginnen und Kollegen starten so mit eigenen Daten.
- **Schlank:** nur der Stack aus der SPEC, keine zusätzliche UI-Bibliothek. Dialoge und Bottom-Sheets nutzen das native `<dialog>`, Diagramme werden pro Seite nachgeladen.
- **Code englisch, Oberfläche deutsch (CH).**

---

## Phasen

### Phase 0 – Plan ✅
- [x] `SPEC.md` (Prompt wörtlich), `PLAN.md`, `CLAUDE.md`
- [x] OK erhalten

### Phase 1 – Fundament ✅
- [x] Setup: Vite, React, TypeScript (strict), Tailwind v4, ESLint (mit jsx-a11y), Vitest (mit fake-indexeddb), Playwright
- [x] Designsystem: Tokens hell/dunkel, Fächerfarben, Schriften (Fontsource), UI-Bausteine (siehe unten)
- [x] Datenbank: Dexie-Schema v1 mit allen Tabellen für Stufe 1 und 2, Zod-Schemas, Migrationsgerüst mit Test
- [x] App-Hülle: Tab-Leiste (Handy) und Seitenleiste (Desktop), Routing mit Lazy-Loading
- [x] Onboarding in 5 Schritten:
  1. Name
  2. Fächer (Vorschlagsliste, Farbe, Promotionsfach ja/nein)
  3. Aktuelles Semester
  4. Promotionsregeln
  5. Vorschlagspakete, danach Speicher-Freigabe und Installationshinweis
- [x] Einstellungen:
  - Profil und Darstellung (System, Hell, Dunkel)
  - Fächer (bearbeiten, mit dnd-kit sortieren, archivieren) und Semester
  - Regeln und Daten
- [x] Plus-Button für Note, Prüfung oder Aufgabe: 2 Taps bis zum Formular
- [x] Toasts mit «Rückgängig» als gemeinsamer Mechanismus für alles, was löscht oder ersetzt
- [x] Befehlspalette (Ctrl/Cmd+K), Tastenkürzel, Taste `?` zeigt die Übersicht
- [x] Backup:
  - Export als JSON (Web Share API, sonst Download)
  - Import mit Zod-Prüfung und «Rückgängig»
  - Erinnerung alle 14 Tage
  - `navigator.storage.persist()` anfragen
  - Installieren-Hinweis (Android-Prompt, iOS-Anleitung)
- [x] PWA: Manifest, Icons, Service Worker (alles offline), Update-Hinweis, App-Shortcuts (z. B. «Note erfassen»)
- [x] Dev-Modus mit Schalter «Demo-Daten laden» (fiktive Daten, wächst mit jeder Phase)
- [x] Tests: Backup-Export und -Import, Migration, Datumshelfer

**Stand Phase 1:**
- Vorgezogen: Recherche zu den Promotionsregeln, weil das Onboarding sie braucht. Die offiziellen Seiten von zh.ch waren aus der Bauumgebung gesperrt. Standardwerte deshalb sichtbar als «bitte prüfen» markiert, mit Link zu LS 413.251.1.
- Vorläufige Listen für «Noten» und «Planer» zeigen schon alles Erfasste. Phase 2 und 3 bauen sie aus.
- Karten, Klavier, Fokus und Kompass zeigen «Kommt bald»; diese Hinweise verschwinden mit ihrer Phase.
- Deploy-Konfiguration: `netlify.toml` im Repo-Hauptordner und `vercel.json`.

### Phase 2 – Noten & Promotion ✅
- [x] Recherche Promotionsreglement Zürcher Mittelschulen (in Phase 1 vorgezogen). Quelle ist in den Einstellungen verlinkt; nicht sicher Verifiziertes trägt den Hinweis «bitte mit dem Reglement deiner Schule prüfen».
- [x] Noten erfassen und bearbeiten: Note (Komma oder Punkt), Gewicht, Titel, Datum, Fach, Semester
- [x] Semesterübersicht: alle Fächer mit gewichtetem Schnitt und gerundeter Zeugnisnote
- [x] Fach-Detail: Notenliste, Verlauf als Diagramm (Einzelnoten und laufender Schnitt), Wunschnoten-Rechner mit Rundungsgrenze
- [x] Promotionsrechner pro Semester:
  - Ampel immer mit Symbol und Text
  - Kompensationsbilanz («+1.5 Punkte Reserve»)
  - Prüfung jeder Regel und Beitrag pro Fach
- [x] Tests: Schnitt, Rundung, Wunschnote, Promotion inkl. Kompensation

**Stand Phase 2:**
- Seiten: `/noten` (Übersicht mit Promotionskarte), `/noten/fach/:id` (Zeugnisnote, Wunschnote, Verlauf, Noten bearbeiten) und `/noten/promotion` (Ampel, Regelprüfung, Kompensationsbilanz, Promotionsfächer umschalten).
- Diagramme: Recharts wird nur auf der Fachseite nachgeladen. Das Farbpaar für Plus/Minus ist mit dem Palette-Validator geprüft (hell und dunkel, Farbsehschwäche).

### Phase 3 – Prüfungen, Aufgaben & Lernplan ✅
- [x] Prüfungen: Fach, Titel, Datum (Zeit optional), Gewicht, Themen mit Aufwand S/M/L, Notizen. Nach der Prüfung «Note eintragen».
- [x] Aufgaben/Abgaben mit Fälligkeit, gruppiert nach Überfällig, Heute, Diese Woche, Später, Erledigt
- [x] Lernplan-Generator (Algorithmus unten), Tagesansicht, «Verpasstes neu verteilen» mit einem Tap
- [x] Einstellungen für den Lernplan:
  - max. Minuten pro Tag
  - gesperrte Wochentage und Daten
  - Minuten für S/M/L
  - Wiederholungsintervalle und Repetitionstag
- [x] .ics-Export einzeln oder alle, Erinnerung am Vortag
- [x] Tests:
  - Generator: Kapazität, Sperrtage, Wiederholungen, Repetitionstag, Überlauf
  - Neuverteilung und .ics

**Stand Phase 3:**
- Eine neue Prüfung mit Themen bekommt sofort einen Lernplan. Ändern sich Themen oder Datum, wird er angepasst; Erledigtes bleibt.
- Mehrere Prüfungen teilen sich die tägliche Lernzeit.
- Prüfungsseite `/planer/pruefung/:id`: Fortschrittsring, Themen, Lernplan, Notizen, «Note eintragen» (verknüpft Note und Prüfung), Export in den Kalender.
- Lernplan-Tab mit «Verpasstes neu verteilen» (ein Tap, mit Rückgängig). Aufgaben lassen sich jetzt auch bearbeiten.

### Phase 4 – Karteikarten
- [ ] Decks pro Fach: Sprache je Seite, Richtung (vorwärts, rückwärts, beide), Karten mit Beispielsatz
- [ ] Lernen mit FSRS (`ts-fsrs`):
  - Bewertung über Tasten 1–4, Leertaste dreht um
  - Wischgesten (links Nochmal, unten Schwer, rechts Gut, oben Leicht) und Buttons zusätzlich
- [ ] Modi Umdrehen (3D-Flip) und Eintippen: tolerant bei Gross-/Kleinschreibung; Akzentfehler gelten als «fast richtig» mit Hinweis
- [ ] Aussprache per Web Speech API (fr-FR, en-GB), CSV-Import mit Vorschau (Quizlet: Tab/Zeilenumbruch, auch `;` und `,`)
- [ ] Statistik: Wiederholungen pro Tag, Trefferquote, Kartenstatus, Prognose der nächsten 7 Tage
- [ ] Startdecks (selbst geschrieben, jede Karte mit Beispielsatz):
  - Französisch A2–B1 «Montpellier»: ca. 120 Karten in 7 Themen
  - FCE: 80 Phrasal Verbs, 50 Word-Formation-Familien, 40 Collocations
- [ ] Tests: Planung (Warteschlange, neue Karten pro Tag, Richtungen), Antwortprüfung, CSV-Parser

### Phase 5 – Heute
- [ ] Begrüssung (tageszeitabhängig) mit Datum und Kalenderwoche
- [ ] Nächste Prüfungen mit Countdown und Fortschrittsring
- [ ] Heutige Lerneinheiten zum Abhaken
- [ ] Fällige Aufgaben und fällige Karteikarten
- [ ] Eigene Countdowns
- [ ] Banner für Backup-Erinnerung und verpasste Lerneinheiten
- [ ] Leerzustände mit nächster Aktion
- [ ] Visuelle Kontrolle, Runde 1: Screenshots aller Seiten (390 und 1440 px, hell und dunkel, Demo-Daten), danach Verbesserungen

### Phase 6 – Klavier & Fokus-Timer
- [ ] Metronom:
  - Lookahead-Scheduler mit Worker-Takt, 30–240 BPM, Tap-Tempo
  - Taktarten, Unterteilungen, Betonung auf 1, grosser Puls
  - Tempo-Trainer und stumme Takte
  - Wake Lock
- [ ] Repertoire: Stücke mit Abschnitten (Takte, Status, aktuelles und Ziel-Tempo) und datierten Lektionsnotizen
- [ ] Übungslog: Timer pro Stück, Wochenziel, Streak, Kalender-Heatmap
- [ ] Fokus-Timer:
  - Pomodoro (einstellbar), verknüpft mit Fach oder Prüfung
  - zeitstempelbasiert, überlebt App-Wechsel und Neuladen
  - Wochenstatistik pro Fach
  - Vorlage FCE-Simulation (Zeiten von der offiziellen Cambridge-Seite)
- [ ] Widgets auf «Heute»: Klavier-Streak (mit Knöpfen «Üben» und «Metronom»), Fokuszeit der Woche
- [ ] Tests: Tap-Tempo, Tempo-Trainer, stumme Takte, Streak, Heatmap, Timer-Zustandsmaschine

### Phase 7 – Studienwahl-Kompass
- [ ] Optionen × Kriterien:
  - Gewichte 0–10, Bewertung 1–10
  - mobil als Karten, auf dem Desktop als Tabelle
- [ ] Ranking-Diagramm und Analyse «Was müsste sich ändern, damit Option X gewinnt?»
- [ ] Pro/Contra, Notizen und Links pro Option
- [ ] Zeitstrahl mit Fristen und Infotagen: nur Termine mit offiziellem Link, Unbestätigtes bleibt leer
- [ ] Vorschlagspakete für Optionen und Kriterien
- [ ] Tests: Punktzahl, Ranking, Analyse

### Phase 8 – Feinschliff
- [ ] Barrierefreiheit: Tastatur, Fokus, Kontrast, Labels für Screenreader
- [ ] Performance: Bundle-Grösse, Lazy-Loading
- [ ] Offline-Test mit Playwright
- [ ] Visuelle Kontrolle, Runde 2
- [ ] README: lokal starten, Netlify/Vercel, aufs Handy installieren, Daten übertragen

### Stufe 3 – nur auf Kommando
- [ ] 9 Bewerbungen: Kanban mit dnd-kit, der nächste Schritt erscheint auf «Heute»
- [ ] 10 Messreihen:
  - Gruppen und Messungen, Mittelwert und Standardabweichung
  - Fehlerbalken, Export als PNG und CSV
  - Vorlage «Kresse & Kaffeesatz»

**Abschluss jeder Phase:** Build, Lint und Tests grün → Commit → hier abhaken → Kurzbericht → auf «weiter» warten.

---

## Navigation

| Handy (Tab-Leiste) | Desktop (Seitenleiste) |
|---|---|
| Heute · Planer · Noten · Karten · Mehr | Heute, Planer, Noten, Karten, Klavier, Fokus, Kompass · unten Einstellungen |

- **Planer:** Prüfungen, Aufgaben und Lernplan, umschaltbar über Segmente.
- **Mehr:** Klavier, Fokus, Kompass, Einstellungen.
- **Plus-Button:** auf dem Handy rechts unten über der Tab-Leiste, auf dem Desktop oben in der Seitenleiste.

**Zwei-Tap-Prüfung für das Tägliche:**

| Ziel | Weg | Taps |
|---|---|---|
| Lerneinheit abhaken | Heute | 1 |
| Karten lernen | Heute → «Lernen» | 1 |
| Fokus starten | Heute → «Fokus» oder Mehr → Fokus | 1–2 |
| Üben oder Metronom | Heute-Widget oder Mehr → Klavier | 1–2 |
| Note, Prüfung oder Aufgabe erfassen | + → Typ | 2 |

**Routen:**
- `/` – Heute
- `/planer`, `/planer/pruefung/:id`
- `/noten`, `/noten/fach/:id`, `/noten/promotion`
- `/karten`, `/karten/deck/:id`, `/karten/lernen/:id`, `/karten/statistik`
- `/klavier`, `/klavier/stueck/:id`
- `/fokus`
- `/kompass`, `/kompass/option/:id`
- `/einstellungen`, `/willkommen` (Onboarding)

**Tastenkürzel:**

| Taste | Wirkung |
|---|---|
| Ctrl/Cmd+K | Befehlspalette |
| `N` | Schnellerfassung |
| `G` dann `H` / `P` / `N` / `K` / `M` / `F` / `S` / `E` | Navigation |
| `?` | Übersicht aller Kürzel |
| Leertaste, `1`–`4` | Karteikarten |
| Leertaste, ↑ / ↓, `T` | Metronom |
| Esc | schliesst Dialoge |

---

## Datenmodell (Dexie, Schema v1)

Grundsätze:
- IDs sind UUIDs.
- Kalendertage werden als lokale `YYYY-MM-DD` gespeichert, Zeitpunkte als Millisekunden.
- Jede Tabelle hat ein Zod-Schema. Daraus kommen die TypeScript-Typen, und auch der Backup-Import wird damit geprüft.

```text
kv            key → value          Profil, Einstellungen, Regeln, laufender Timer, Backup-Metadaten
subjects      id, name, color, isPromotion, order, archived
semesters     id, name, start, end                                  «HS 2026/27», «FS 2027»
grades        id, subjectId, semesterId, value, weight, date, title?, examId?
exams         id, subjectId, title, date, time?, weight?, topics[{id,title,effort S|M|L}], notes?
tasks         id, title, subjectId?, due?, done, doneAt?
studySessions id, examId, topicId?, date, minutes, kind learn|review|repetition, done
countdowns    id, title, date
decks         id, name, subjectId?, frontLang?, backLang?, directions fwd|rev|both, source
cards         id, deckId, front, back, example?
cardStates    id=cardId:dir, cardId, deckId, dir, FSRS-Felder (due, stability, difficulty, reps, lapses, state, last_review)
reviewLogs    id, cardId, deckId, dir, rating, mode flip|type, reviewedAt
pieces        id, title, composer?, status, sections[{id,name,bars,status,bpm,targetBpm}], lessonNotes[{date,text}], order
practiceLogs  id, pieceId?, date, startedAt, seconds
focusSessions id, kind pomodoro|free|fce, subjectId?, examId?, date, startedAt, endedAt, focusSeconds
studyOptions  id, name, pros[], cons[], notes, links[{label,url}], order
criteria      id, name, weight, order
ratings       [optionId+criterionId], score
timeline      id, optionId?, title, date?, kind deadline|infoday|other, url?
```

**Wichtige Einstellungen in `kv`:**

```text
promotionRules: passMark 4, roundingStep 0.5, maxInsufficient, compensationFactor 2,
                minAverage?, warnReserve 1, source{url,label}, verified
studyPlan:      maxMinutesPerDay 90, blockedWeekdays[], blockedDates[], effortMinutes {S:30,M:60,L:90},
                reviewOffsets [1,3,7], repetitionDay true
flashcards:     newPerDay 20, retention 0.9
focus:          25/5/15, langePause alle 4
piano:          weeklyGoal 120 min
backup:         lastExportAt, snoozedUntil
```

Die Startwerte der Promotionsregeln kommen aus der Recherche in Phase 2.

**Migrationen:**
- Bestehende Versionen werden nie verändert. Jede Änderung ist eine neue `db.version(n)` mit `upgrade()` und Test.
- Backups tragen `schemaVersion`. Ältere Exporte werden beim Import hochmigriert.

---

## Kernlogik (reine Funktionen, alle mit Unit-Tests)

| Modul | Logik |
|---|---|
| Notenschnitt | Σ(Note·Gewicht) / ΣGewicht |
| Zeugnisnote | Rundung auf `roundingStep` mit Epsilon-Schutz; x.25 wird bei halben Noten aufgerundet |
| Wunschnote | g ≥ ((y − step/2)·(W + x) − S) / x, wobei S die Summe der gewichteten Noten und W die Summe der Gewichte ist. Ergebnis: «schon sicher», «nötig: 4.6» oder «nicht erreichbar (> 6)». |
| Promotion | Siehe unten |
| Lernplan | Siehe unten |
| Karteikarten | FSRS pro Karte und Richtung. Warteschlange: Lernen/Neu-Lernen → fällige Wiederholungen → neue Karten (Tageslimit). |
| Eintippen | Normalisieren (Gross-/Kleinschreibung, Leerzeichen, Satzzeichen am Ende, Apostroph-Varianten). Erlaubt Alternativen (`a / b`, `a; b`) und optionale Teile (`(se) lever`). Nur Akzente falsch → «fast richtig» mit Hinweis auf das korrekte Wort. |
| Metronom | Siehe unten |
| Fokus-Timer | Zustand {Phase, Start, Pausen-Summe} liegt in der DB. Restzeit = Plan − (jetzt − Start − Pausen). Nach einem App-Wechsel wird korrekt nachgerechnet. |
| Kompass | Siehe unten |
| .ics | RFC 5545: CRLF, Zeilenfaltung, Escaping, VTIMEZONE Europe/Zurich. VALARM am Vortag (ganztägig 18:00, mit Uhrzeit 24 h vorher). |
| Backup | Export → JSON mit Version. Import: Zod prüfen, migrieren, Transaktion. Vorher Schnappschuss für «Rückgängig». |

**Promotion:** Grundlage sind die gerundeten Zeugnisnoten der Promotionsfächer.
- Plus-Punkte = Σ(Note − 4) aller Noten über 4.
- Minus-Punkte = Σ(4 − Note) aller Noten unter 4.
- Bilanz = Plus − Faktor·Minus.
- Geprüft werden die Bilanz ≥ 0, die Anzahl ungenügender Noten ≤ Maximum und optional ein Mindestschnitt.
- Ampel: Grün = erfüllt mit Reserve; Gelb = erfüllt, aber Reserve < 1 oder Maximum an ungenügenden Noten erreicht; Rot = nicht erfüllt.

**Lernplan:**
1. Verfügbare Tage von heute bis zum Tag vor der Prüfung bestimmen. Gesperrte Tage fallen weg. Die Restkapazität pro Tag ist das Maximum minus das, was andere Prüfungen dort schon belegen.
2. Der Repetitionstag wird reserviert: der letzte freie Tag vor der Prüfung.
3. Die Themen werden gleichmässig auf die ersten rund zwei Drittel der Lerntage verteilt. Ein Thema, das grösser ist als ein Tag, wird geteilt.
4. Wiederholungen kommen an Tag +1, +3 und +7 nach dem Lernen. Ist der Tag nicht frei, rutscht die Wiederholung auf den nächsten freien Tag. Was nicht passt, fliesst in den Repetitionstag.
5. Was trotzdem nicht passt, wird als Überlauf gemeldet («40 Min. passen nicht»).

«Verpasstes neu verteilen»: Offene Einheiten vor heute werden mit derselben Platzierung neu gesetzt; erledigte und künftige Einheiten bleiben fix.

**Metronom:**
- Ein Worker tickt alle 25 ms, der Scheduler plant 100 ms voraus auf der AudioContext-Uhr.
- Klicks werden synthetisch erzeugt: Betonung, Schlag und Unterteilung klingen verschieden.
- Der Puls folgt der Audio-Zeit über `requestAnimationFrame`.
- Tempo-Trainer: bpm(Takt) = min(Ziel, Start + ⌊Takt/n⌋·x).
- Stumme Takte: Muster «n Takte spielen, m Takte stumm».
- Tap-Tempo: Mittelwert der letzten Abstände, Neustart nach 2 s Pause.

**Kompass:**
- Punktzahl = Σ(Gewicht·Bewertung) / ΣGewicht.
- Die Analyse prüft für Option X jede einzelne Änderung:
  - eine Bewertung von X erhöhen (höchstens bis 10)
  - eine Bewertung des Spitzenreiters senken
  - ein Gewicht im Bereich 0–10 ändern
- Angezeigt wird die kleinste Änderung, die X an die Spitze bringt. Reicht keine einzelne Änderung, erscheint «Keine einzelne Änderung reicht – Abstand 1.3 Punkte».

---

## Komponenten

### App-Hülle (`src/app`)
- AppLayout, TabBar, Sidebar
- PlusButton mit QuickAddSheet
- CommandPalette, ShortcutsHelp
- UpdatePrompt, InstallHint, BackupReminder

### Gemeinsame Bausteine (`src/ui`)

| Gruppe | Bausteine |
|---|---|
| Aktionen | Button (primär, sekundär, ruhig, Gefahr), IconButton |
| Formulare | Field (Label, Hinweis, Fehler), Input, GradeInput (Komma/Punkt), Textarea, Select, Switch, Checkbox (animiert), SegmentedControl, Slider |
| Überlagerungen | Sheet (Bottom-Sheet bzw. Dialog), Menu, Toast mit Aktion/Undo |
| Inhalt | EmptyState, Card, ListRow, PageHeader (Serif-Titel und Aktionen), ChartFrame (Recharts im Token-Stil) |
| Status | ProgressRing (animiert), ProgressBar, Badge, StatusPill (Ampel mit Symbol und Text), Countdown |
| Fächer & Sonstiges | SubjectDot, SubjectChip, ColorSwatchPicker, Kbd |

### Seiten pro Feature
- **Onboarding:** Stepper mit 5 Schritten.
- **Heute:** Widgets in einer Spalte (Handy) bzw. zwei Spalten (Desktop).
- **Noten:**
  - Semesterwahl, oben die Promotionskarte, darunter die Fachliste
  - Fach-Detail mit Diagramm, Liste und Wunschnoten-Rechner
- **Planer:** Prüfungsliste und Prüfungs-Detail (Themen, Plan, .ics, Note), Aufgabenliste, Lernplan-Tagesliste.
- **Karten:**
  - Deckliste mit fälligen Karten
  - Deck-Detail mit Karten, Import und Einstellungen
  - Lernen im Vollbild, Statistik
- **Klavier:** Bereiche Metronom, Repertoire und Übungslog; Stück-Detail.
- **Fokus:** Ring-Timer, Verknüpfung, Vorlagen, Wochendiagramm.
- **Kompass:** Matrix, Ranking, Analyse, Option-Detail, Zeitstrahl.
- **Einstellungen:** gruppierte Liste, Daten-Bereich, «Über» mit Dev-Modus.

**Dev-Modus:**
- Er ist aktiv bei `npm run dev` oder nach fünfmaligem Tippen auf die Versionsnummer.
- Dann erscheint der Schalter «Demo-Daten laden».
- Demo-Daten ersetzen alles, ein Toast bietet «Rückgängig».

---

## Designsystem

**Farben** (CSS-Variablen, über Tailwind-Theme genutzt):

| Token | Hell | Dunkel |
|---|---|---|
| Hintergrund | `#F7F5F1` | `#131211` |
| Fläche / Fläche-2 | `#FFFFFF` / `#F1EEE8` | `#1B1A18` / `#242220` |
| Linie | `#E5E0D8` | `#33302C` |
| Text / Text-2 | `#1D1B18` / `#5E5850` | `#EEEBE6` / `#ADA69C` |
| Akzent Kobalt | `#3355FF` | `#7B8CFF` |
| Erfolg / Warnung / Gefahr | `#1E8E4F` / `#B26B00` / `#D23F3F` | `#4ACF85` / `#F2B544` / `#FF7A72` |

Die Werte erfüllen WCAG AA. Status wird nie nur über Farbe gezeigt, immer auch mit Lucide-Symbol und Text.

**Fächerfarben (12):** Rot, Orange, Gelb, Oliv, Grün, Petrol, Cyan, Himmel, Violett, Pink, Braun, Schiefer.
- Jede Farbe gibt es als Punkt, als weichen Hintergrund (Chip) und als lesbare Textvariante, jeweils für hell und dunkel.
- Die Fachfarbe erscheint überall gleich: Noten, Prüfungen, Lerneinheiten, Timer-Ring, Decks.

**Schrift:**
- Inter Variable für die Oberfläche: 13 / 15 / 17 / 22–28 px, Eingabefelder 16 px gegen iOS-Zoom. Zahlen (Noten, Zeiten, Countdowns) mit `tabular-nums`.
- Instrument Serif für Seitentitel (28–32 px) und die Begrüssung (34–44 px).

**Form:**
- 4-px-Raster; Radien 8 (Felder), 12 (Karten), 20 (Sheets).
- Karten haben 1-px-Linien statt Schatten. Ein dezenter Schatten kommt nur bei Overlays (Sheet, Menü, Toast) zum Einsatz.
- Keine Verläufe, kein Glas, kein Blur.

**Bewegung:**
- 150 ms für Hover/Druck, 200 ms für Sheets, Toasts und Listen, 250 ms für Karten-Flip und Ringe.
- Kurve `cubic-bezier(.2,.8,.2,1)`.
- Bei `prefers-reduced-motion` gibt es nur kurze Überblendungen: Der Flip wird zur Überblendung, Ringe springen direkt.

**Interaktion:**
- Touch-Ziele mindestens 44 px.
- `:focus-visible` mit 2-px-Akzentring.
- Icons: Lucide, 20 px, Strichstärke 1.75.
- Leerzustände enthalten immer eine Aktion.
- Löschen und Ersetzen passiert sofort, ein Toast bietet «Rückgängig».

**Layout:**
- Handy: Rand 16 px, Tab-Leiste 64 px plus Safe Area.
- Desktop ab 1024 px: Seitenleiste 240 px, Inhalt bis 1080 px breit, Heute zweispaltig.

---

## Ordnerstruktur

```text
cockpit/
├── SPEC.md  PLAN.md  CLAUDE.md  README.md
├── index.html  package.json  vite.config.ts  tsconfig.json  eslint.config.js  playwright.config.ts
├── public/                  Icons, Favicon
├── e2e/                     Playwright-Tests und Screenshot-Skript
└── src/
    ├── main.tsx  App.tsx  routes.tsx  index.css (Tokens)
    ├── app/                 Hülle, Navigation, Palette, PWA-Hinweise
    ├── ui/                  gemeinsame Bausteine
    ├── lib/                 Datum (de-CH, Montag), Format, IDs, Teilen/Download, Sprache, Wake Lock
    ├── db/                  Dexie-Schema und Migrationen, Zod-Schemas, Einstellungen
    └── features/
        ├── onboarding/  settings/  backup/  today/  dev/
        ├── grades/      logic/ + Seiten
        ├── planner/     exams, tasks, studyplan/, ics/
        ├── flashcards/  logic/, starter/ (Decks), Seiten
        ├── piano/       metronome/ (Engine, Worker), repertoire/, practice/
        ├── focus/       logic/, templates/
        └── compass/     logic/, Seiten
```

---

## Tests

- **Unit (Vitest):**
  - Schnitt, Rundung, Wunschnote, Promotion
  - Lernplan und Neuverteilung, .ics
  - FSRS-Warteschlange, Antwortprüfung, CSV
  - Backup und Migration (mit fake-indexeddb)
  - Datumshelfer
  - Tap-Tempo, Tempo-Trainer, Streak/Heatmap, Fokus-Timer
  - Kompass-Analyse
- **E2E (Playwright):** Onboarding → Note erfassen → Schnitt sichtbar; Karte lernen; offline neu laden.
- **Screenshots:** `npm run screenshots` für alle Seiten, 390 und 1440 px, hell und dunkel, mit Demo-Daten.

## Recherche (höchstens ca. 10 Suchen, nur offizielle Quellen)

| Phase | Thema | Quelle | Suchen |
|---|---|---|---|
| 2 | Promotionsreglement Zürcher Mittelschulen | zh.ch / ZH-Lex | 2–3 |
| 6 | Cambridge B2 First: Prüfungsteile und Zeiten | cambridgeenglish.org | 1–2 |
| 7 | Anmeldefristen und Infotage | ETH, UZH, HSG, Stanford MS&E | 4–5 |

## Bekannte Grenzen

- **Sprachausgabe:** Stimmen hängen vom Gerät ab. Offline gehen nur lokal installierte Stimmen.
- **iOS:** Es gibt keinen automatischen Installieren-Dialog, deshalb zeigt die App eine Anleitung.
- **Hintergrund:** Läuft die App im Hintergrund, kann das Betriebssystem das Metronom anhalten. Der Fokus-Timer rechnet über Zeitstempel trotzdem richtig.
- **Kein Sync-Server:** Daten wandern per Backup-Datei zwischen Handy und Laptop (Teilen → Import).
