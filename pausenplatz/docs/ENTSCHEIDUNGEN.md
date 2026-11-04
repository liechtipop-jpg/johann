# Entscheidungen und Abweichungen

Der Auftrag liess einige Punkte offen. Hier steht, wie sie gelöst wurden und wo bewusst vom Auftrag abgewichen wurde.

## Umfang

1. **«Ich sehe was, was du nicht siehst» entfällt.** Der Auftraggeber hat während der Arbeit geschrieben: «mache ohne ich sehe was du nicht siehst». Das schon begonnene Modul, die Szenen und die Tests wurden darum wieder entfernt. Es ist nichts davon übrig, auch keine toten Knöpfe.
2. **Alle sechs Zusatzspiele aus Abschnitt 7 sind gebaut.** Das sind Vier gewinnt, Ultimate Tic-Tac-Toe, Stadt, Land, Fluss, Zeichnen & Raten, Wort-Raten sowie Schere, Stein, Papier. Sie stehen in den Punkten 20 bis 25.
3. **Tic-Tac-Toe** war das Referenzspiel aus Phase 3. Damit wurden das Raumsystem, die KI und der lokale Modus entwickelt.

## Technik

4. **chess.js (BSD-2-Clause) für die Schachregeln.** Der Auftrag erlaubt es ausdrücklich. Web Worker unterstützen keine Import-Maps. Deshalb importiert der KI-Worker `/vendor/chess.js` direkt und gibt die Klasse `Chess` an die Schach-KI weiter. Auf dem Server macht `worker_threads` das Gleiche.
5. **ISC-Lizenzen.** Zwei indirekte Abhängigkeiten von Express sind ISC-lizenziert: `inherits` und `setprototypeof`.
   - Die ISC-Lizenz ist eine vereinfachte BSD-Lizenz und inhaltlich gleichwertig mit MIT und BSD-2-Clause.
   - Auch Express 5 braucht diese Pakete. Ohne Express ginge es nicht, und Express ist im Auftrag vorgegeben. Sie wurden darum akzeptiert.
6. **QR-Codes erzeugt der Server** als SVG mit `uqr` (MIT). So fliesst kein Raumcode an einen fremden Dienst.
7. **Räume nur im Arbeitsspeicher.** Das verlangt der Auftrag. Darum läuft nur eine Server-Instanz, und ein Neustart beendet laufende Räume.
   - Bei einem geplanten Neustart (Docker, Hosting, Strg+C) bekommen alle vorher einen Hinweis.
   - Profil und Statistik liegen im Browser und bleiben erhalten.
8. **Service Worker:** Die Liste der Dateien für den Offline-Betrieb und die Versionsnummer erzeugt der Server beim Start. Offline gehen nur Spiele gegen die KI und lokale Spiele, Online-Räume brauchen den Server.
9. **Die Inline-Import-Map** (`chess.js` → `/vendor/chess.js`) ist in der CSP per SHA-256-Hash erlaubt. Sonst gibt es kein Inline-Skript und keine fremde Quelle.
10. **Leichte Live-Updates.** Beim Zeichnen gehen die Striche alle 80 Millisekunden als kleine Punktlisten über ein eigenes Ereignis (`game:light`) an alle. Es wird also nicht jedes Mal die ganze Ansicht neu verschickt. Wer neu dazukommt oder die Verbindung verliert, bekommt die ganze Zeichnung mit der nächsten normalen Ansicht.
11. **Zeitlimits bleiben fest.** Ein Zeitlimit wird nur neu gestellt, wenn sich der Zeitpunkt wirklich ändert. Vorher hat jede Aktion den Timer neu gestartet. Bei sehr vielen schnellen Aktionen hätte sich das Rundenende so immer weiter verschoben.

## Räume und Sicherheit

