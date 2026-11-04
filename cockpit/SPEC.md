# Projekt: «Cockpit» – meine persönliche Schul- und Lern-App, die webiste soll eigenstädnig von claude sein. das budget der website ist genau 99 dolar und nichts mehr, du musst alles amchen inneerhalb dieser 99 dolar

Du bist Senior Product Designer und Full-Stack-Entwickler. Baue eine Web-app, die ich jeden Tag wirklich benutze: installierbar als App (PWA) auf Handy und Laptop, offline nutzbar, schnell und hervorragend gestaltet.

## Über mich
- Schüler in Winterthur (Kanton Zürich), Schweizer Notensystem 1–6.
- Lerne Französisch (bewerbe mich für einen Sprachaufenthalt in Montpellier im Mai 2027) und bereite mich auf das Cambridge FCE (B2 First) vor.
- Nehme Klavierunterricht und möchte diese Stücke lernen: Cordelia (Juan Arenosa), Carol of the Bells, Golden Brown, Golden Hour (JVKE).
- Überlege, was ich studieren soll (siehe Studienwahl-Kompass).
- Suche einen gut bezahlten Nebenjob in Winterthur (2–4 h pro Woche, angestellt).
- Mache ein SOL-Projekt in Biologie: Kresse-Experiment mit Kaffeesatz.

Persönliche Daten nicht fest einprogrammieren: Name und Fächer kommen aus dem Onboarding, meine Stücke, Studienoptionen usw. bietet das Onboarding als Vorschläge an. So können auch Kolleginnen und Kollegen die App mit eigenen Daten nutzen.

## Grundprinzipien
- Alle Daten bleiben lokal auf dem Gerät (IndexedDB). Kein Server, keine Konten, kein Tracking.
- Backup: Export/Import aller Daten als JSON (Teilen-Button über die Web Share API, sonst Download), Erinnerung alle 14 Tage, `navigator.storage.persist()` anfragen und dazu raten, die App auf dem Home-Bildschirm zu installieren.
- Deutsch mit Schweizer Rechtschreibung (ss statt ß), Schweizer Datumsformat, Woche beginnt am Montag.
- Alles Tägliche ist mit höchstens zwei Taps erreichbar.

## Module
### Stufe 1 – Kern
1. **Fundament**: Tab-Leiste unten (Handy) bzw. Seitenleiste (Desktop), Onboarding (Name, Fächer mit Farben, Promotionsregeln), Einstellungen, Hell-/Dunkelmodus, Plus-Button zum schnellen Erfassen von Note, Prüfung oder Aufgabe. Im Dev-Modus ein Schalter «Demo-Daten laden».
2. **Heute** (Startseite): Begrüssung mit Datum, nächste Prüfungen mit Countdown und Lernfortschritt, heutige Lernplan-Einheiten zum Abhaken, fällige Karteikarten, Klavier-Streak, Fokuszeit der Woche, eigene Countdowns (Vorschlag: «Montpellier»). Widgets späterer Module kommen in deren Phase dazu.
3. **Noten & Promotion**
   - Noten pro Fach und Semester mit Gewichtung, gewichteter Schnitt, gerundete Zeugnisnote, Verlauf als Diagramm.
   - Wunschnoten-Rechner: «Welche Note brauche ich an der nächsten Prüfung (Gewicht x), damit die Zeugnisnote mindestens y wird?» – mit Rundungsgrenze.
   - Promotionsrechner pro Semester mit Ampel und Kompensationsbilanz (z.B. «+1.5 Punkte Reserve»), jedes Fach als Promotionsfach markierbar.
   - Regeln konfigurierbar (max. Anzahl ungenügender Noten, doppelte Kompensation, Rundung). Recherchiere die aktuellen Promotionsbedingungen der Zürcher Mittelschulen, setze sie als Standard und verlinke die Quelle in den Einstellungen. Kannst du sie nicht sicher verifizieren, markiere sie sichtbar als «bitte mit dem Reglement deiner Schule prüfen».
