// Socket.IO-Ereignisse: Räume, Lobby, Spielaktionen, Chat. Jede Eingabe wird geprüft.
import { getGame } from '../shared/games/index.js';
import { config } from './config.js';
import { GameSession } from './gameRunner.js';
import { censor, cleanText, containsBadWord } from './moderation.js';
import { tokenBucket, windowCounter } from './rateLimit.js';
import { isValidCode, normalizeCode, RoomManager } from './rooms.js';

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;
const REACTIONS = ['👍', '😂', '😮', '🔥', '👏'];
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function attachSockets(io, { botPool }) {
  const manager = new RoomManager({
    onRoomChanged: (room) => emitRoom(room),
    onPlayerRemoved: (room, player, reason) => {
      const socket = player.socketId && io.sockets.sockets.get(player.socketId);
      if (socket && reason !== 'timeout') {
        if (reason === 'kicked') socket.emit('room:kicked', { code: room.code });
        socket.leave(room.code);
        socket.data.roomCode = null;
      }
      emitRoom(room);
    },
  });

  const sockets = (room) => [...room.players.values()].filter((p) => !p.isBot && p.connected && p.socketId).map((p) => [p, io.sockets.sockets.get(p.socketId)]).filter(([, s]) => s);

  function emitRoom(room) {
    if (!manager.rooms.has(room.code)) return;
    for (const [p, s] of sockets(room)) s.emit('room:state', manager.publicRoom(room, p.id));
  }

  function startGame(room) {
    room.session?.stop();
    room.phase = 'playing';
    room.lastResult = null;
    room.session = new GameSession(room, {
      botPool,
      send: (player, payload) => io.sockets.sockets.get(player.socketId)?.emit('game:view', payload),
      sendLight: (player, payload) => io.sockets.sockets.get(player.socketId)?.emit('game:light', payload),
      onEnd: (result) => {
        room.phase = 'results';
        const winnerTeams = new Set(result.winners.map((id) => room.seats.find((s) => s.playerId === id)?.team).filter(Boolean));
        if (!result.winners.length) room.series.draws++;
        else if (room.mode !== 'group' && winnerTeams.size === 1) room.series[[...winnerTeams][0]]++;
        for (const id of result.winners) room.series.wins[id] = (room.series.wins[id] ?? 0) + 1;
        room.lastResult = { ...result, winnerTeam: winnerTeams.size === 1 ? [...winnerTeams][0] : null };
        for (const p of room.players.values()) if (!p.isBot) p.ready = false;
        emitRoom(room);
      },
    });
    emitRoom(room);
    room.session.start();
  }

  setInterval(() => manager.sweep(), 5000).unref();

  io.on('connection', (socket) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string' || !TOKEN_RE.test(token)) {
      socket.emit('notice', { code: 'bad_token' });
      socket.disconnect(true);
      return;
    }
    const limits = { action: tokenBucket(config.limits.actionsPerSecond * config.rateFactor), chat: tokenBucket(config.limits.chatPerSecond, 1), join: windowCounter(config.limits.wrongCodesPerMinute, 60_000), any: tokenBucket(40 * config.rateFactor, 80 * config.rateFactor) };
    const reply = (ack, value) => typeof ack === 'function' && ack(value);
    const current = () => {
      const room = socket.data.roomCode && manager.rooms.get(socket.data.roomCode);
      const player = room && room.players.get(socket.data.playerId);
      return room && player ? { room, player } : {};
    };
    const guard = (handler) => (payload, ack) => {
      if (!limits.any()) return reply(ack, { error: 'rate_limited' });
      try {
        handler(isObj(payload) ? payload : {}, ack);
      } catch (err) {
        console.error('[socket]', err);
        reply(ack, { error: 'server_error' });
      }
    };

    function enter(room, player) {
      const prev = current();
      if (prev.room && prev.room !== room) leave(prev.room, prev.player);
      socket.join(room.code);
      socket.data.roomCode = room.code;
      socket.data.playerId = player.id;
      player.socketId = socket.id;
      player.connected = true;
      emitRoom(room);
      if (room.session && (room.phase === 'playing' || room.phase === 'results')) {
        const seated = room.seats.some((s) => s.playerId === player.id);
        socket.emit('game:view', { ...room.session.viewFor(seated ? player.id : null), events: [] });
      }
    }

    function leave(room, player) {
      socket.leave(room.code);
      socket.data.roomCode = null;
      manager.removePlayer(room, player.id, 'left');
      if (manager.rooms.has(room.code)) emitRoom(room);
    }

    socket.on('room:create', guard((p, ack) => {
      const res = manager.create({ gameId: p.gameId, mode: p.mode, options: isObj(p.options) ? p.options : {}, token, profile: p.profile });
      if (res.error) return reply(ack, res);
      enter(res.room, res.player);
      reply(ack, { code: res.room.code });
    }));

    socket.on('room:join', guard((p, ack) => {
      if (limits.join.blocked()) return reply(ack, { error: 'too_many_attempts' });
      const code = normalizeCode(p.code);
      const res = isValidCode(code) ? manager.join({ code, token, profile: p.profile }) : { error: 'room_not_found' };
      if (res.error) {
        if (res.error === 'room_not_found') limits.join.hit();
        return reply(ack, res);
      }
      enter(res.room, res.player);
      reply(ack, { code: res.room.code, spectator: Boolean(res.spectator), rejoined: Boolean(res.rejoined) });
    }));

    socket.on('room:leave', guard((_p, ack) => {
      const { room, player } = current();
      if (room) leave(room, player);
      reply(ack, { ok: true });
    }));

    socket.on('room:seat', guard((p, ack) => {
      const { room, player } = current();
      if (!room) return reply(ack, { error: 'no_room' });
      const res = p.seat === null ? manager.leaveSeat(room, player.id) : manager.takeSeat(room, player.id, Number(p.seat));
      if (!res.error) emitRoom(room);
      reply(ack, res);
    }));

    socket.on('room:ready', guard((p, ack) => {
      const { room, player } = current();
      if (!room) return reply(ack, { error: 'no_room' });
      const res = manager.setReady(room, player.id, p.ready);
      if (!res.error) emitRoom(room);
      reply(ack, res);
    }));

    socket.on('room:host', guard((p, ack) => {
      const { room, player } = current();
      if (!room) return reply(ack, { error: 'no_room' });
      const res = manager.hostCommand(room, player.id, p);
      if (!res.error && manager.rooms.has(room.code)) emitRoom(room);
      reply(ack, res);
    }));

    socket.on('room:card', guard((p, ack) => {
      const { room, player } = current();
      if (!room) return reply(ack, { error: 'no_room' });
      const res = manager.addCustomCard(room, player.id, p);
      if (res.error) return reply(ack, res);
      if (containsBadWord(res.text)) return reply(ack, { error: 'text_bad' });
      room.customCards.push(res);
      emitRoom(room);
      reply(ack, { ok: true });
    }));

    socket.on('room:start', guard((_p, ack) => {
      const { room, player } = current();
      if (!room) return reply(ack, { error: 'no_room' });
      if (!manager.isHost(room, player.id)) return reply(ack, { error: 'not_host' });
      if (room.phase !== 'lobby') return reply(ack, { error: 'not_in_lobby' });
      const check = manager.startCheck(room);
      if (!check.ok) return reply(ack, { error: 'not_ready', missing: check.missing });
      startGame(room);
      reply(ack, { ok: true });
    }));

    socket.on('room:rematch', guard((_p, ack) => {
      const { room, player } = current();
      if (!room) return reply(ack, { error: 'no_room' });
      if (!manager.isHost(room, player.id)) return reply(ack, { error: 'not_host' });
      if (room.phase !== 'results') return reply(ack, { error: 'invalid' });
      room.firstTeam = room.firstTeam === 'red' ? 'blue' : 'red';
      startGame(room);
      reply(ack, { ok: true });
    }));

    socket.on('game:action', guard((p, ack) => {
      const { room, player } = current();
      if (!room || !room.session || room.phase !== 'playing') return reply(ack, { error: 'no_game' });
      if (!limits.action()) return reply(ack, { error: 'rate_limited' });
      if (!room.seats.some((s) => s.playerId === player.id)) return reply(ack, { error: 'spectator' });
      if (JSON.stringify(p.action ?? null).length > config.limits.messageMaxBytes) return reply(ack, { error: 'too_large' });
      manager.touch(room);
      reply(ack, room.session.act(player.id, p.action));
    }));

    socket.on('chat:send', guard((p, ack) => {
      const { room, player } = current();
      if (!room) return reply(ack, { error: 'no_room' });
      if (!limits.chat()) return reply(ack, { error: 'chat_slow' });
      const seat = room.seats.find((s) => s.playerId === player.id);
      const channel = p.channel === 'team' && seat?.team ? 'team' : 'room';
      if (!room.chatEnabled && channel === 'room') return reply(ack, { error: 'chat_off' });
      if (channel === 'team' && !room.teamChatEnabled) return reply(ack, { error: 'chat_off' });
      const reaction = REACTIONS.includes(p.reaction) ? p.reaction : null;
      const text = reaction ? '' : censor(cleanText(p.text, config.limits.chatMaxLength));
      if (!text && !reaction) return reply(ack, { error: 'empty' });
      const msg = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, from: { id: player.id, name: player.name, avatar: player.avatar, color: player.color }, text, reaction, channel, team: channel === 'team' ? seat.team : null, at: Date.now() };
      manager.touch(room);
      for (const [p2, s] of sockets(room)) {
        if (channel === 'team' && room.seats.find((x) => x.playerId === p2.id)?.team !== seat.team) continue;
        s.emit('chat:msg', msg);
      }
      reply(ack, { ok: true });
    }));

    socket.on('disconnect', () => {
      const { room, player } = current();
      if (!room || player.socketId !== socket.id) return;
      manager.disconnect(room, player.id);
      emitRoom(room);
      if (room.session && room.phase === 'playing') room.session.scheduleAutomatic();
    });
  });

  return manager;
}

export const gameInfo = (id) => getGame(id);
