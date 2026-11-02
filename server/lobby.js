'use strict';

// Lobby-Verwaltung: Räume (Tische), Beitritts-Codes, Spieler, Einstellungen
// und Wiederverbinden. Diese Datei kennt kein Socket.IO, damit sie sich
// einfach testen lässt. Die Netzwerk-Schicht steckt in sockets.js.

const crypto = require('crypto');

// Ohne leicht verwechselbare Zeichen (I/1, O/0).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 9;
const NAME_MAX_LENGTH = 16;
const MAX_ROOMS = 1000;

// Wie lange ein getrennter Spieler in der Lobby seinen Platz behält.
const LOBBY_GRACE_MS = 2 * 60 * 1000;
// Räume ohne verbundene Spieler werden nach dieser Zeit gelöscht.
const ROOM_IDLE_MS = 30 * 60 * 1000;

const DEFAULT_SETTINGS = Object.freeze({
  startingChips: 1000,
  buyIn: 100,
  smallBlind: 5,
  bigBlind: 10,
  turnTime: 0, // Sekunden pro Zug, 0 = kein Zeitlimit
});

const SETTING_LIMITS = Object.freeze({
  startingChips: { min: 20, max: 10000000 },
  buyIn: { min: 0, max: 10000000 },
  smallBlind: { min: 1, max: 1000000 },
  bigBlind: { min: 1, max: 2000000 },
  turnTime: { min: 10, max: 300 }, // 0 ist zusätzlich erlaubt
});

class LobbyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LobbyError';
    this.code = code;
  }
}

function randomCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

function normalizeCode(code) {
  if (typeof code !== 'string') return '';
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}

function validateName(name) {
  if (typeof name !== 'string') {
    throw new LobbyError('INVALID_NAME', 'Bitte gib einen Benutzernamen ein.');
  }
  // Steuerzeichen entfernen, Leerraum zusammenfassen.
  const clean = name.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length === 0) {
    throw new LobbyError('INVALID_NAME', 'Bitte gib einen Benutzernamen ein.');
  }
  if (clean.length > NAME_MAX_LENGTH) {
    throw new LobbyError('INVALID_NAME', `Der Name darf höchstens ${NAME_MAX_LENGTH} Zeichen lang sein.`);
  }
  return clean;
}

function toInt(value, field) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n)) {
    throw new LobbyError('INVALID_SETTINGS', `${SETTING_LABELS[field]} muss eine ganze Zahl sein.`);
  }
  return n;
}

const SETTING_LABELS = {
  startingChips: 'Startguthaben',
  buyIn: 'Buy-in',
  smallBlind: 'Small Blind',
  bigBlind: 'Big Blind',
  turnTime: 'Zeitlimit',
};

function validateSettings(input) {
  if (!input || typeof input !== 'object') {
    throw new LobbyError('INVALID_SETTINGS', 'Ungültige Einstellungen.');
  }
  const s = {};
  for (const field of Object.keys(DEFAULT_SETTINGS)) {
    s[field] = toInt(input[field] ?? DEFAULT_SETTINGS[field], field);
  }
  for (const field of ['startingChips', 'buyIn', 'smallBlind', 'bigBlind']) {
    const { min, max } = SETTING_LIMITS[field];
    if (s[field] < min || s[field] > max) {
      throw new LobbyError(
        'INVALID_SETTINGS',
        `${SETTING_LABELS[field]} muss zwischen ${min} und ${max} liegen.`
      );
    }
  }
  if (s.turnTime !== 0 && (s.turnTime < SETTING_LIMITS.turnTime.min || s.turnTime > SETTING_LIMITS.turnTime.max)) {
    throw new LobbyError(
      'INVALID_SETTINGS',
      `Das Zeitlimit muss 0 (aus) oder zwischen ${SETTING_LIMITS.turnTime.min} und ${SETTING_LIMITS.turnTime.max} Sekunden sein.`
    );
  }
  if (s.bigBlind < s.smallBlind) {
    throw new LobbyError('INVALID_SETTINGS', 'Der Big Blind muss mindestens so gross sein wie der Small Blind.');
  }
  if (s.startingChips - s.buyIn < s.bigBlind) {
    throw new LobbyError(
      'INVALID_SETTINGS',
      'Nach Abzug des Buy-ins muss jedem Spieler mindestens ein Big Blind bleiben.'
    );
  }
  return s;
}

class RoomManager {
  constructor({ now = () => Date.now() } = {}) {
    this.rooms = new Map();
    this.now = now;
  }

  // ---------- Hilfsfunktionen ----------

  getRoom(code) {
    const room = this.rooms.get(normalizeCode(code));
    if (!room) {
      throw new LobbyError('ROOM_NOT_FOUND', 'Keine Lobby mit diesem Code gefunden.');
    }
    return room;
  }

  findRoom(code) {
    return this.rooms.get(normalizeCode(code)) || null;
  }

