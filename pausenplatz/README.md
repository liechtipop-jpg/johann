# Pausenplatz

Eine Spiele-Website für Pausen und Unterricht: Freunde mit einem Raumcode einladen und zusammen spielen, im Team antreten oder allein gegen die KI üben. Alles läuft auf einem kleinen eigenen Server, ohne Konto, ohne Werbung und ohne Tracking.

## Was drin ist

| Spiel | Modi | KI |
|---|---|---|
| **Schach** (auch als Staffel im Team, mit Bedenkzeit) | 1v1, 2v2, 3v3, gegen KI, lokal | leicht / mittel / schwer |
| **Poker** (Texas Hold'em, nur Spielgeld) | 1v1, 2v2, 3v3, Gruppe, gegen KI | drei Spielstile |
| **Mühle** | 1v1, 2v2, 3v3, gegen KI, lokal | leicht / mittel / schwer |
| **Schiffe versenken** (auch Salve, Teams auf grösseren Feldern) | 1v1, 2v2, 3v3, gegen KI | leicht / mittel / schwer |
| **Wahrheit oder Tat – Unterrichts-Edition** (4 Kategorien mit je 40 Wahrheiten und 40 Aufgaben, eigene Karten möglich) | 1v1, 2v2, 3v3, Gruppe | – |
| **Vier gewinnt** | 1v1, 2v2 als Staffel, gegen KI, lokal | leicht / mittel / schwer |
| **Ultimate Tic-Tac-Toe** (neun kleine Felder in einem grossen) | 1v1, gegen KI, lokal | leicht / mittel / schwer |
| **Stadt, Land, Fluss** (Kategorien wählbar, «Stopp!», Abstimmung über fragwürdige Antworten) | Gruppe, 2v2, 3v3 | – |
| **Zeichnen & Raten** (Striche live auf allen Geräten, 362 Begriffe in drei Stufen, Buchstabentipps) | Gruppe, 2v2, 3v3 | – |
| **Wort-Raten** (wie Galgenmännchen, aber mit einem Ballon; Wort von der App oder von Mitspielenden) | Gruppe, 2v2, 3v3, gegen KI | leicht / mittel / schwer |
| **Schere, Stein, Papier** (Best of 3 oder 5, in der Gruppe als Turnier mit Turnierbaum) | 1v1, Gruppe, gegen KI | leicht / mittel / schwer |
| **Tic-Tac-Toe** | 1v1, gegen KI, lokal | leicht / mittel / schwer |

Dazu kommen:

- **Räume:** Code wie `K7M-2QX`, Link `/r/K7M2QX` und QR-Code. Es gibt Teams Rot und Blau, Bereit-Häkchen, Zuschauer und Host-Werkzeuge (Plätze tauschen, mischen, mit Bots auffüllen, entfernen, Raum abschliessen, Chat ausschalten). Wer entfernt wurde, kommt weder mit demselben Browser noch unter demselben Namen zurück.
- **Verbindungsabbruch:** Wer die Verbindung verliert, kann 3 Minuten lang zurückkehren. Fehlende Spieler ersetzt ein Bot.
- **Nach der Partie:** Revanche mit getauschten Seiten, ein anderes Spiel wählen und Serienstand.
- **Chat:** im Raum oder nur im Team, mit Reaktionen. Ein Filter für Schimpfwörter auf Deutsch, Schweizerdeutsch und Englisch ist eingebaut. Man kann einzelne Personen stummschalten.
- **Oberfläche:** dunkles und helles Design, für Handy bis Grossbildschirm, mit Tastatur bedienbar.
- **Installierbar als App (PWA):** Spiele gegen die KI und lokale Spiele laufen auch offline. Die Statistik bleibt nur im eigenen Browser.

## Lokal starten

Voraussetzung: [Node.js](https://nodejs.org) ab Version 22.

```bash
cd pausenplatz
npm install
npm start
```

Dann im Browser **http://localhost:3000** öffnen.

## Mit anderen im gleichen WLAN spielen

1. Starte den Server wie oben auf einem Computer.
2. Finde die IP-Adresse dieses Computers heraus:
   - Windows: `ipconfig` → «IPv4-Adresse»
   - macOS: `ipconfig getifaddr en0`
   - Linux: `hostname -I`
3. Die anderen öffnen `http://DIESE-IP:3000`, zum Beispiel `http://192.168.1.23:3000`.
4. Erstelle einen Raum und teile den Code oder zeige den QR-Code.

Wenn es nicht klappt:

- Fragt die Firewall nach, ob Node.js im **privaten** Netzwerk erreichbar sein darf, erlaube es.
- Manche Schul- und Gäste-WLANs blockieren Verbindungen zwischen Geräten. Dann hilft nur Hosting (siehe unten).
- Über eine IP-Adresse ohne HTTPS lässt sich die Seite nicht als App installieren. Spielen geht trotzdem.

## Ins Internet stellen (Hosting)

Der Server ist eine normale Node.js-App mit WebSockets. Er funktioniert bei jedem Anbieter, der Node.js-Dienste mit WebSockets erlaubt, zum Beispiel Render, Railway, Fly.io oder einem eigenen Server. Prüfe die aktuellen Preise und Bedingungen beim Anbieter, denn sie ändern sich oft. Gratis-Angebote schlafen manchmal nach einiger Zeit ein, und dabei gehen offene Räume verloren.

**Beispiel Render:**

1. Lade das Repository auf GitHub hoch.
2. Lege in Render einen neuen **Web Service** an und wähle das Repository.
3. Trage die Einstellungen ein:
   - Root Directory: `pausenplatz`
   - Build Command: `npm ci --omit=dev`
   - Start Command: `npm start`
4. Unter «Environment» kannst du optional `SITE_NAME` setzen.
5. Render vergibt eine HTTPS-Adresse. Über HTTPS lässt sich die Seite auch als App installieren.

Liegt Pausenplatz in einem **eigenen** Repository (zum Beispiel aus der ZIP-Datei), geht es noch einfacher: Die Datei `render.yaml` im Ordner ist ein Render-Blueprint. In Render «New → Blueprint» wählen, dann sind alle Einstellungen schon eingetragen.

**Mit Docker:**

```bash
cd pausenplatz
docker build -t pausenplatz .
docker run -d -p 3000:3000 --name pausenplatz pausenplatz
```

Oder mit Docker Compose (startet nach einem Neustart des Rechners automatisch wieder):

```bash
cd pausenplatz
docker compose up -d
```

Für HTTPS stellst du einen Reverse-Proxy wie Caddy oder nginx davor. Der Proxy muss WebSockets durchlassen.

Wichtig: Die Räume liegen im Arbeitsspeicher. Starte deshalb **nur eine Instanz**. Nach einem Neustart sind laufende Räume weg, das Profil und die Statistik im Browser bleiben aber erhalten.

## Einstellungen

Den Namen der Seite änderst du an einer einzigen Stelle: in `server/config.js` oder über die Umgebungsvariable `SITE_NAME`.

| Variable | Standard | Bedeutung |
|---|---|---|
| `SITE_NAME` | `Pausenplatz` | Name der Seite (Titel, Logo-Text, App-Name) |
| `PORT` | `3000` | Port des Servers |
| `MAX_ROOMS` | `500` | höchstens so viele Räume gleichzeitig |
| `MAX_SPECTATORS` | `20` | Zuschauer pro Raum |
| `RECONNECT_GRACE_MS` | `180000` | so lange (3 Minuten) wird ein Platz nach einem Verbindungsabbruch freigehalten |
| `ROOM_IDLE_MS` | `1800000` | Räume ohne Aktivität werden nach 30 Minuten gelöscht |
| `BOT_DELAY_MS` | `700` | Mindest-Bedenkzeit der Bots, damit man ihre Züge sieht |
| `DISCONNECTED_TURN_MS` | `30000` | so lange wird auf einen getrennten Spieler gewartet, bevor ein Ersatzzug kommt |
| `RATE_LIMIT_FACTOR` | `1` | nur für Tests: lockert die Rate-Limits |

Die Grenzen für Chat, Namen und Nachrichten stehen ebenfalls in `server/config.js`.

## Ein neues Spiel hinzufügen

Jedes Spiel besteht aus einem Regelmodul. Dasselbe Modul läuft auf dem Server (online) und im Browser (gegen die KI und lokal).

1. **Regeln** in `shared/games/meinspiel.js`. Das Modul exportiert ein Objekt mit:
   - `id`, `name`, `category`, `modes` (z. B. `['1v1','2v2','group']`), `players: {min, max}`, `accent` (Farbe), `duration`, `optionDefs`
   - `setup(players, options, rng)` → Startzustand. `rng.int(n)` ist ein sicherer Zufall.
   - `getView(state, playerId)` → was diese Person sehen darf. Geheimes nie für andere Personen mitschicken.
   - `getLegalActions(state, playerId)` → erlaubte Aktionen
   - `applyAction(state, playerId, action, {now})` → `{state, events}` oder `{error}`
   - `getResult(state)` → `{over, winners, reason}`
   - optional `toMove(state)`, `nextTick(state)` und `tick(state, now)` für Zeitlimits
   - `testOptions` für schnelle Tests
   - optional `{ state, events, light: true }` als Rückgabe von `applyAction`: Dann gehen nur die Ereignisse an alle, ohne neue Ansichten. Das eignet sich für sehr häufige kleine Updates wie die Zeichenstriche. Die Darstellung empfängt sie mit `onLight(events)`.
2. **Anmelden** in `shared/games/index.js`, also importieren und in `GAMES` eintragen.
3. **Darstellung** in `public/js/games/meinspiel.js`. Sie exportiert `create(root, api)` und gibt `{update, destroy}` zurück. Melde sie in `public/js/games/index.js` an. Zeige Texte von Nutzern immer mit `textContent` an, nie mit `innerHTML`.
4. **Texte** in `public/js/i18n/de.js` unter `games.meinspiel`, mit Name, Kurztext, Regeln und Optionen. Füge sie vor der Markierung `// GAMES_END` ein.
5. **Symbol** in `public/js/ui/icons.js` als eigenes SVG.
6. **KI (optional)** in `shared/ai/meinspiel.js` mit `choose(view, legal, {level, rng, timeLimitMs})`. Melde sie in `shared/ai/index.js` an.
7. **Tests:** Lege Regeltests in `tests/unit/` an. Der Integrationstest spielt jedes Spiel aus `GAMES` automatisch mit Zufallszügen.

## Tests

```bash
npm test                  # alles: Regeln, Räume, je 50 Zufallspartien pro Spiel
npm run test:unit         # nur Regel- und Raumtests (schnell)
npm run test:integration  # nur die Mehrspieler-Tests über echte Sockets
GAMES_PER_GAME=5 GAME_FILTER=schach npm run test:integration   # schneller, nur ein Spiel
```

Auf GitHub laufen bei jeder Änderung im Ordner `pausenplatz/` automatisch alle Tests. Ausserdem wird dort das Docker-Image gebaut und gestartet (`.github/workflows/pausenplatz.yml`).

## Datenschutz und Sicherheit

- Es gibt keine Konten, kein Tracking, keine externen Schriften und kein CDN. Der Chat wird nicht gespeichert.
- Strenge Security-Header (helmet, Content-Security-Policy ohne fremde Quellen) und Rate-Limits schützen den Server.
- Karten werden mit `crypto.randomInt` gemischt. Geheime Infos wie Pokerkarten und Schiffspositionen schickt der Server nur an die Person, der sie gehören.
- Es gibt nur Spielgeld: kein Echtgeld, keine Käufe, keine Auszahlungen.

Verwendete Bibliotheken und ihre Lizenzen stehen in `THIRD_PARTY_LICENSES.md`. Entscheidungen und Abweichungen vom Auftrag stehen in `docs/ENTSCHEIDUNGEN.md`.
