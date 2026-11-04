# Lizenzen von Drittanbieter-Software

Pausenplatz verwendet zur Laufzeit nur diese Pakete und ihre Abhängigkeiten. Es gibt keine CDNs und keine externen Schriften. Alle Grafiken und Symbole sind selbst gezeichnet.

## Direkte Abhängigkeiten

| Paket | Version | Lizenz | Zweck |
|---|---|---|---|
| express | 4.x | MIT | Webserver |
| socket.io | 4.x | MIT | Echtzeit-Verbindung |
| helmet | 8.x | MIT | Security-Header und CSP |
| chess.js | 1.4.0 | BSD-2-Clause | Schachregeln (Zuggenerator, Remis-Erkennung) |
| uqr | 0.1.3 | MIT | QR-Codes als SVG, auf dem Server erzeugt |

Nur für Tests wird **socket.io-client** 4.x (MIT) verwendet. Es wird nicht ausgeliefert.

## Indirekte Abhängigkeiten

Stand: `npm ls --omit=dev --all`, 92 Pakete.

- 88 Pakete: MIT
- 1 Paket: BSD-3-Clause (`qs`)
- 1 Paket: BSD-2-Clause (`chess.js`)
- 2 Pakete: ISC (`inherits`, `setprototypeof`). Beide sind Pflicht-Abhängigkeiten von Express. Die ISC-Lizenz ist inhaltlich gleichwertig mit MIT und BSD-2-Clause, siehe `docs/ENTSCHEIDUNGEN.md`.

Die vollständigen Lizenztexte liegen jeweils im Paketordner unter `node_modules/<paket>/LICENSE`.