  getPlayer(room, playerId) {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      throw new LobbyError('NOT_IN_ROOM', 'Du bist nicht (mehr) in dieser Lobby.');
    }
    return player;
  }

  requireHost(room, playerId) {
    if (room.hostId !== playerId) {
      throw new LobbyError('NOT_HOST', 'Nur der Host darf das tun.');
    }
  }

  touch(room) {
    room.lastActivity = this.now();
  }

  newPlayer(name) {
    return {
      id: crypto.randomUUID(),
      token: crypto.randomBytes(24).toString('base64url'),
      name,
      connected: false,
      socketId: null,
      joinedAt: this.now(),
      disconnectedAt: null,
    };
  }

  uniqueCode() {
    for (let attempt = 0; attempt < 50; attempt++) {
      const code = randomCode();
      if (!this.rooms.has(code)) return code;
    }
    throw new LobbyError('SERVER_FULL', 'Konnte keinen freien Code finden. Bitte nochmal versuchen.');
  }

  // ---------- Lobby-Aktionen ----------

  createRoom(rawName) {
    const name = validateName(rawName);
    if (this.rooms.size >= MAX_ROOMS) {
      throw new LobbyError('SERVER_FULL', 'Der Server ist gerade voll. Bitte später nochmal versuchen.');
    }
    const player = this.newPlayer(name);
    const room = {
      code: this.uniqueCode(),
      hostId: player.id,
      status: 'lobby', // 'lobby' | 'playing' | 'finished'
      settings: { ...DEFAULT_SETTINGS },
      players: [player],
      createdAt: this.now(),
      lastActivity: this.now(),
      game: null,
    };
    this.rooms.set(room.code, room);
    return { room, player };
  }

  joinRoom(rawCode, rawName) {
    const name = validateName(rawName);
    const code = normalizeCode(rawCode);
    if (code.length !== CODE_LENGTH) {
      throw new LobbyError('INVALID_CODE', `Der Code besteht aus ${CODE_LENGTH} Zeichen.`);
    }
    const room = this.getRoom(code);
    if (room.status !== 'lobby') {
      throw new LobbyError('GAME_RUNNING', 'Das Spiel an diesem Tisch läuft bereits.');
    }
    if (room.players.length >= MAX_PLAYERS) {
      throw new LobbyError('ROOM_FULL', `Der Tisch ist voll (maximal ${MAX_PLAYERS} Spieler).`);
    }
    const lower = name.toLocaleLowerCase('de');
    if (room.players.some((p) => p.name.toLocaleLowerCase('de') === lower)) {
      throw new LobbyError('NAME_TAKEN', 'Dieser Name ist an diesem Tisch schon vergeben.');
    }
    const player = this.newPlayer(name);
    room.players.push(player);
    this.touch(room);
    return { room, player };
  }

  // Wiederverbinden mit dem geheimen Token, das der Browser gespeichert hat.
  // onlyIfOffline: true, wenn der Browser das Token aus einem anderen Tab
  // geerbt hat. Dann darf es keinen verbundenen Spieler verdrängen.
  resume(rawCode, token, { onlyIfOffline = false } = {}) {
    const room = this.findRoom(rawCode);
    const player = room && typeof token === 'string' ? room.players.find((p) => p.token === token) : null;
    if (!room || !player) {
      throw new LobbyError('SESSION_EXPIRED', 'Deine Sitzung ist abgelaufen.');
    }
    if (onlyIfOffline && player.connected) {
      throw new LobbyError('ALREADY_CONNECTED', 'Dieser Platz ist bereits in einem anderen Tab offen.');
    }
    return { room, player };
  }

  // Ein Spieler verlässt den Tisch freiwillig (oder wird entfernt).
  removePlayer(room, playerId) {
    const idx = room.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return;
    room.players.splice(idx, 1);
    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      return;
    }
    if (room.hostId === playerId) {
      // Host-Rolle an den Spieler übergeben, der am längsten dabei ist
      // und möglichst gerade verbunden ist.
      const next = room.players.find((p) => p.connected) || room.players[0];
      room.hostId = next.id;
    }
    this.touch(room);
  }

  leaveRoom(code, playerId) {
    const room = this.getRoom(code);
    this.getPlayer(room, playerId);
    if (room.status === 'playing' && room.game) {
      // Während einer laufenden Partie bleibt der Platz bestehen;
      // die Spiellogik behandelt den Spieler als ausgestiegen.
      room.game.playerLeft(playerId);
      const player = this.getPlayer(room, playerId);
      player.left = true;
      player.connected = false;
      player.socketId = null;
      this.reassignHostIfNeeded(room);
      this.touch(room);
      return room;
    }
    this.removePlayer(room, playerId);
    return room;
  }

  kickPlayer(code, hostId, targetId) {
    const room = this.getRoom(code);
    this.requireHost(room, hostId);
    if (room.status !== 'lobby') {
      throw new LobbyError('GAME_RUNNING', 'Während des Spiels kann niemand entfernt werden.');
    }
    if (targetId === hostId) {
      throw new LobbyError('INVALID_TARGET', 'Du kannst dich nicht selbst entfernen.');
    }
    const target = this.getPlayer(room, targetId);
    this.removePlayer(room, targetId);
    return { room, target };
  }

  updateSettings(code, playerId, input) {
    const room = this.getRoom(code);
    this.requireHost(room, playerId);
    if (room.status !== 'lobby') {
      throw new LobbyError('GAME_RUNNING', 'Die Einstellungen sind während des Spiels gesperrt.');
    }
    room.settings = validateSettings(input);
    this.touch(room);
    return room;
  }

  // createGame(room) erzeugt die Partie (siehe Schritt 2, Spiellogik).
  startGame(code, playerId, createGame) {
    const room = this.getRoom(code);
    this.requireHost(room, playerId);
    if (room.status === 'playing') {
      throw new LobbyError('GAME_RUNNING', 'Das Spiel läuft bereits.');
    }
    // Nach einer beendeten Partie kann der Host eine neue starten.
    room.players = room.players.filter((p) => !p.left);
    if (room.players.length < MIN_PLAYERS) {
      throw new LobbyError('NOT_ENOUGH_PLAYERS', `Es braucht mindestens ${MIN_PLAYERS} Spieler.`);
    }
    room.settings = validateSettings(room.settings);
    room.status = 'playing';
    room.game = createGame ? createGame(room) : null;
    this.touch(room);
    return room;
  }

  // Nach Spielende zurück in die Lobby, damit eine neue Runde starten kann.
  backToLobby(code, playerId) {
    const room = this.getRoom(code);
    this.requireHost(room, playerId);
    if (room.status === 'playing' && room.game) {
      throw new LobbyError('GAME_RUNNING', 'Das Spiel läuft noch.');
    }
    room.status = 'lobby';
    room.game = null;
    room.players = room.players.filter((p) => !p.left);
    this.touch(room);
    return room;
  }

  reassignHostIfNeeded(room) {
    const host = room.players.find((p) => p.id === room.hostId);
    if (host && !host.left) return;
    const next = room.players.find((p) => !p.left && p.connected) || room.players.find((p) => !p.left);
    if (next) room.hostId = next.id;
  }

  // ---------- Verbindungsstatus ----------

  // Gibt die Socket-ID zurück, die durch die neue Verbindung ersetzt wurde.
  attachSocket(room, player, socketId) {
    const previous = player.connected && player.socketId !== socketId ? player.socketId : null;
    player.connected = true;
    player.socketId = socketId;
    player.disconnectedAt = null;
    this.touch(room);
    return previous;
  }

  detachSocket(code, playerId, socketId) {
    const room = this.findRoom(code);
    if (!room) return null;
    const player = room.players.find((p) => p.id === playerId);
    // Nur trennen, wenn nicht schon eine neuere Verbindung übernommen hat.
    if (!player || player.socketId !== socketId) return null;
    player.connected = false;
    player.socketId = null;
    player.disconnectedAt = this.now();
    this.touch(room);
    return room;
  }

  // Räumt verwaiste Spieler und Räume auf. Gibt geänderte Räume zurück.
  sweep() {
    const now = this.now();
    const changed = [];
    for (const room of [...this.rooms.values()]) {
      const anyoneOnline = room.players.some((p) => p.connected);
      if (!anyoneOnline && now - room.lastActivity > ROOM_IDLE_MS) {
        this.rooms.delete(room.code);
        continue;
      }
      if (room.status !== 'playing') {
        const stale = room.players.filter(
          (p) => !p.connected && p.disconnectedAt !== null && now - p.disconnectedAt > LOBBY_GRACE_MS
        );
        if (stale.length > 0) {
          for (const p of stale) this.removePlayer(room, p.id);
          if (this.rooms.has(room.code)) changed.push(room);
        }
      }
    }
    return changed;
  }

  // ---------- Darstellung für einen bestimmten Spieler ----------

  // Was ein Spieler über den Raum sehen darf. Tokens werden nie verschickt.
  view(room, viewerId) {
    return {
      code: room.code,
      status: room.status,
      hostId: room.hostId,
      youId: viewerId,
      isHost: room.hostId === viewerId,
      settings: { ...room.settings },
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      prizePool: room.settings.buyIn * room.players.filter((p) => !p.left).length,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: p.connected,
        isHost: p.id === room.hostId,
        left: !!p.left,
      })),
      game: room.game ? room.game.view(viewerId) : null,
    };
  }
}

module.exports = {
  RoomManager,
  LobbyError,
  validateName,
  validateSettings,
  normalizeCode,
  DEFAULT_SETTINGS,
  SETTING_LIMITS,
  CODE_LENGTH,
  CODE_ALPHABET,
  MIN_PLAYERS,
  MAX_PLAYERS,
  LOBBY_GRACE_MS,
  ROOM_IDLE_MS,
};