12. **Entfernen sperrt Gerät und Namen.** Entfernt der Host jemanden, sind für diesen Raum das Sitzungs-Token und der Spitzname gesperrt. Zusätzlich kann der Host den Raum **abschliessen**: Dann kommt niemand Neues mehr hinein, nur wer schon drin war, kann wiederkommen. Ohne Konten lässt sich nicht ganz verhindern, dass jemand mit neuem Gerät und neuem Namen kommt. Gegen solche Personen hilft das Abschliessen.
13. **Keine IP-Sperre.** In Schulen teilen sich oft alle Geräte eine öffentliche IP-Adresse. Eine IP-Sperre würde die ganze Klasse aussperren.
14. **Fehlende Spieler:** Ist jemand getrennt, wartet der Server bis zu 30 Sekunden auf dessen Zug und spielt dann einen Ersatzzug, zum Beispiel Check/Fold bei Poker oder einen zufälligen Schuss. Nach 3 Minuten ohne Rückkehr übernimmt ein Bot den Platz fest. Verlässt der Host den Raum, wird die nächste Person Host.
15. **Rate-Limits** gelten für Aktionen, Chat (1 Nachricht pro Sekunde) und falsche Raumcodes (10 pro Minute). Für die automatischen Tests lassen sich die Aktions-Limits mit `RATE_LIMIT_FACTOR` lockern.
16. **Versteckte Test-Optionen** (`hidden` in `optionDefs`) erscheinen nicht in der Oberfläche. Sie verkürzen nur die Wartezeiten in Tests, zum Beispiel die Pause zwischen Pokerhänden und die Rundenzeiten der Partyspiele.
17. **Schimpfwortfilter:** Eine Wortliste für Deutsch, Schweizerdeutsch und Englisch prüft Namen, Chat, Antworten, Wörter und eigene Karten.
    - Er erkennt auch Tarnungen: Ziffern («sch31sse»), Abstände, Punkte oder Striche zwischen den Buchstaben («s.c.h.e.i.s.s.e») und gestreckte Buchstaben («scheeeisse»).
    - Ein Test stellt sicher, dass alle 362 Spielbegriffe und alle 320 Karten durchkommen.
    - Ganz neue Schimpfwörter kennt er trotzdem nicht. Darum kann der Host den Chat ausschalten, und alle können einzelne Personen stummschalten.

## Spielregeln der Pflichtspiele

18. **Mühle:** Remis gibt es bei dreifacher Stellungswiederholung und nach 50 Zügen pro Seite (100 Halbzügen) ohne geschlossene Mühle. Springen mit drei Steinen ist Standard und lässt sich abschalten. Eine Doppelmühle bringt nur einen Stein.
19. **Weitere Pflichtspiele:**
    - **Schiffe versenken:** Die Feldgrösse wächst mit der Teamgrösse: 1v1 10×10 mit 5 Schiffen, 2v2 12×12 mit 7, 3v3 14×14 mit 9. Zum Platzieren gibt es 90 Sekunden, danach legt die App den Rest zufällig. Bei der Salve wird jeder Schuss sofort aufgelöst.
    - **Schach im Team (Staffel):** Die Mitglieder ziehen reihum, die Uhr läuft pro Team auf dem Server. Über Remis-Angebote und Aufgeben entscheidet die Mehrheit des Teams.
    - **Poker im Team:** Die Teams sitzen abwechselnd am Tisch. Es gewinnt das Team, das als einziges noch Chips hat. Sonst gewinnt nach der eingestellten Zahl Hände die höhere Chipsumme (Rebuys abgezogen). Es gibt nur Spielgeld.
    - **Wahrheit oder Tat:** Wahrheiten geben 1 Punkt, Aufgaben 2. Bei Stimmengleichheit gilt die Aufgabe als bestanden. Ein Joker (2 pro Person) zieht eine neue Karte derselben Art. Antworten laufen durch den Filter, eigene Karten mit gesperrten Wörtern werden abgelehnt. Alle Inhalte sind für ab 12 Jahren und betreffen weder Lehrpersonen noch Aussenstehende.

## Spielregeln der Zusatzspiele

20. **Vier gewinnt:** 7×6 Felder. Modi sind 1v1, 2v2 als Staffel, gegen KI und an einem Gerät. Ist das Feld voll, ist es unentschieden. Die KI sucht mit Alpha-Beta und Bedenkzeit: leicht sieht 2 Züge weit und spielt öfter zufällig, schwer rechnet bis zu 14 Züge voraus.
21. **Ultimate Tic-Tac-Toe:**
    - Wo man setzt, bestimmt das kleine Feld des Gegners. Ist es entschieden, gibt es freie Wahl.
    - Ist kein kleines Feld mehr offen und hat niemand drei in einer Reihe, endet es unentschieden. Es gibt keine Auszählung nach Feldern, so wie bei den gängigen Regeln.
    - Die KI nutzt eine Monte-Carlo-Baumsuche.
