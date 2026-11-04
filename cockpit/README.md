# Cockpit

Persönliche Schul- und Lern-App als installierbare Web-App (PWA). Alles bleibt auf deinem Gerät: kein Konto, kein Server, kein Tracking.

- **Heute:** Begrüssung, Lerneinheiten zum Abhaken, Aufgaben, Prüfungen mit Countdown, fällige Karteikarten, Klavier-Streak, Fokuszeit, eigene Countdowns
- **Noten & Promotion:** gewichteter Schnitt, Zeugnisnote, Wunschnoten-Rechner, Promotionsrechner mit Kompensation (Regeln einstellbar)
- **Planer:** Prüfungen mit Themen, Aufgaben, automatischer Lernplan mit Wiederholungen, Export als `.ics` mit Erinnerung
- **Karteikarten:** FSRS-Wiederholung, Umdrehen oder Eintippen, Aussprache, CSV-Import, Startdecks Französisch und FCE
- **Klavier:** präzises Metronom (Tempo-Trainer, stumme Takte), Repertoire mit Abschnitten und Tempi, Übungslog mit Streak und Heatmap
- **Fokus:** Pomodoro und FCE-Prüfungssimulation, verknüpft mit Fach oder Prüfung, Wochenstatistik
- **Studienwahl-Kompass:** gewichtete Entscheidungsmatrix, Ranking, Analyse «Was müsste sich ändern?», Zeitstrahl mit offiziellen Fristen

## Lokal starten

Voraussetzung: [Node.js](https://nodejs.org) ab Version 22.22 (inkl. npm).

```bash
cd cockpit
npm install
npm run dev
```

Dann <http://localhost:5173> öffnen. Im Entwicklungsmodus gibt es unter **Einstellungen → Über** den Schalter **«Demo-Daten laden»**. Deine eigenen Daten werden dabei gesichert und beim Ausschalten wiederhergestellt. In der veröffentlichten App erscheint der Schalter, wenn du fünfmal auf die Versionsnummer tippst.

Die fertige App mit Offline-Modus lokal ansehen:

```bash
npm run build
npm run preview   # http://localhost:4173
```

| Befehl | Zweck |
|---|---|
| `npm test` | Unit-Tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run build` | Typecheck und Produktions-Build nach `dist/` |
| `npm run test:e2e` | End-to-End-Tests mit Playwright (vorher `npm run build`; beim ersten Mal `npx playwright install chromium`) |
| `npm run screenshots` | Screenshots aller Seiten (390/1440 px, hell/dunkel) nach `screenshots/` |
| `npm run format` | Code formatieren (Prettier) |

## Gratis veröffentlichen

Beide Anbieter liefern automatisch HTTPS – das braucht die App zum Installieren und für den Offline-Modus.

### Netlify

**Mit GitHub (empfohlen, aktualisiert sich bei jedem Push):**
1. Auf [app.netlify.com](https://app.netlify.com) anmelden → **Add new site → Import an existing project** → GitHub → dieses Repository wählen.
2. Die Datei `netlify.toml` im Hauptordner des Repositorys setzt alles: Basisordner `cockpit`, Build `npm run build`, Ordner `dist`, Node 22 und die Weiterleitung aller Seiten auf `index.html`.
3. **Deploy** klicken. Nach etwa einer Minute ist die App unter `https://<name>.netlify.app` erreichbar.

**Ohne GitHub:** `npm run build` ausführen und den Ordner `cockpit/dist` auf [app.netlify.com/drop](https://app.netlify.com/drop) ziehen. Die Datei `_redirects` ist schon im Build enthalten.

### Vercel

1. Auf [vercel.com](https://vercel.com) anmelden → **Add New → Project** → das GitHub-Repository importieren.
2. Bei **Root Directory** `cockpit` eintragen. Framework «Vite» wird erkannt (Build `npm run build`, Ausgabe `dist`).
3. **Deploy**. Die Weiterleitungen für alle Seiten stehen in `cockpit/vercel.json`.

## Aufs Handy installieren

1. Die veröffentlichte Adresse auf dem Handy öffnen.
2. Installieren:
   - **iPhone/iPad (Safari):** Teilen-Symbol → **Zum Home-Bildschirm** → **Hinzufügen**.
   - **Android (Chrome):** Menü ⋮ → **App installieren** (oder den Hinweis in Cockpit antippen).
   - **Laptop (Chrome/Edge):** Installieren-Symbol rechts in der Adressleiste.
3. Cockpit vom Home-Bildschirm starten. Nach dem ersten Öffnen läuft alles auch ohne Internet. Bei einer neuen Version erscheint unten «Neue Version verfügbar» → **Aktualisieren**.

Tipp fürs iPhone: Safari kann Daten von Websites löschen, die man länger nicht besucht. Für Apps auf dem Home-Bildschirm gilt das nicht – deshalb Cockpit installieren und regelmässig sichern.

## Daten zwischen Handy und Laptop übertragen

Es gibt bewusst keinen Server. Die Daten reisen als Sicherungsdatei (JSON):

1. **Auf dem Gerät mit den Daten:** **Einstellungen → Daten & Backup → Sicherung teilen**. Auf dem Handy öffnet sich das Teilen-Menü (AirDrop, Nachrichten, Mail, Dateien …). Auf dem Laptop **Herunterladen** wählen.
2. **Auf dem neuen Gerät:** **Einstellungen → Daten & Backup → Sicherung importieren** und die Datei wählen. Auf einem frisch eingerichteten Gerät geht das auch direkt im ersten Schritt der Einrichtung («Sicherung importieren»).

Der Import ersetzt die Daten auf diesem Gerät. Davor wird automatisch ein Schnappschuss angelegt, sodass du den Import mit «Rückgängig» zurücknehmen kannst. Cockpit erinnert dich alle 14 Tage an eine Sicherung. Laufende Timer werden nicht übertragen.

Arbeite immer nur auf einem Gerät weiter und übertrage dann. Zwei Geräte gleichzeitig zu nutzen und abzugleichen, ist nicht vorgesehen.

## Technik

React + TypeScript + Vite, React Router, Tailwind CSS, Dexie (IndexedDB) mit Live-Queries, Zod, ts-fsrs, dnd-kit, Recharts, vite-plugin-pwa, Vitest, Playwright. Aufbau, Datenmodell und Regeln: [PLAN.md](PLAN.md) und [CLAUDE.md](CLAUDE.md).

### Quellen für Fakten in der App

- Promotionsregeln: [Promotionsreglement für die Gymnasien des Kantons Zürich (LS 413.251.1)](http://www.zhlex.zh.ch/Erlass.html?Ordnr=413.251.1). In der App als «bitte mit dem Reglement deiner Schule prüfen» markiert, weil die Seite bei der Recherche nicht erreichbar war.
- Cambridge B2 First, Dauer der Prüfungsteile: [cambridgeenglish.org](https://www.cambridgeenglish.org/exams-and-tests/qualifications/first/format/)
- Anmeldefristen und Infotage: [ETH Zürich](https://ethz.ch/en/studies/bachelor/application/swiss-matriculation-certificate.html), [ETH-Infotage](https://ethz.ch/en/studies/bachelor/prospective-students/orientation-events/information-days-at-eth-zurich.html), [UZH](https://www.uzh.ch/de/studies/application/deadlines.html), [UZH-Infotage](https://www.mnf.uzh.ch/de/studium/veranstaltungen/studieninformationstage-der-uzh.html), [HSG](https://www.unisg.ch/en/studying/admission/application-deadlines/), [Stanford MS&E](https://msande.stanford.edu/academics-admissions/graduate/admission/ms-admission) (Stand November 2026)