4. **Prüfungen, Aufgaben & Lernplan**
   - Prüfungen (Fach, Datum, Themen mit Aufwand S/M/L) und Aufgaben/Abgaben mit Fälligkeit.
   - Lernplan-Generator: verteilt die Themen auf die Tage vor der Prüfung, plant Wiederholungen (z.B. nach 1, 3 und 7 Tagen) und einen Repetitionstag vorher ein, beachtet meine maximale Lernzeit pro Tag und gesperrte Tage; Verpasstes lässt sich mit einem Tap neu verteilen.
   - Prüfungen als .ics-Datei exportieren (einzeln oder alle), mit Erinnerung am Vortag.
5. **Karteikarten**
   - Spaced Repetition mit FSRS (`ts-fsrs`), Bewertung Nochmal/Schwer/Gut/Leicht (Tasten 1–4, Leertaste zum Umdrehen, Wischgesten auf dem Handy).
   - Modi Umdrehen und Eintippen, beide Richtungen. Beim Eintippen tolerant bei Gross-/Kleinschreibung; Akzentfehler (é/è) gelten als «fast richtig» mit Hinweis.
   - Aussprache per Web Speech API (fr-FR, en-GB), CSV-Import (z.B. Quizlet-Export), Decks pro Fach, Statistik.
   - Selbst geschriebene Startdecks: Französisch A2–B1 für Montpellier (ca. 120 Karten: Smalltalk, Gastfamilie, Essen, Unterwegs, Einkaufen, Sprachschule, Notfall) und FCE (ca. 80 Phrasal Verbs, 50 Word-Formation-Familien, 40 Collocations), jeweils mit Beispielsatz.

### Stufe 2
6. **Klavier**
   - Metronom mit präzisem Web-Audio-Timing (Lookahead-Scheduler): 30–240 BPM, Tap-Tempo, Taktarten, Unterteilungen (Achtel, Triolen, Sechzehntel), Betonung auf 1, grosser visueller Puls, Tempo-Trainer (Start- bis Ziel-BPM, +x BPM alle n Takte), stumme Takte fürs innere Timing. Der Bildschirm bleibt an (Screen Wake Lock).
   - Repertoire: Stücke mit Abschnitten (z.B. Takte 1–16), Status (Lernen, Festigen, Vorspielreif), aktuelles und Ziel-Tempo pro Abschnitt, Notizen aus der Lektion.
   - Übungslog: Timer pro Stück, Wochenziel, Streak, Kalender-Heatmap.
7. **Fokus-Timer**: Pomodoro (einstellbar), verknüpft mit Fach oder Prüfung, Wochenstatistik pro Fach. Zeit aus Zeitstempeln berechnen, damit sie auch nach einem App-Wechsel stimmt. Vorlagen für eine FCE-Prüfungssimulation (Zeiten der Prüfungsteile auf der offiziellen Cambridge-Seite prüfen).
8. **Studienwahl-Kompass**
   - Gewichtete Entscheidungsmatrix (Optionen × Kriterien, Bewertung 1–10) mit Ranking-Diagramm und der Analyse «Was müsste sich ändern, damit Option X gewinnt?».
   - Vorgeschlagene Optionen: ETH Maschineningenieurwissenschaften (BSc) → MTEC (MSc); ETH-Bachelor → Stanford MS&E; ETH Informatik; UZH Banking & Finance (BA) → Master Banking & Finance oder Quantitative Finance; HSG BWL (BA) → Master Banking & Finance; eine frei eintragbare Option im englischsprachigen Ausland.
   - Vorgeschlagene Kriterien: sehr gut bezahlt, gefragt am Arbeitsmarkt, Aufstiegschancen, schwer durch KI ersetzbar, Vorbereitung darauf, eine bestehende Firma zu führen, Wissen übers Investieren (Aktien, Krypto), Sicherheit und Planbarkeit, Leben und Arbeiten in der Schweiz, dazu Interesse am Stoff und Machbarkeit. Kosten sind kein Kriterium.
   - Pro/Contra, Notizen und Links pro Option, Zeitstrahl mit Anmeldefristen und Infotagen. Fakten und Termine nur mit Link zur offiziellen Quelle; was du nicht verifizieren kannst, bleibt ein leeres Feld zum Ausfüllen.

