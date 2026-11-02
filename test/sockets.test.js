'use strict';

// Ende-zu-Ende-Test: echter Server, echte Socket.IO-Verbindungen.

const test = require('node:test');
const assert = require('node:assert/strict');
const { io: connect } = require('socket.io-client');
const { createServer } = require('../server/index');

function startServer(options) {
  return new Promise((resolve) => {
    const ctx = createServer(options);
    ctx.server.listen(0, () => {
      ctx.url = `http://localhost:${ctx.server.address().port}`;
      resolve(ctx);
    });
  });
}

function stopServer(ctx) {
  ctx.sockets.close();
  return new Promise((resolve) => ctx.io.close(() => resolve()));
}

function client(ctx) {
  return new Promise((resolve, reject) => {
    const socket = connect(ctx.url, { transports: ['websocket'], forceNew: true, reconnection: false });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

function call(socket, event, payload = {}) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

function nextState(socket, predicate = () => true) {
  return new Promise((resolve) => {
    const handler = (state) => {
      if (predicate(state)) {
        socket.off('room:state', handler);
        resolve(state);
      }
    };
    socket.on('room:state', handler);
  });
}

test('Lobby über Socket.IO: erstellen, beitreten, Einstellungen, Start', async () => {
  const ctx = await startServer();
  const anna = await client(ctx);
  const ben = await client(ctx);
  try {
    const created = await call(anna, 'room:create', { name: 'Anna' });
    assert.equal(created.ok, true);
    assert.equal(created.code.length, 6);
    assert.equal(created.state.isHost, true);

    const annaSeesBen = nextState(anna, (s) => s.players.length === 2);
    const joined = await call(ben, 'room:join', { name: 'Ben', code: created.code });
    assert.equal(joined.ok, true);
    assert.equal(joined.state.isHost, false);
    const annaState = await annaSeesBen;
    assert.deepEqual(
      annaState.players.map((p) => p.name),
      ['Anna', 'Ben']
    );

    // Ben ist nicht Host.
    const denied = await call(ben, 'room:settings', {
      settings: { startingChips: 5000, buyIn: 0, smallBlind: 1, bigBlind: 2, turnTime: 0 },
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.code, 'NOT_HOST');

    const benSeesSettings = nextState(ben, (s) => s.settings.startingChips === 5000);
    const changed = await call(anna, 'room:settings', {
      settings: { startingChips: 5000, buyIn: 500, smallBlind: 25, bigBlind: 50, turnTime: 30 },
    });
    assert.equal(changed.ok, true);
    const benState = await benSeesSettings;
    assert.equal(benState.prizePool, 1000);

    const benSeesStart = nextState(ben, (s) => s.status === 'playing');
    assert.equal((await call(anna, 'room:start')).ok, true);
    await benSeesStart;

    // Nach dem Start kann niemand mehr beitreten.
    const carla = await client(ctx);
    const late = await call(carla, 'room:join', { name: 'Carla', code: created.code });
    assert.equal(late.code, 'GAME_RUNNING');
    carla.close();
  } finally {
    anna.close();
    ben.close();
    await stopServer(ctx);
  }
});

test('Neu laden: Spieler kommt mit Token an seinen Platz zurück', async () => {
  const ctx = await startServer();
  const anna = await client(ctx);
  let ben = await client(ctx);
  try {
    const created = await call(anna, 'room:create', { name: 'Anna' });
    const joined = await call(ben, 'room:join', { name: 'Ben', code: created.code });

    const annaSeesOffline = nextState(anna, (s) => s.players.some((p) => p.name === 'Ben' && !p.connected));
    ben.close();
    await annaSeesOffline;

    const annaSeesOnline = nextState(anna, (s) => s.players.some((p) => p.name === 'Ben' && p.connected));
    ben = await client(ctx);
    const resumed = await call(ben, 'room:resume', { code: created.code, token: joined.token });
    assert.equal(resumed.ok, true);
    assert.equal(resumed.playerId, joined.playerId);
    await annaSeesOnline;

    const bad = await call(ben, 'room:resume', { code: created.code, token: 'falsch' });
    assert.equal(bad.code, 'SESSION_EXPIRED');
  } finally {
    anna.close();
    ben.close();
    await stopServer(ctx);
  }
});

test('Zweiter Tab mit derselben Sitzung übernimmt den Platz', async () => {
  const ctx = await startServer();
  const tab1 = await client(ctx);
  const tab2 = await client(ctx);
  try {
    const created = await call(tab1, 'room:create', { name: 'Anna' });

    // Geerbte Sitzung (onlyIfOffline) darf nicht übernehmen.
    const inherited = await call(tab2, 'room:resume', {
      code: created.code,
      token: created.token,
      onlyIfOffline: true,
    });
    assert.equal(inherited.code, 'ALREADY_CONNECTED');

    const replaced = new Promise((resolve) => tab1.once('session:replaced', resolve));
    const takeover = await call(tab2, 'room:resume', { code: created.code, token: created.token });
    assert.equal(takeover.ok, true);
    await replaced;
  } finally {
    tab1.close();
    tab2.close();
    await stopServer(ctx);
  }
});

test('Host entfernt einen Spieler', async () => {
  const ctx = await startServer();
  const anna = await client(ctx);
  const ben = await client(ctx);
  try {
    const created = await call(anna, 'room:create', { name: 'Anna' });
    const joined = await call(ben, 'room:join', { name: 'Ben', code: created.code });
    const kicked = new Promise((resolve) => ben.once('room:kicked', resolve));
    assert.equal((await call(anna, 'room:kick', { playerId: joined.playerId })).ok, true);
    await kicked;
    const after = await call(ben, 'room:settings', { settings: {} });
    assert.equal(after.code, 'NO_SESSION');
  } finally {
    anna.close();
    ben.close();
    await stopServer(ctx);
  }
});

test('Health-Endpunkt antwortet', async () => {
  const ctx = await startServer();
  try {
    const res = await fetch(`${ctx.url}/health`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
  } finally {
    await stopServer(ctx);
  }
});
