# CLAUDE.md – Cockpit

Persönliche Schul- und Lern-App als PWA. Alle Daten lokal (IndexedDB), kein Server, keine Konten, kein Tracking.
Spezifikation: `SPEC.md` · Plan und Fortschritt: `PLAN.md`. Die App liegt in `cockpit/`; das Poker-Projekt im Repo-Hauptordner ist davon unabhängig.

## Stack
React + TypeScript (strict) + Vite, React Router, Tailwind CSS v4, Dexie + dexie-react-hooks (Live-Queries), Zod, ts-fsrs, dnd-kit, Recharts, vite-plugin-pwa, lucide-react, Fontsource (Inter Variable, Instrument Serif). Tests: Vitest (+ fake-indexeddb), Playwright.

## Befehle (im Ordner `cockpit/`)
- `npm run dev` – Entwicklungsserver (Dev-Modus aktiv)
- `npm run build` – Typecheck + Produktions-Build nach `dist/`
- `npm run preview` – Build lokal ansehen (mit Service Worker)
- `npm run lint` – ESLint
- `npm test` – Unit-Tests (Vitest)
- `npm run test:e2e` – Playwright-Tests
- `npm run screenshots` – Screenshots aller Seiten (390/1440 px, hell/dunkel)

## Regeln
- Oberfläche Deutsch mit Schweizer Rechtschreibung (ss, nie ß); Code und Bezeichner Englisch.
- Datum/Zahlen nur über `Intl` mit `de-CH`; Woche beginnt am Montag.
- Kalendertage als lokale `YYYY-MM-DD`-Strings, Zeitpunkte als Epoch-ms. Nie `toISOString()` für Kalendertage.
- Logik als reine Funktionen in `src/features/<feature>/logic/` mit Unit-Tests; Komponenten bleiben dünn.
- Dexie: bestehende Versionen nie ändern – neue `db.version(n)` + `upgrade()` + Test. Backup-Import migriert alte Exporte.
- Keine persönlichen Daten im Code. Persönliches nur als Vorschlagspakete (Onboarding/Leerzustände).
- Farben nur über Tokens und Fächerfarben. Icons nur `lucide-react`. Keine Emojis als Icons, keine lila Verläufe, keine Glas-Effekte.
- Status/Ampel nie nur über Farbe – immer mit Symbol oder Text. Touch-Ziele ≥ 44 px, sichtbarer Fokus, alles per Tastatur.
- Animationen 150–250 ms, `prefers-reduced-motion` respektieren.
- Löschen/Ersetzen sofort ausführen, mit Toast «Rückgängig» – keine Bestätigungsdialoge.
- Keine Netzwerkanfragen zur Laufzeit (keine CDNs, kein Tracking).
- Fakten (Promotionsregeln, Prüfungszeiten, Fristen) nur mit Link zur offiziellen Quelle; Unbestätigtes leer lassen oder als «bitte prüfen» markieren.
- Nach jeder Phase: `npm run build`, `npm run lint`, `npm test` grün → Commit → `PLAN.md` abhaken.