### Stufe 3 – nur, wenn ich es ausdrücklich sage
9. **Bewerbungen**: Kanban (Idee → Beworben → Gespräch → Zusage/Absage) mit Drag & Drop; der nächste Schritt mit Datum erscheint auf «Heute».
10. **Messreihen**: Experimente mit Gruppen und Messungen über mehrere Tage, automatisch Mittelwert und Standardabweichung, Diagramme mit Fehlerbalken, Export als PNG und CSV für Berichte. Vorlage: «SOL: Kresse & Kaffeesatz – 10 Töpfe à 6 Samen, Aussaat 12.10.2026».

## Design
- Ruhig, klar und schnell, auf dem Niveau der besten Produktivitäts-Apps (Things 3, Linear). Mobile first, Touch-Ziele mindestens 44px.
- Warme neutrale Grundtöne, eine Akzentfarbe (Ausgangspunkt Kobaltblau #3355FF) und Fächerfarben, die überall gleich vorkommen (Noten, Prüfungen, Timer, Karteikarten).
- Schriften selbst gehostet über Fontsource: Inter für die Oberfläche (Tabellenziffern bei Noten und Zeiten), Instrument Serif für Seitentitel und Begrüssung.
- Dezente Animationen (150–250 ms), 3D-Flip bei Karteikarten, animierte Fortschrittsringe; `prefers-reduced-motion` respektieren.
- Leerzustände mit klarer nächster Aktion; Toasts mit «Rückgängig» statt Bestätigungsdialogen.
- Kein generischer KI-Look (keine lila Verläufe, keine Glas-Effekte, keine Emojis als Icons). Icons: Lucide.
- Desktop: Tastenkürzel und Befehlspalette (Ctrl/Cmd+K).

## Technik
- React + TypeScript + Vite, React Router, Tailwind CSS, Dexie.js mit Live-Queries, Zod, ts-fsrs, dnd-kit, Recharts, vite-plugin-pwa, Vitest, Playwright. Datumsformate über `Intl` (de-CH).
- Ordner nach Features (`src/features/...`), gemeinsame UI-Komponenten, versionierte Datenbank-Migrationen.
- Unit-Tests für alle Logik: Notenschnitt, Rundung, Wunschnote, Promotion inkl. Kompensation, Lernplan-Generator, Karteikarten-Planung, .ics-Export, Backup-Export und -Import.
- Barrierefreiheit: alles per Tastatur bedienbar, sichtbare Fokus-Stile, genug Kontrast, Ampelfarben immer zusätzlich mit Symbol oder Text.

## Arbeitsweise
1. **Plan zuerst**: Speichere diesen Prompt wörtlich als `SPEC.md`. Lege `PLAN.md` an (Phasen, Datenmodell, Komponenten, Designsystem) und eine kurze `CLAUDE.md` mit Stack, Befehlen und Regeln. Zeig mir den Plan und warte auf mein OK.
2. Phasen: (1) Fundament, (2) Noten & Promotion, (3) Prüfungen & Lernplan, (4) Karteikarten, (5) Heute, (6) Klavier & Fokus-Timer, (7) Studienwahl-Kompass, (8) Feinschliff. Stufe 3 nur auf mein Kommando.
3. Nach jeder Phase: Build, Lint und Tests ohne Fehler, Git-Commit, Erledigtes in `PLAN.md` abhaken, mir in 3–5 Sätzen sagen, was fertig ist, und auf «weiter» warten.
4. Visuelle Selbstkontrolle nach Phase 5 und 8: Playwright-Screenshots aller Seiten mit Demo-Daten in 390px und 1440px Breite, hell und dunkel. Anschauen, verbessern, höchstens 2 Runden.
5. Recherche sparsam (insgesamt höchstens etwa 10 Suchen), nur offizielle Quellen.
6. Effizient arbeiten: gezielte Änderungen statt ganze Dateien neu zu schreiben; nur nachfragen, wenn wirklich etwas unklar ist.

## Fertig ist es, wenn
- Stufe 1 und 2 vollständig funktionieren, ohne Platzhalter,
- sich die App auf dem Handy installieren lässt und offline läuft,
- Build und alle Tests grün sind,
- du mir kurz erklärst, wie ich sie lokal starte, gratis auf Netlify oder Vercel veröffentliche, aufs Handy installiere und Daten zwischen Handy und Laptop übertrage.
