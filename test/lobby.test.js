'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RoomManager,
  LobbyError,
  validateName,
  validateSettings,
  normalizeCode,
  CODE_LENGTH,
  CODE_ALPHABET,
  MAX_PLAYERS,
  LOBBY_GRACE_MS,
  ROOM_IDLE_MS,
} = require('../server/lobby');

function throwsCode(fn, code) {
  assert.throws(fn, (err) => err instanceof LobbyError && err.code === code);
}

test('Raum erstellen liefert einen 6-stelligen Code und macht den Ersteller zum Host', () => {
  const m = new RoomManager();
  const { room, player } = m.createRoom('Anna');
  assert.equal(room.code.length, CODE_LENGTH);
  for (const ch of room.code) assert.ok(CODE_ALPHABET.includes(ch));
  assert.equal(room.hostId, player.id);
  assert.equal(room.status, 'lobby');
  assert.equal(room.players.length, 1);
});

test('Codes sind eindeutig', () => {
  const m = new RoomManager();
  const codes = new Set();
  for (let i = 0; i < 300; i++) codes.add(m.createRoom('P' + i).room.code);
  assert.equal(codes.size, 300);
});

test('Beitreten per Code (Gross-/Kleinschreibung egal)', () => {
  const m = new RoomManager();
  const { room } = m.createRoom('Anna');
  const { player } = m.joinRoom(room.code.toLowerCase(), 'Ben');
  assert.equal(room.players.length, 2);
  assert.equal(room.players[1].id, player.id);
});

test('Falscher Code wird abgelehnt', () => {
  const m = new RoomManager();
  throwsCode(() => m.joinRoom('ZZZZZZ', 'Ben'), 'ROOM_NOT_FOUND');
  throwsCode(() => m.joinRoom('AB', 'Ben'), 'INVALID_CODE');
});

test('Doppelter Name am selben Tisch wird abgelehnt', () => {
  const m = new RoomManager();
  const { room } = m.createRoom('Anna');
  throwsCode(() => m.joinRoom(room.code, 'anna'), 'NAME_TAKEN');
});

test('Höchstens 9 Spieler pro Tisch', () => {
  const m = new RoomManager();
  const { room } = m.createRoom('P0');
  for (let i = 1; i < MAX_PLAYERS; i++) m.joinRoom(room.code, 'P' + i);
  assert.equal(room.players.length, MAX_PLAYERS);
  throwsCode(() => m.joinRoom(room.code, 'Zuviel'), 'ROOM_FULL');
});

test('Namen werden geprüft und bereinigt', () => {
  assert.equal(validateName('  Max   Muster '), 'Max Muster');
  throwsCode(() => validateName(''), 'INVALID_NAME');
  throwsCode(() => validateName('   '), 'INVALID_NAME');
  throwsCode(() => validateName('x'.repeat(17)), 'INVALID_NAME');
  throwsCode(() => validateName(42), 'INVALID_NAME');
});

test('normalizeCode entfernt Sonderzeichen', () => {
  assert.equal(normalizeCode(' ab-c 12 3 '), 'ABC123');
  assert.equal(normalizeCode(null), '');
});

test('Nur der Host darf Einstellungen ändern und starten', () => {
  const m = new RoomManager();
  const { room, player: host } = m.createRoom('Anna');
  const { player: ben } = m.joinRoom(room.code, 'Ben');
  const settings = { startingChips: 2000, buyIn: 200, smallBlind: 10, bigBlind: 20, turnTime: 30 };
  throwsCode(() => m.updateSettings(room.code, ben.id, settings), 'NOT_HOST');
  m.updateSettings(room.code, host.id, settings);
  assert.deepEqual(room.settings, settings);
  throwsCode(() => m.startGame(room.code, ben.id), 'NOT_HOST');
});

test('Einstellungen werden validiert', () => {
  const ok = { startingChips: 1000, buyIn: 100, smallBlind: 5, bigBlind: 10, turnTime: 0 };
  assert.deepEqual(validateSettings(ok), ok);
  assert.deepEqual(validateSettings({ ...ok, startingChips: '1500' }).startingChips, 1500);
  throwsCode(() => validateSettings({ ...ok, bigBlind: 2 }), 'INVALID_SETTINGS');
  throwsCode(() => validateSettings({ ...ok, buyIn: 995 }), 'INVALID_SETTINGS');
  throwsCode(() => validateSettings({ ...ok, smallBlind: 2.5 }), 'INVALID_SETTINGS');
  throwsCode(() => validateSettings({ ...ok, startingChips: -5 }), 'INVALID_SETTINGS');
  throwsCode(() => validateSettings({ ...ok, turnTime: 3 }), 'INVALID_SETTINGS');
  throwsCode(() => validateSettings({ ...ok, startingChips: 'viel' }), 'INVALID_SETTINGS');
  throwsCode(() => validateSettings(null), 'INVALID_SETTINGS');
});

