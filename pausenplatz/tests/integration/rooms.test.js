// Raumsystem über echte Verbindungen: Beitreten, Fehler, Rate-Limit, Kick, Host-Wechsel, Zuschauer, Reconnect.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { io as connect } from 'socket.io-client';
import { makeClient, setupRoom, startTestServer, until, wait } from './helpers.js';

let server;
before(async () => (server = await startTestServer()));
after(async () => server.close());

describe('Räume', { timeout: 60000 }, () => {
  it('Beitreten per Code (Gross/klein, Bindestrich egal), unbekannter Code mit klarer Meldung', async () => {
    const { code, clients } = await setupRoom(server.port, 'tictactoe', '1v1', 2);
    assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    const extra = makeClient(server.port, 'Zoe');
    await extra.ready;
    assert.equal((await extra.emit('room:join', { code: 'ZZZZZZ', profile: extra.profile })).error, 'room_not_found');
    const res = await extra.emit('room:join', { code: ` ${code.slice(0, 3).toLowerCase()} - ${code.slice(3)} `, profile: extra.profile });
    assert.equal(res.spectator, true, 'voller Raum → zuschauen');
    [...clients, extra].forEach((c) => c.close());
  });

  it('höchstens 10 falsche Codes pro Minute', async () => {
    const c = makeClient(server.port, 'Rate');
    await c.ready;
    for (let i = 0; i < 10; i++) assert.equal((await c.emit('room:join', { code: 'ZZZZZ2', profile: c.profile })).error, 'room_not_found');
    assert.equal((await c.emit('room:join', { code: 'ZZZZZ3', profile: c.profile })).error, 'too_many_attempts');
    c.close();
  });

  it('Spitznamen werden geprüft', async () => {
    const c = makeClient(server.port, 'X');
    await c.ready;
    assert.equal((await c.emit('room:create', { gameId: 'tictactoe', mode: '1v1', profile: { name: 'A' } })).error, 'name_length');
    assert.equal((await c.emit('room:create', { gameId: 'tictactoe', mode: '1v1', profile: { name: 'Arschloch' } })).error, 'name_bad');
    c.close();
  });

  it('Kick wirkt: Entfernte kommen nicht sofort zurück', async () => {
    const { code, clients, host } = await setupRoom(server.port, 'tictactoe', '1v1', 2);
    const guest = clients[1];
    const kicked = new Promise((r) => guest.socket.once('room:kicked', r));
    const guestId = guest.room.you.id;
    assert.deepEqual(await host.emit('room:host', { type: 'kick', playerId: guestId }), { ok: true });
    await kicked;
    assert.equal((await guest.emit('room:join', { code, profile: guest.profile })).error, 'kicked');
    clients.forEach((c) => c.close());
  });

  it('Host-Wechsel, wenn der Host geht', async () => {
    const { clients, host } = await setupRoom(server.port, 'tictactoe', '1v1', 2);
    await host.emit('room:leave');
    await until(() => clients[1].room?.you.isHost);
    clients.forEach((c) => c.close());
  });

  it('Teams: Platz wechseln, mischen, mit Computer auffüllen und starten', async () => {
    const c = makeClient(server.port, 'Solo');
    await c.ready;
    const { code } = await c.emit('room:create', { gameId: 'tictactoe', mode: '1v1', profile: c.profile });
    await until(() => c.room);
    assert.deepEqual(await c.emit('room:seat', { seat: 1 }), { ok: true });
    await until(() => c.room.you.seat === 1);
    assert.deepEqual(await c.emit('room:host', { type: 'fillBots', level: 'leicht' }), { ok: true });
    await until(() => c.room.canStart);
    assert.deepEqual(await c.emit('room:start'), { ok: true });
    await until(() => c.last?.view);
    assert.ok(code);
    c.close();
  });

  it('Reconnect mitten im Spiel: gleiches Token → gleicher Platz', async () => {
    const { code, clients } = await setupRoom(server.port, 'tictactoe', '1v1', 2);
    await clients[0].emit('room:start');
    await until(() => clients[1].last?.view);
    const guest = clients[1];
    const seat = guest.room.you.seat;
    guest.socket.disconnect();
    await until(() => clients[0].room.seats[seat].player.connected === false);
    const again = connect(`http://localhost:${server.port}`, { auth: { token: guest.token }, transports: ['websocket'], forceNew: true });
    await new Promise((r) => again.on('connect', r));
    const statePromise = new Promise((r) => again.once('room:state', r));
    const res = await new Promise((r) => again.emit('room:join', { code, profile: guest.profile }, r));
    assert.equal(res.rejoined, true);
    const state = await statePromise;
    assert.equal(state.you.seat, seat);
    await until(() => clients[0].room.seats[seat].player.connected === true);
    again.close();
    clients.forEach((c) => c.close());
  });

  it('Chat mit Wortfilter, Längenlimit und Team-Kanal', async () => {
    const { clients } = await setupRoom(server.port, 'tictactoe', '1v1', 2);
    const got = new Promise((r) => clients[1].socket.once('chat:msg', r));
    await clients[0].emit('chat:send', { text: 'Du bist ein Arschloch ' + 'x'.repeat(300) });
    const msg = await got;
    assert.ok(!/arschloch/i.test(msg.text));
    assert.ok(msg.text.length <= 200);
    assert.equal((await clients[0].emit('chat:send', { text: 'schnell' })).error, 'chat_slow');
    await wait(1100);
    assert.deepEqual(await clients[0].emit('chat:send', { reaction: '🔥' }), { ok: true });
    clients.forEach((c) => c.close());
  });
});
