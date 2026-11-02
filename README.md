# ♠ Kartenhaus Poker

Texas Hold'em (No-Limit) mit Freunden, direkt im Browser.
Kein Konto nötig, kein echtes Geld – nur Spielchips.

> **Stand: Schritt 1 von 3 – Lobby & Beitritt per Code.**
> Spiellogik (Schritt 2) und Tisch-Design (Schritt 3) folgen.

---

## Was schon funktioniert

- Benutzername wählen (kein Konto)
- Tisch erstellen → du bekommst einen **6-stelligen Code** (z. B. `K7QMZP`)
- Freunde treten mit dem Code bei – oder direkt über einen **Link** (`…/?code=K7QMZP`)
- Der **Host** sieht alle Spieler (grüner Punkt = verbunden), kann Spieler entfernen
  und legt die Einstellungen fest:
  - Startguthaben, Buy-in (geht in den Gewinnertopf), Small/Big Blind, Zeitlimit pro Zug
- 2 bis 9 Spieler pro Tisch
- Seite neu laden oder kurz offline → du landest automatisch wieder an deinem Platz
- Verlässt der Host den Tisch, wird automatisch ein anderer Spieler Host

---

## 1. Lokal auf deinem Computer testen

### Einmalig: Node.js installieren

1. Gehe auf <https://nodejs.org> und lade die **LTS-Version** herunter.
2. Installieren (einfach immer „Weiter“ klicken).
3. Prüfen: Öffne ein Terminal (Windows: „Eingabeaufforderung“ oder „PowerShell“,
   Mac: „Terminal“) und tippe:

   ```bash
   node -v
   ```

   Es sollte eine Versionsnummer wie `v22.…` erscheinen.

### Projekt herunterladen und starten

1. Projekt herunterladen: Auf GitHub auf **Code → Download ZIP** klicken und entpacken
   (oder mit `git clone` holen).
2. Im Terminal in den Projektordner wechseln, z. B.:

   ```bash
   cd Downloads/johann
   ```

3. Abhängigkeiten installieren (nur beim ersten Mal):

   ```bash
   npm install
   ```

4. Server starten:

   ```bash
   npm start
   ```

   Es erscheint: `Kartenhaus läuft auf http://localhost:3000`

5. Öffne <http://localhost:3000> im Browser.

### Mit mehreren Spielern auf einem Computer testen

- Öffne die Seite in **mehreren Tabs** – jeder Tab ist ein eigener Spieler.
- Oder nimm zusätzlich ein **privates/Inkognito-Fenster** oder einen anderen Browser.

### Mit dem Handy im selben WLAN testen

1. Finde die IP-Adresse deines Computers heraus
   (Windows: `ipconfig` → „IPv4-Adresse“, Mac: Systemeinstellungen → WLAN → Details).
2. Öffne auf dem Handy `http://DEINE-IP:3000`, z. B. `http://192.168.1.23:3000`.

### Automatische Tests ausführen

```bash
npm test
```

Am Ende sollte `# fail 0` stehen.

Zum Beenden des Servers im Terminal **Strg + C** drücken.

---

## 2. Kostenlos online stellen (Render)

Damit deine Freunde von überall mitspielen können, stellst du die Seite ins Internet.
[Render](https://render.com) hat einen kostenlosen Plan, der WebSockets unterstützt.

### Schritt für Schritt

1. **GitHub-Konto**: Der Code muss in einem GitHub-Repository liegen (ist er bereits).
2. Gehe auf <https://render.com> und melde dich mit **„Sign in with GitHub“** an.
3. Klicke auf **New + → Blueprint**.
4. Wähle dein Repository (`johann`) aus. Render findet die Datei `render.yaml`
   automatisch und zeigt den Dienst **kartenhaus-poker** an.
5. Klicke auf **Apply** / **Deploy Blueprint**.
6. Warte ein paar Minuten, bis „Live“ erscheint. Oben steht dein Link,
   z. B. `https://kartenhaus-poker.onrender.com`.
7. Diesen Link schickst du deinen Freunden – fertig!

<details>
<summary>Alternative ohne Blueprint (manuell)</summary>

1. **New + → Web Service** → dein Repository auswählen.
2. Einstellungen:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
3. **Create Web Service** klicken.

</details>

### Gut zu wissen beim Gratis-Plan

- Nach ca. 15 Minuten ohne Besucher **schläft** der Server ein.
  Der nächste Aufruf dauert dann bis zu einer Minute – einfach kurz warten.
- Laufende Spiele liegen nur im Arbeitsspeicher. Wenn der Server neu startet
  (Einschlafen, neues Update), sind offene Tische weg. Für einen Spieleabend
  ist das kein Problem, solange jemand am Tisch ist.
- Jedes Mal, wenn du neuen Code auf GitHub hochlädst, aktualisiert Render die Seite automatisch.

---

## Ordnerstruktur

```
johann/
├── server/              ← läuft auf dem Server (Node.js)
│   ├── index.js         ← Startpunkt: Webserver + Socket.IO
│   ├── lobby.js         ← Tische, Codes, Spieler, Einstellungen, Wiederverbinden
│   └── sockets.js       ← Echtzeit-Nachrichten zwischen Browser und Server
├── public/              ← wird an den Browser geschickt
│   ├── index.html       ← die Seite
│   ├── css/style.css    ← das Aussehen
│   ├── js/app.js        ← Bedienung im Browser
│   └── img/icon.svg     ← Symbol im Browser-Tab
├── test/                ← automatische Tests (npm test)
├── render.yaml          ← Einstellungen für Render
└── package.json         ← Projektbeschreibung und Befehle
```

---

## Wie funktioniert das technisch? (kurz)

- **Server** (Node.js + Express) liefert die Webseite aus.
- **Socket.IO** hält eine Live-Verbindung (WebSocket) zu jedem Browser.
- **Alles Wichtige passiert auf dem Server**: Der Browser schickt nur Wünsche
  („ich trete bei“, „ich erhöhe“), der Server prüft sie und schickt jedem Spieler
  **nur das, was er sehen darf**.
- Beim Beitreten bekommt dein Browser ein geheimes **Token**. Damit erkennt dich der
  Server wieder, wenn du neu lädst oder die Verbindung kurz weg war.

---

## Hinweis

Nur Spielgeld. Dieses Projekt dient der Unterhaltung unter Freunden;
es gibt keine Möglichkeit, echtes Geld einzuzahlen oder auszuzahlen.