test('Start braucht mindestens 2 Spieler; danach kein Beitritt mehr', () => {
  const m = new RoomManager();
  const { room, player: host } = m.createRoom('Anna');
  throwsCode(() => m.startGame(room.code, host.id), 'NOT_ENOUGH_PLAYERS');
  m.joinRoom(room.code, 'Ben');
  let created = null;
  m.startGame(room.code, host.id, (r) => {
    created = r;
    return { view: () => ({}), playerLeft() {} };
  });
  assert.equal(created, room);
  assert.equal(room.status, 'playing');
  throwsCode(() => m.joinRoom(room.code, 'Carla'), 'GAME_RUNNING');
  throwsCode(() => m.updateSettings(room.code, host.id, room.settings), 'GAME_RUNNING');
});

test('Wiederverbinden mit Token', () => {
  const m = new RoomManager();
  const { room, player } = m.createRoom('Anna');
  const res = m.resume(room.code, player.token);
  assert.equal(res.player, player);
  throwsCode(() => m.resume(room.code, 'falsch'), 'SESSION_EXPIRED');
  throwsCode(() => m.resume('ZZZZZZ', player.token), 'SESSION_EXPIRED');
});

test('Geerbte Sitzung verdrängt keinen verbundenen Spieler', () => {
  const m = new RoomManager();
  const { room, player } = m.createRoom('Anna');
  m.attachSocket(room, player, 'socket-1');
  throwsCode(() => m.resume(room.code, player.token, { onlyIfOffline: true }), 'ALREADY_CONNECTED');
  m.detachSocket(room.code, player.id, 'socket-1');
  assert.equal(m.resume(room.code, player.token, { onlyIfOffline: true }).player, player);
});

test('Neue Verbindung ersetzt die alte; alte Trennung stört nicht', () => {
  const m = new RoomManager();
  const { room, player } = m.createRoom('Anna');
  assert.equal(m.attachSocket(room, player, 's1'), null);
  assert.equal(m.attachSocket(room, player, 's2'), 's1');
  // Die alte Verbindung meldet sich später ab – der Spieler bleibt verbunden.
  assert.equal(m.detachSocket(room.code, player.id, 's1'), null);
  assert.equal(player.connected, true);
  m.detachSocket(room.code, player.id, 's2');
  assert.equal(player.connected, false);
});

test('Host verlässt die Lobby: Host-Rolle geht weiter, leerer Raum wird gelöscht', () => {
  const m = new RoomManager();
  const { room, player: anna } = m.createRoom('Anna');
  const { player: ben } = m.joinRoom(room.code, 'Ben');
  m.leaveRoom(room.code, anna.id);
  assert.equal(room.hostId, ben.id);
  assert.equal(room.players.length, 1);
  m.leaveRoom(room.code, ben.id);
  assert.equal(m.findRoom(room.code), null);
});

test('Host kann Spieler entfernen, aber nicht sich selbst', () => {
  const m = new RoomManager();
  const { room, player: anna } = m.createRoom('Anna');
  const { player: ben } = m.joinRoom(room.code, 'Ben');
  throwsCode(() => m.kickPlayer(room.code, ben.id, anna.id), 'NOT_HOST');
  throwsCode(() => m.kickPlayer(room.code, anna.id, anna.id), 'INVALID_TARGET');
  m.kickPlayer(room.code, anna.id, ben.id);
  assert.equal(room.players.length, 1);
  throwsCode(() => m.resume(room.code, ben.token), 'SESSION_EXPIRED');
});

test('Aufräumen: getrennte Lobby-Spieler und verlassene Räume verschwinden', () => {
  let now = 1000;
  const m = new RoomManager({ now: () => now });
  const { room, player: anna } = m.createRoom('Anna');
  const { player: ben } = m.joinRoom(room.code, 'Ben');
  m.attachSocket(room, anna, 'a');
  m.attachSocket(room, ben, 'b');
  m.detachSocket(room.code, ben.id, 'b');

  now += LOBBY_GRACE_MS - 1;
  m.sweep();
  assert.equal(room.players.length, 2, 'kurz getrennt: Platz bleibt');

  now += 2;
  assert.deepEqual(m.sweep(), [room]);
  assert.equal(room.players.length, 1);

  m.detachSocket(room.code, anna.id, 'a');
  now += ROOM_IDLE_MS + 1;
  m.sweep();
  assert.equal(m.findRoom(room.code), null);
});

test('Ansicht enthält keine geheimen Tokens', () => {
  const m = new RoomManager();
  const { room, player } = m.createRoom('Anna');
  m.joinRoom(room.code, 'Ben');
  const view = m.view(room, player.id);
  const json = JSON.stringify(view);
  for (const p of room.players) assert.ok(!json.includes(p.token));
  assert.equal(view.isHost, true);
  assert.equal(view.prizePool, 200);
});
