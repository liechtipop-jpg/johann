'use strict';

// Netzwerk-Schicht: verbindet Socket.IO-Ereignisse mit dem RoomManager.
// Jeder Spieler bekommt seine eigene Sicht auf den Raum (room:state),
// damit später niemand die Karten der anderen sehen kann.

const { LobbyError } = require('./lobby');

const SWEEP_INTERVAL_MS = 15 * 1000;

function attachSockets(io, manager, { createGame = null } = {}) {
  // Schickt jedem verbundenen Spieler im Raum seinen persönlichen Zustand.
  function broadcastRoom(room) {
    for (const p of room.players) {
      if (p.connected && p.socketId) {
        io.to(p.socketId).emit('room:state', manager.view(room, p.id));
      }
    }
  }

  // Die Spiellogik (Schritt 2) meldet Änderungen über diese Funktion.
  manager.onRoomChanged = (room) => {
    if (manager.findRoom(room.code) === room) broadcastRoom(room);
  };

  function sessionPayload(room, player) {
    return {
      ok: true,
      code: room.code,
      token: player.token,
      playerId: player.id,
      name: player.name,
      state: manager.view(room, player.id),
    };
  }

  // Ein Socket gehört immer höchstens zu einem Platz an einem Tisch.
  function bindSocket(socket, room, player) {
    const previous = socket.data.session;
    if (previous && (previous.code !== room.code || previous.playerId !== player.id)) {
      unbindSocket(socket);
    }
    const replacedSocketId = manager.attachSocket(room, player, socket.id);
    if (replacedSocketId) {
      const old = io.sockets.sockets.get(replacedSocketId);
      if (old) {
        old.data.session = null;
        old.emit('session:replaced');
      }
    }
    socket.data.session = { code: room.code, playerId: player.id };
  }

  function unbindSocket(socket) {
    const session = socket.data.session;
    socket.data.session = null;
    if (!session) return;
    const room = manager.detachSocket(session.code, session.playerId, socket.id);
    if (room) {
      if (room.game && room.status === 'playing') room.game.playerDisconnected(session.playerId);
      broadcastRoom(room);
    }
  }

  // Führt eine Aktion aus und beantwortet sie einheitlich über den Ack-Callback.
  function handle(socket, fn) {
    return (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const result = fn(payload && typeof payload === 'object' ? payload : {});
        reply(result || { ok: true });
      } catch (err) {
        if (err instanceof LobbyError) {
          reply({ ok: false, code: err.code, error: err.message });
        } else {
          console.error('Unerwarteter Fehler:', err);
          reply({ ok: false, code: 'SERVER_ERROR', error: 'Unerwarteter Fehler auf dem Server.' });
        }
      }
    };
  }

  function requireSession(socket) {
    const session = socket.data.session;
    if (!session) {
      throw new LobbyError('NO_SESSION', 'Du bist an keinem Tisch.');
    }
    return session;
  }

  io.on('connection', (socket) => {
    socket.data.session = null;

    socket.on(
      'room:create',
      handle(socket, ({ name }) => {
        const { room, player } = manager.createRoom(name);
        bindSocket(socket, room, player);
        broadcastRoom(room);
        return sessionPayload(room, player);
      })
    );

    socket.on(
      'room:join',
      handle(socket, ({ name, code }) => {
        const { room, player } = manager.joinRoom(code, name);
        bindSocket(socket, room, player);
        broadcastRoom(room);
        return sessionPayload(room, player);
      })
    );

    socket.on(
      'room:resume',
      handle(socket, ({ code, token, onlyIfOffline }) => {
        const { room, player } = manager.resume(code, token, { onlyIfOffline: !!onlyIfOffline });
        bindSocket(socket, room, player);
        if (room.game && room.status === 'playing') room.game.playerReconnected(player.id);
        broadcastRoom(room);
        return sessionPayload(room, player);
      })
    );

    socket.on(
      'room:leave',
      handle(socket, () => {
        const session = requireSession(socket);
        socket.data.session = null;
        const room = manager.leaveRoom(session.code, session.playerId);
        if (manager.findRoom(room.code)) broadcastRoom(room);
        return { ok: true };
      })
    );

    socket.on(
      'room:kick',
      handle(socket, ({ playerId }) => {
        const session = requireSession(socket);
        const { room, target } = manager.kickPlayer(session.code, session.playerId, playerId);
        if (target.socketId) {
          const targetSocket = io.sockets.sockets.get(target.socketId);
          if (targetSocket) {
            targetSocket.data.session = null;
            targetSocket.emit('room:kicked');
          }
        }
        broadcastRoom(room);
        return { ok: true };
      })
    );

    socket.on(
      'room:settings',
      handle(socket, ({ settings }) => {
        const session = requireSession(socket);
        const room = manager.updateSettings(session.code, session.playerId, settings);
        broadcastRoom(room);
        return { ok: true };
      })
    );

    socket.on(
      'room:start',
      handle(socket, () => {
        const session = requireSession(socket);
        const room = manager.startGame(session.code, session.playerId, createGame);
        broadcastRoom(room);
        return { ok: true };
      })
    );

    socket.on(
      'room:backToLobby',
      handle(socket, () => {
        const session = requireSession(socket);
        const room = manager.backToLobby(session.code, session.playerId);
        broadcastRoom(room);
        return { ok: true };
      })
    );

    // Spielaktionen (Fold, Check, Call, Bet/Raise, All-in) – siehe Schritt 2.
    socket.on(
      'game:action',
      handle(socket, ({ action, amount }) => {
        const session = requireSession(socket);
        const room = manager.getRoom(session.code);
        if (!room.game || room.status !== 'playing') {
          throw new LobbyError('NO_GAME', 'Es läuft gerade kein Spiel.');
        }
        room.game.act(session.playerId, action, amount);
        return { ok: true };
      })
    );

    socket.on('disconnect', () => unbindSocket(socket));
  });

  const timer = setInterval(() => {
    for (const room of manager.sweep()) broadcastRoom(room);
  }, SWEEP_INTERVAL_MS);
  timer.unref();

  return {
    broadcastRoom,
    close() {
      clearInterval(timer);
    },
  };
}

module.exports = { attachSockets };
