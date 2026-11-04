// Räume: Codes, Plätze, Teams, Host, Bereit, Zuschauer, Reconnect, Kick, Aufräumen.
import { randomInt } from 'node:crypto';
import { getGame } from '../shared/games/index.js';
import { hasAi } from '../shared/ai/index.js';
import { buildSeats, ROOM_MODES, sanitizeOptions } from '../shared/util/options.js';
import { shuffle } from '../shared/util/rng.js';
import { config } from './config.js';
import { checkName, cleanText } from './moderation.js';
import { secureRng } from './random.js';

export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const BOT_LEVELS = ['leicht', 'mittel', 'schwer'];
const AVATAR_RE = /^\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*$/u;
const COLOR_RE = /^#[0-9a-f]{6}$/i;
const BOT_NAMES = ['Robo', 'Chip', 'Pixel', 'Byte', 'Gizmo', 'Nova', 'Bolt', 'Kiko', 'Zappy', 'Lumo', 'Turbo', 'Bip'];

export function normalizeCode(input) {
  return String(input ?? '').toUpperCase().replace(/[\s-]/g, '');
}
export const isValidCode = (code) => code.length === 6 && [...code].every((c) => CODE_ALPHABET.includes(c));
export const formatCode = (code) => `${code.slice(0, 3)}-${code.slice(3)}`;

export function sanitizeProfile(profile) {
  const checked = checkName(profile?.name);
  if (checked.error) return checked;
  const avatar = typeof profile?.avatar === 'string' && profile.avatar.length <= 16 && AVATAR_RE.test(profile.avatar) ? profile.avatar : '🙂';
  const color = typeof profile?.color === 'string' && COLOR_RE.test(profile.color) ? profile.color.toLowerCase() : '#6c8cff';
  return { name: checked.name, avatar, color };
}

const newId = () => randomInt(2 ** 47).toString(36) + randomInt(2 ** 47).toString(36);

export class RoomManager {
  constructor({ onRoomChanged = () => {}, onPlayerRemoved = () => {} } = {}) {
    this.rooms = new Map();
    this.onRoomChanged = onRoomChanged;
    this.onPlayerRemoved = onPlayerRemoved;
    this.rng = secureRng();
  }

