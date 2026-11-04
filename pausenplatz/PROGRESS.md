# PROGRESS – Pausenplatz

Budget-Vorgabe: max. 39 Dollar → sparsam arbeiten, Pflichtspiele zuerst (siehe docs/ENTSCHEIDUNGEN.md).

## Phase 1 – Plan und Gerüst
- [x] package.json, Abhängigkeiten (express, socket.io, helmet, chess.js, uqr; dev: socket.io-client)
- [x] Server: Express, Socket.IO, helmet/CSP, Konfiguration, statische Dateien, /r/:code, QR
- [x] Design-System (CSS-Variablen, Grundkomponenten), Startseite, Profil, i18n

## Phase 2 – Raumsystem
- [x] Codes, Beitreten, Teams, Host-Werkzeuge, Bereit, Zuschauer, Chat, Reconnect, Aufräumen, Rate-Limits
- [x] Tests Räume

## Phase 3 – Referenzspiel Tic-Tac-Toe (Modul, Tests, Darstellung, Multiplayer, KI, lokal)
- [x] erledigt

## Phase 4 – Pflichtspiele
- [x] Mühle  - [x] Schiffe versenken  - [x] Schach  - [x] Poker  - [x] Wahrheit oder Tat
- [x] Ich sehe was – entfällt auf Wunsch des Auftraggebers (docs/ENTSCHEIDUNGEN.md, Punkt 1)

## Phase 5 – Zusatzspiele (nachgeliefert)
- [x] Vier gewinnt  - [x] Ultimate Tic-Tac-Toe  - [x] Stadt, Land, Fluss  - [x] Zeichnen & Raten  - [x] Wort-Raten  - [x] Schere, Stein, Papier

## Phase 8 – Nachträge
- [x] Raum abschliessen, Namenssperre nach dem Entfernen
- [x] Wortfilter erkennt Tarnungen (Ziffern, Abstände, gestreckte Buchstaben), ohne falsche Treffer
- [x] Zeitlimits verschieben sich nicht mehr durch viele Aktionen
- [x] Live-Striche als leichte Ereignisse, Hinweis vor einem Server-Neustart
- [x] Handy: Seitenname im Kopf ganz sichtbar
- [x] GitHub-Workflow (Tests und Docker-Image), docker-compose.yml, render.yaml
- [x] Gesamttest (109/109), Browser-Test aller 12 Spiele (375 px und 1280 px, ohne Konsolenfehler), ZIP, Commit, Push

## Phase 6 – Feinschliff (PWA/Offline, Barrierefreiheit, Töne)
- [x] erledigt

## Phase 7 – Abnahme
- [x] Gesamttest (npm test: 63/63 grün, je 50 Zufallspartien pro Spiel)
- [x] Browser-Test 375 px und 1280 px: alle Spiele gegen KI und online mit zwei Browsern, keine Konsolenfehler, kein Überlauf (Poker-Tisch für Handy angepasst)
- [x] README, ENTSCHEIDUNGEN, THIRD_PARTY_LICENSES, Dockerfile
- [x] ZIP, Commit, Push, Abschlussbericht
