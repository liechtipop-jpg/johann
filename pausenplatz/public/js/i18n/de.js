// Alle Texte der Oberfläche (Deutsch, Schweizer Rechtschreibung). Platzhalter in {geschweiften} Klammern.
export const de = {
  app: { tagline: 'Spiele mit Freunden – ohne Anmeldung. Raum erstellen, Code teilen, losspielen.', offline: 'Keine Verbindung zum Server – Spiele gegen den Computer gehen trotzdem.', reconnecting: 'Verbindung wird wiederhergestellt …', back: 'Zurück', close: 'Schliessen', loading: 'Lädt …', error: 'Etwas ist schiefgelaufen. Lade die Seite neu.' },
  home: { create: 'Raum erstellen', createHint: 'Spiel wählen, Code teilen, Freunde spielen mit.', join: 'Code eingeben', joinHint: 'Hast du einen Code bekommen? Hier eintippen oder einfügen.', joinBtn: 'Beitreten', codeLabel: 'Raumcode, Zeichen {n} von 6', games: 'Spiele', noGames: 'Keine Spiele in dieser Auswahl.', players: '{min}–{max} Personen', playersFixed: '{n} Personen' },
  filters: { all: 'Alle', board: 'Brettspiele', cards: 'Kartenspiele', party: 'Partyspiele', ai: 'Gegen Computer' },
  modes: { '1v1': '1v1', '2v2': '2v2', '3v3': '3v3', group: 'Gruppe', ai: 'Computer', local: 'Lokal' },
  modeLong: { '1v1': '1 gegen 1', '2v2': '2 gegen 2', '3v3': '3 gegen 3', group: 'Gruppe', ai: 'Gegen den Computer', local: 'Zu zweit an einem Gerät' },
  play: { title: '{game} spielen', room: 'Raum erstellen', roomHint: 'Mit Freunden über einen Code', ai: 'Gegen den Computer', aiHint: 'Ohne Raum, auch offline', local: 'Lokal zu zweit', localHint: 'Ein Gerät, abwechselnd ziehen', mode: 'Modus', options: 'Optionen', level: 'Stärke', levels: { leicht: 'Leicht', mittel: 'Mittel', schwer: 'Schwer' }, start: 'Los geht’s', createRoom: 'Raum erstellen', youStart: 'Wer beginnt?', starts: { me: 'Ich', ai: 'Computer', random: 'Zufall' }, bots: 'Computer-Gegner' },
  profile: { title: 'Dein Profil', name: 'Spitzname', nameHint: '2 bis 16 Zeichen – kein Konto, keine E-Mail.', avatar: 'Avatar', color: 'Farbe', save: 'Speichern', saved: 'Profil gespeichert', stats: 'Statistik', played: 'Partien', won: 'Siege', noStats: 'Noch keine Partien gespielt.', settings: 'Einstellungen', theme: 'Helles Design', sound: 'Töne', vibrate: 'Vibration, wenn du dran bist', resetStats: 'Statistik löschen', resetDone: 'Statistik gelöscht', first: 'Wie sollen dich die anderen sehen?' },
  room: {
    code: 'Raumcode', copy: 'Code kopieren', copied: 'Kopiert', link: 'Einladungslink kopieren', share: 'Teilen', qr: 'QR-Code', qrAlt: 'QR-Code zum Beitreten in Raum {code}', leave: 'Raum verlassen',
    teamRed: 'Team Rot', teamBlue: 'Team Blau', players: 'Spieler', free: 'Freier Platz – antippen zum Wechseln', freeHost: 'Freier Platz', spectators: 'Zuschauer', you: 'du', host: 'Host', bot: 'Computer', ready: 'Bereit', notReady: 'Nicht bereit', readyBtn: 'Ich bin bereit', unready: 'Doch nicht bereit',
    start: 'Spiel starten', waitHost: 'Warte, bis der Host startet …', missingSeats: 'Es fehlen noch {n} Personen.', missingPlayers: 'Es braucht noch {n} weitere Person(en).', missingReady: '{name} ist noch nicht bereit.', allSet: 'Alle sind bereit.',
    hostTools: 'Host-Werkzeuge', shuffle: 'Teams mischen', fillBots: 'Mit Computer auffüllen', options: 'Optionen ändern', changeGame: 'Anderes Spiel', chatOn: 'Chat an', teamChatOn: 'Team-Chat an', kick: 'Entfernen', moveTo: 'Verschieben nach …', toSpectators: 'Zu den Zuschauern', spectating: 'Du schaust zu.', spectatorFull: 'Der Raum ist voll – du kannst zuschauen.',
    disconnected: 'getrennt', back: 'wieder da', gone: 'weg', kicked: 'Du wurdest aus dem Raum entfernt.', closed: 'Der Raum wurde geschlossen.', joined: 'Du bist im Raum {code}.', rejoined: 'Willkommen zurück!', customCards: 'Eigene Karten', addCard: 'Karte hinzufügen', cardAdded: 'Karte hinzugefügt', cards: '{n} eigene Karten',
  },
  chat: { title: 'Chat', team: 'Team', all: 'Alle', placeholder: 'Nachricht …', send: 'Senden', off: 'Der Host hat den Chat ausgeschaltet.', empty: 'Noch keine Nachrichten.', mute: 'Stummschalten', unmute: 'Stummschaltung aufheben', muted: '{name} ist stummgeschaltet.' },
  game: { yourTurn: 'Du bist dran!', theirTurn: '{name} ist dran', teamTurn: 'Team {team} ist dran', waiting: 'Warte auf die anderen …', rules: 'Regeln', leave: 'Spiel verlassen', players: 'Spieler', history: 'Verlauf', panel: 'Spieler, Chat und Verlauf', score: 'Stand', won: 'Gewonnen!', lost: 'Verloren', draw: 'Unentschieden', winner: '{name} gewinnt', teamWins: 'Team {team} gewinnt', rematch: 'Revanche', otherGame: 'Anderes Spiel', toLobby: 'Zur Lobby', again: 'Nochmal', waitHostNext: 'Der Host entscheidet, wie es weitergeht.', series: 'Serie', localTurn: '{name} ist dran – Gerät weitergeben', computer: 'Computer', thinking: 'Computer überlegt …', soundOn: 'Ton einschalten', soundOff: 'Ton ausschalten', reasonTitle: 'Grund' },
  teams: { red: 'Rot', blue: 'Blau' },
  errors: {
    room_not_found: 'Diesen Raum gibt es nicht (mehr). Prüf den Code.', room_full_spectators: 'Der Raum ist voll – auch die Zuschauerplätze.', kicked: 'Du wurdest aus diesem Raum entfernt und kannst nicht sofort zurück.',
    too_many_attempts: 'Zu viele falsche Codes. Warte eine Minute.', name_length: 'Der Spitzname braucht 2 bis 16 Zeichen.', name_bad: 'Dieser Spitzname ist nicht erlaubt.', not_your_turn: 'Du bist gerade nicht am Zug.',
    rate_limited: 'Etwas langsamer, bitte.', chat_slow: 'Höchstens eine Nachricht pro Sekunde.', chat_off: 'Der Chat ist ausgeschaltet.', not_host: 'Das darf nur der Host.', not_ready: 'Noch nicht alle sind bereit.', no_ai: 'Für dieses Spiel gibt es hier keinen Computergegner.',
    seat_taken: 'Dieser Platz ist schon besetzt.', server_full: 'Der Server ist gerade voll. Versuch es gleich nochmal.', offline: 'Keine Verbindung zum Server.', timeout: 'Der Server antwortet nicht. Prüf die Verbindung.', text_bad: 'Dieser Text ist nicht erlaubt.', too_short: 'Der Text ist zu kurz.', too_many: 'Es sind schon genug eigene Karten.',
    invalid: 'Dieser Zug ist nicht erlaubt.', occupied: 'Dieses Feld ist schon besetzt.', game_over: 'Das Spiel ist vorbei.', spectator: 'Zuschauer können nicht mitspielen.', default: 'Das hat nicht geklappt.',
  },
  reactions: { '👍': 'Daumen hoch', '😂': 'Lachen', '😮': 'Staunen', '🔥': 'Feuer', '👏': 'Applaus' },
  games: {
    tictactoe: {
      name: 'Tic-Tac-Toe', short: 'Drei in einer Reihe – der schnelle Klassiker.',
      rules: [
        ['Ziel', 'Bring drei deiner Zeichen in eine Reihe – waagrecht, senkrecht oder diagonal.'],
        ['Ablauf', 'Ihr setzt abwechselnd ein Zeichen in ein freies Feld. Kreuz beginnt.'],
        ['Ende', 'Sind alle neun Felder voll und niemand hat eine Reihe, ist es unentschieden.'],
        ['Beispiel', 'Liegen deine Zeichen oben links und in der Mitte, gewinnst du mit dem Feld unten rechts.'],
      ],
      reasons: { line: 'Drei in einer Reihe', draw: 'Alle Felder belegt' },
    },
    // GAMES_END
  },
};