  generateCode() {
    for (;;) {
      let code = '';
      for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
  }

  create({ gameId, mode, options, token, profile }) {
    const game = getGame(gameId);
    if (!game) return { error: 'game_unknown' };
    if (!ROOM_MODES.includes(mode) || !game.modes.includes(mode)) return { error: 'mode_unknown' };
    if (this.rooms.size >= config.limits.maxRooms) return { error: 'server_full' };
    const p = sanitizeProfile(profile);
    if (p.error) return p;
    const code = this.generateCode();
    const room = {
      code, gameId, mode, options: sanitizeOptions(game, options), phase: 'lobby',
      seats: buildSeats(game, mode), players: new Map(), byToken: new Map(), hostId: null,
      chatEnabled: true, teamChatEnabled: true, locked: false, banned: new Set(), bannedNames: new Set(), series: { red: 0, blue: 0, draws: 0, wins: {} },
      firstTeam: 'red', session: null, lastResult: null, customCards: [], createdAt: Date.now(), lastActivity: Date.now(),
    };
    this.rooms.set(code, room);
    const player = this.addPlayer(room, token, p);
    room.hostId = player.id;
    this.seatPlayer(room, player.id, 0);
    return { room, player };
  }

  addPlayer(room, token, profile, extra = {}) {
    const player = { id: newId(), token, ...profile, isBot: false, connected: true, ready: false, gone: false, disconnectedAt: null, ...extra };
    room.players.set(player.id, player);
    if (token) room.byToken.set(token, player.id);
    return player;
  }

  get(code) {
    return this.rooms.get(normalizeCode(code));
  }

  seatOf(room, playerId) {
    return room.seats.findIndex((s) => s.playerId === playerId);
  }

  seatPlayer(room, playerId, index) {
    const old = this.seatOf(room, playerId);
    if (old >= 0) room.seats[old].playerId = null;
    room.seats[index].playerId = playerId;
  }

  /** Beitreten (oder Wiederkehren mit demselben Token). */
  join({ code, token, profile }) {
    const room = this.get(code);
    if (!room) return { error: 'room_not_found' };
    if (room.banned.has(token)) return { error: 'kicked' };
    const knownId = room.byToken.get(token);
    if (knownId && room.players.has(knownId)) {
      const player = room.players.get(knownId);
      player.connected = true;
      player.gone = false;
      player.disconnectedAt = null;
      const p = sanitizeProfile(profile);
      if (!p.error && room.phase === 'lobby') Object.assign(player, p);
      this.touch(room);
      return { room, player, rejoined: true };
    }
    const p = sanitizeProfile(profile);
    if (p.error) return p;
    // Abgeschlossener Raum: nur wer schon drin war, kommt zurück. Entfernte Namen bleiben draussen.
    if (room.locked) return { error: 'room_locked' };
    if (room.bannedNames.has(p.name.trim().toLowerCase())) return { error: 'kicked' };
    const free = room.phase === 'lobby' ? room.seats.findIndex((s) => !s.playerId) : -1;
    const spectators = [...room.players.values()].filter((pl) => !pl.isBot && this.seatOf(room, pl.id) < 0).length;
    if (free < 0 && spectators >= config.limits.maxSpectators) return { error: 'room_full_spectators' };
    const player = this.addPlayer(room, token, p);
    if (free >= 0) this.seatPlayer(room, player.id, free);
    if (!room.hostId) room.hostId = player.id;
    this.touch(room);
    return { room, player, spectator: free < 0 };
  }

  touch(room) {
    room.lastActivity = Date.now();
  }

  isHost(room, playerId) {
    return room.hostId === playerId;
  }

  /** Spieler wechselt selbst auf einen freien Platz (anderes Team). */
  takeSeat(room, playerId, index) {
    if (room.phase !== 'lobby') return { error: 'not_in_lobby' };
    const seat = room.seats[index];
    if (!seat) return { error: 'seat_unknown' };
    if (seat.playerId) return { error: 'seat_taken' };
    this.seatPlayer(room, playerId, index);
    room.players.get(playerId).ready = false;
    this.touch(room);
    return { ok: true };
  }

  leaveSeat(room, playerId) {
    if (room.phase !== 'lobby') return { error: 'not_in_lobby' };
    const index = this.seatOf(room, playerId);
    if (index >= 0) room.seats[index].playerId = null;
    return { ok: true };
  }

  setReady(room, playerId, ready) {
    const player = room.players.get(playerId);
    if (!player || this.seatOf(room, playerId) < 0) return { error: 'not_seated' };
    player.ready = Boolean(ready);
    this.touch(room);
    return { ok: true };
  }

  /** Wer fehlt noch? Leere Plätze (Teams) bzw. zu wenige Spieler (Gruppe) und wer nicht bereit ist. */
  startCheck(room) {
    const game = getGame(room.gameId);
    const seated = room.seats.filter((s) => s.playerId).map((s) => room.players.get(s.playerId));
    const missing = [];
    if (room.mode === 'group') {
      if (seated.length < game.players.min) missing.push({ type: 'players', count: game.players.min - seated.length });
    } else {
      const empty = room.seats.filter((s) => !s.playerId).length;
      if (empty) missing.push({ type: 'seats', count: empty });
    }
    for (const p of seated) if (!p.isBot && !p.ready && p.id !== room.hostId) missing.push({ type: 'ready', name: p.name, id: p.id });
    return { ok: missing.length === 0, missing };
  }

  hostCommand(room, hostId, cmd) {
    if (!this.isHost(room, hostId)) return { error: 'not_host' };
    const game = getGame(room.gameId);
    this.touch(room);
    switch (cmd?.type) {
      case 'move': {
        if (room.phase !== 'lobby') return { error: 'not_in_lobby' };
        const target = room.seats[cmd.seat];
        if (!target || !room.players.has(cmd.playerId)) return { error: 'invalid' };
        const from = this.seatOf(room, cmd.playerId);
        const other = target.playerId;
        target.playerId = cmd.playerId;
        if (from >= 0) room.seats[from].playerId = other && other !== cmd.playerId ? other : null;
        else if (other && other !== cmd.playerId) target.playerId = cmd.playerId;
        return { ok: true };
      }
      case 'spectate': {
        if (room.phase !== 'lobby') return { error: 'not_in_lobby' };
        const index = this.seatOf(room, cmd.playerId);
        if (index >= 0) room.seats[index].playerId = null;
        return { ok: true };
      }
      case 'shuffle': {
        if (room.phase !== 'lobby') return { error: 'not_in_lobby' };
        const ids = shuffle(room.seats.map((s) => s.playerId), this.rng);
        room.seats.forEach((s, i) => (s.playerId = ids[i]));
        return { ok: true };
      }
      case 'kick': {
        const player = room.players.get(cmd.playerId);
        if (!player || player.id === hostId) return { error: 'invalid' };
        if (player.token) room.banned.add(player.token);
        room.bannedNames.add(player.name.trim().toLowerCase());
        this.removePlayer(room, player.id, 'kicked');
        return { ok: true };
      }
      case 'fillBots': {
        if (room.phase !== 'lobby') return { error: 'not_in_lobby' };
        if (!hasAi(room.gameId) || !(game.botModes ?? []).includes(room.mode)) return { error: 'no_ai' };
        const level = BOT_LEVELS.includes(cmd.level) ? cmd.level : 'mittel';
        const limit = room.mode === 'group' ? Math.min(room.seats.length, game.players.maxBots ?? game.players.max) : room.seats.length;
        let used = room.seats.filter((s) => s.playerId).length;
        room.seats.forEach((seat) => {
          if (seat.playerId || used >= limit) return;
          const taken = new Set([...room.players.values()].map((p) => p.name));
          const name = BOT_NAMES.find((n) => !taken.has(n)) ?? `Bot ${room.players.size}`;
          const bot = this.addPlayer(room, null, { name, avatar: '🤖', color: '#8a93a8' }, { isBot: true, botLevel: level, ready: true });
          seat.playerId = bot.id;
          used++;
        });
        return { ok: true };
      }
      case 'options': {
        if (room.phase !== 'lobby') return { error: 'not_in_lobby' };
        room.options = sanitizeOptions(game, { ...room.options, ...cmd.options });
        for (const p of room.players.values()) if (!p.isBot) p.ready = false;
        return { ok: true };
      }
      case 'game': {
        if (room.phase === 'playing') return { error: 'game_running' };
        const next = getGame(cmd.gameId);
        if (!next) return { error: 'game_unknown' };
        const mode = next.modes.includes(cmd.mode) && ROOM_MODES.includes(cmd.mode) ? cmd.mode : next.modes.includes(room.mode) ? room.mode : next.modes.find((m) => ROOM_MODES.includes(m));
        const seatedHumans = room.seats.map((s) => s.playerId).filter((id) => id && !room.players.get(id).isBot);
        for (const p of [...room.players.values()]) if (p.isBot) this.removePlayer(room, p.id, 'silent');
        room.gameId = next.id;
        room.mode = mode;
        room.options = sanitizeOptions(next, cmd.options);
        room.seats = buildSeats(next, mode);
        seatedHumans.slice(0, room.seats.length).forEach((id, i) => (room.seats[i].playerId = id));
        room.phase = 'lobby';
        room.series = { red: 0, blue: 0, draws: 0, wins: {} };
        room.lastResult = null;
        room.session?.stop();
        room.session = null;
        for (const p of room.players.values()) if (!p.isBot) p.ready = false;
        return { ok: true };
      }
      case 'chat':
        room.chatEnabled = Boolean(cmd.enabled);
        return { ok: true };
      case 'teamChat':
        room.teamChatEnabled = Boolean(cmd.enabled);
        return { ok: true };
      case 'lock':
        room.locked = Boolean(cmd.enabled);
        return { ok: true };
      case 'lobby':
        if (room.phase === 'playing') room.session?.stop();
        room.session = null;
        room.phase = 'lobby';
        for (const p of room.players.values()) if (!p.isBot) p.ready = false;
        return { ok: true };
      default:
        return { error: 'invalid' };
    }
  }

  /** Spieler entfernen (Kick, Verlassen in der Lobby, Zeit abgelaufen). Host geht automatisch weiter. */
  removePlayer(room, playerId, reason = 'left') {
    const player = room.players.get(playerId);
    if (!player) return;
    const seat = this.seatOf(room, playerId);
    if (room.phase === 'playing' && seat >= 0) {
      player.gone = true;
      player.connected = false;
    } else {
      if (seat >= 0) room.seats[seat].playerId = null;
      room.players.delete(playerId);
      if (player.token && room.byToken.get(player.token) === playerId) room.byToken.delete(player.token);
    }
    if (reason !== 'silent') this.onPlayerRemoved(room, player, reason);
    if (room.hostId === playerId) this.reassignHost(room);
    if (![...room.players.values()].some((p) => !p.isBot && !p.gone)) this.close(room);
  }

  reassignHost(room) {
    const candidates = [...room.players.values()].filter((p) => !p.isBot && !p.gone);
    const next = candidates.find((p) => p.connected) ?? candidates[0];
    room.hostId = next?.id ?? null;
  }

  disconnect(room, playerId) {
    const player = room.players.get(playerId);
    if (!player) return;
    player.connected = false;
    player.disconnectedAt = Date.now();
    if (room.hostId === playerId) {
      const other = [...room.players.values()].find((p) => !p.isBot && p.connected && p.id !== playerId);
      if (other) room.hostId = other.id;
    }
  }

  close(room) {
    room.session?.stop();
    this.rooms.delete(room.code);
  }

  /** Regelmässig: Getrennte nach 3 Minuten entfernen, inaktive Räume nach 30 Minuten löschen. */
  sweep(now = Date.now()) {
    for (const room of [...this.rooms.values()]) {
      if (now - room.lastActivity > config.limits.roomIdleMs) {
        this.close(room);
        continue;
      }
      let changed = false;
      for (const p of [...room.players.values()]) {
        if (!p.isBot && !p.connected && !p.gone && p.disconnectedAt && now - p.disconnectedAt > config.limits.reconnectGraceMs) {
          this.removePlayer(room, p.id, 'timeout');
          changed = true;
        }
      }
      if (changed && this.rooms.has(room.code)) this.onRoomChanged(room);
    }
  }

  publicPlayer(room, p) {
    return { id: p.id, name: p.name, avatar: p.avatar, color: p.color, isBot: p.isBot, botLevel: p.botLevel, connected: p.connected, ready: p.ready, gone: p.gone, isHost: room.hostId === p.id };
  }

  publicRoom(room, viewerId) {
    const seatIndex = this.seatOf(room, viewerId);
    const check = this.startCheck(room);
    return {
      code: room.code, gameId: room.gameId, mode: room.mode, options: room.options, phase: room.phase,
      hostId: room.hostId, chatEnabled: room.chatEnabled, teamChatEnabled: room.teamChatEnabled, locked: room.locked,
      series: room.series, lastResult: room.lastResult, customCards: room.customCards.length,
      seats: room.seats.map((s, index) => ({ index, team: s.team, player: s.playerId ? this.publicPlayer(room, room.players.get(s.playerId)) : null })),
      spectators: [...room.players.values()].filter((p) => !p.isBot && this.seatOf(room, p.id) < 0).map((p) => this.publicPlayer(room, p)),
      you: { id: viewerId, seat: seatIndex, team: seatIndex >= 0 ? room.seats[seatIndex].team : null, isHost: room.hostId === viewerId },
      canStart: check.ok, missing: check.missing,
    };
  }

  addCustomCard(room, hostId, card) {
    if (!this.isHost(room, hostId)) return { error: 'not_host' };
    if (room.customCards.length >= config.limits.customCardsMax) return { error: 'too_many' };
    const text = cleanText(card?.text, 160);
    if (text.length < 5) return { error: 'too_short' };
    return { text, type: card?.type === 'dare' ? 'dare' : 'truth' };
  }
}
