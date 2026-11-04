# Entscheidungen und Abweichungen

Der Auftrag liess einige Punkte offen. Hier steht, wie sie gelöst wurden und wo bewusst vom Auftrag abgewichen wurde.

## Umfang

1. **«Ich sehe was, was du nicht siehst» entfällt.** Der Auftraggeber hat während der Arbeit geschrieben: «mache ohne ich sehe was du nicht siehst». Das schon begonnene Modul, die Szenen und die Tests wurden darum wieder entfernt. Es ist nichts davon übrig, auch keine toten Knöpfe.
2. **Zusatzspiele aus Abschnitt 7 sind nicht gebaut.** Das betrifft Vier gewinnt, Ultimate Tic-Tac-Toe, Stadt-Land-Fluss, Zeichnen & Raten, Wort-Raten und Schere-Stein-Papier.
   - Grund ist die Budgetvorgabe von höchstens 39 Dollar. Vorrang hatten die Pflichtspiele und die Abnahme-Checkliste.
   - Die Architektur ist darauf vorbereitet. Ein neues Spiel braucht nur ein Regelmodul, eine Darstellung, Texte und ein Symbol (siehe README, «Ein neues Spiel hinzufügen»). Der Integrationstest nimmt es automatisch auf.
3. **Tic-Tac-Toe bleibt drin.** Es war das Referenzspiel aus Phase 3, mit dem das Raumsystem, die KI und der lokale Modus entwickelt wurden. Es ist vollständig spielbar.

## Technik

4. **chess.js (BSD-2-Clause) für die Schachregeln.** Der Auftrag erlaubt es ausdrücklich. Web Worker unterstützen keine Import-Maps. Deshalb importiert der KI-Worker `/vendor/chess.js` direkt und gibt die Klasse `Chess` an die Schach-KI weiter. Auf dem Server macht `worker_threads` das Gleiche.
5. **ISC-Lizenzen.** Zwei indirekte Abhängigkeiten von Express sind ISC-lizenziert: `inherits` und `setprototypeof`.
   - Die ISC-Lizenz ist eine vereinfachte BSD-Lizenz und inhaltlich gleichwertig mit MIT und BSD-2-Clause.
   - Ohne sie ginge Express nicht, und Express ist im Auftrag vorgegeben. Sie wurden darum akzeptiert.
6. **QR-Codes erzeugt der Server** als SVG mit `uqr` (MIT). So fliesst kein Raumcode an einen fremden Dienst.
7. **Räume nur im Arbeitsspeicher.** Das verlangt der Auftrag. Darum läuft nur eine Server-Instanz, und ein Neustart beendet laufende Räume.
8. **Service Worker:** Die Liste der Dateien für den Offline-Betrieb und die Versionsnummer erzeugt der Server beim Start. Offline gehen nur Spiele gegen die KI und lokale Spiele, Online-Räume brauchen den Server.
9. **Die Inline-Import-Map** (`chess.js` → `/vendor/chess.js`) ist in der CSP per SHA-256-Hash erlaubt. Sonst gibt es kein Inline-Skript und keine fremde Quelle.

## Räume und Sicherheit

10. **Entfernen sperrt das Gerät.** Entfernt der Host jemanden, wird dessen Sitzungs-Token für diesen Raum gesperrt. Mit einem anderen Browser könnte die Person mit neuem Namen wiederkommen. Ganz verhindern lässt sich das ohne Konten nicht.
11. **Fehlende Spieler:** Ist jemand getrennt, wartet der Server bis zu 30 Sekunden auf dessen Zug und spielt dann einen Ersatzzug, zum Beispiel Check/Fold bei Poker oder einen zufälligen Schuss. Nach 3 Minuten ohne Rückkehr übernimmt ein Bot den Platz fest. Verlässt der Host den Raum, wird die nächste Person Host.
12. **Rate-Limits** gelten für Aktionen, Chat (1 Nachricht pro Sekunde) und falsche Raumcodes (10 pro Minute). Für die automatischen Tests lassen sich die Aktions-Limits mit `RATE_LIMIT_FACTOR` lockern.
13. **Versteckte Test-Optionen** (`hidden` in `optionDefs`) erscheinen nicht in der Oberfläche. Sie verkürzen nur die Wartezeiten in Tests: die Pause zwischen Pokerhänden und das Tempo bei Wahrheit oder Tat.
14. **Schimpfwortfilter:** Eine einfache Wortliste für Deutsch, Schweizerdeutsch und Englisch prüft Namen, Chat, Antworten und eigene Karten. Kreative Schreibweisen kommen trotzdem durch. Darum kann der Host den Chat ausschalten, und alle können einzelne Personen stummschalten.

## Spielregeln

15. **Mühle:** Remis gibt es bei dreifacher Stellungswiederholung und nach 50 Zügen pro Seite (100 Halbzügen) ohne geschlossene Mühle. Springen mit drei Steinen ist Standard und lässt sich abschalten. Eine Doppelmühle bringt nur einen Stein.
16. **Schiffe versenken:** Die Feldgrösse wächst mit der Teamgrösse:
    - 1v1: 10×10 mit 5 Schiffen
    - 2v2: 12×12 mit 7 Schiffen
    - 3v3: 14×14 mit 9 Schiffen

    Zum Platzieren gibt es 90 Sekunden, danach legt die App die restlichen Schiffe zufällig. Bei der Salve wird jeder Schuss sofort aufgelöst, nicht erst am Ende der ganzen Salve.
17. **Schach im Team (Staffel):** Die Mitglieder eines Teams ziehen reihum. Die Uhr läuft pro Team auf dem Server. Über Remis-Angebote und Aufgeben entscheidet die Mehrheit des Teams.
18. **Poker im Team:** Teammitglieder sitzen abwechselnd mit der Gegenseite am Tisch. Es gewinnt das Team, das als einziges noch Chips hat. Sonst gewinnt nach der eingestellten Zahl Hände die höhere Chipsumme (Rebuys abgezogen). Es gibt nur Spielgeld.
19. **Wahrheit oder Tat:**
    - Wahrheiten geben 1 Punkt, Aufgaben 2 Punkte.
    - Bei Stimmengleichheit gilt die Aufgabe als bestanden.
    - Ein Joker (2 pro Person) zieht eine neue Karte derselben Art.
    - Antworten laufen durch den Filter.
    - Eigene Karten des Hosts werden abgelehnt, wenn sie gesperrte Wörter enthalten.
    - Alle Inhalte sind für ab 12 Jahren und betreffen weder Lehrpersonen noch Aussenstehende.