22. **Stadt, Land, Fluss:**
    - **Buchstaben:** Gespielt wird ohne C, J, Q, X und Y, weil es dazu kaum Antworten gibt. Kein Buchstabe kommt in einer Partie zweimal.
    - **Stopp!:** Nach «Stopp!» bleiben 3 Sekunden, damit gerade getippte Antworten noch ankommen.
    - **Abstimmen:** Eine Antwort ist ungültig, wenn mehr als die Hälfte der Abstimmenden zweifelt. Abstimmen dürfen alle ausser den Verfassern.
    - **Prüfung:** Leere Antworten und falsche Anfangsbuchstaben prüft die App selbst, Umlaute zählen dabei wie ihr Grundbuchstabe («Österreich» bei O). Doppelte Antworten erkennt sie tolerant: Gross/klein, Artikel und Mehrzahl sind egal.
    - **Teams:** Jedes Team füllt ein gemeinsames Blatt aus.
    - **KI:** Es gibt keine, weil eine sinnvolle KI eine riesige Wortdatenbank bräuchte.
23. **Zeichnen & Raten:**
    - **Begriffe:** 362 Begriffe in drei Stufen. Bei «Gemischt» bekommt die zeichnende Person je einen Begriff pro Stufe zur Wahl.
    - **Tipps:** Bei 40, 60 und 80 Prozent der Zeit erscheint je ein Buchstabe, höchstens ein Drittel des Wortes.
    - **Teams:** In Teams rät nur das eigene Team.
    - **Grenzen:** Eine Zeichnung hat höchstens 9000 Punkte und 600 Striche.
    - **Kein Modus an einem Gerät:** Die Ratenden dürfen die Zeichenfläche des Zeichners nicht sehen, bevor gezeichnet wird. An einem Gerät geht das nicht.
24. **Wort-Raten:**
    - **Ablauf:** Reihum rät jede Person einen Buchstaben. Nach 20 Sekunden ist automatisch die nächste dran.
    - **Punkte:** Ein Treffer gibt 1 Punkt pro Vorkommen, der letzte Buchstabe 3 Bonuspunkte, richtiges Lösen 5. Platzt der Ballon, bekommt die vorgebende Person 5 Punkte.
    - **Teams:** Ein Wort von einer Person aus dem Team rät das andere Team, damit niemand im eigenen Team Hinweise flüstert.
    - **Wörter:** Eigene Wörter haben 3 bis 24 Buchstaben, ohne Zahlen, und laufen durch den Filter. Gibt jemand kein Wort ein, wählt die App eines.
25. **Schere, Stein, Papier:**
    - **Turnier:** Für ein volles K.-o.-Turnier gibt es Freilose nur in der ersten Runde. Ein Unentschieden wird wiederholt.
    - **Zeit:** Pro Wurf gibt es 20 Sekunden, danach wählt die App zufällig. Das ist der faire Ersatzzug.
    - **Modi:** Teams sind nicht vorgesehen, denn der Auftrag nennt 1v1 und die Gruppe.

## Betrieb

26. **Docker:**
    - Das Image wird auf GitHub bei jeder Änderung automatisch gebaut, gestartet und geprüft (`.github/workflows/pausenplatz.yml`).
    - In der Entwicklungsumgebung hatte der Docker-Build keinen direkten Internetzugang. Dafür hätten Zugangsdaten in den Build kopiert werden müssen, und darauf wurde bewusst verzichtet.
27. **Render:**
    - Die `render.yaml` im Hauptordner des Repositorys gehört zum älteren Projekt «Kartenhaus Poker» und bleibt unverändert.
    - Pausenplatz hat eine eigene `render.yaml` in seinem Ordner. Sie gilt, wenn der Ordner ein eigenes Repository ist.
