import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CODE_ALPHABET, formatCode, isValidCode, normalizeCode, RoomManager } from '../../server/rooms.js';

const profile = (name) => ({ name, avatar: '🦊', color: '#5db4ff' });

describe('Raumcodes', () => {
  it('6 Zeichen ohne 0/O/1/I/L, eindeutig', () => {
    const m = new RoomManager();
    const codes = new Set();
    for (let i = 0; i < 2000; i++) {
      const code = m.generateCode();
      assert.ok(isValidCode(code));
      codes.add(code);
      m.rooms.set(code, {});
    }
    assert.equal(codes.size, 2000);
    assert.ok(!/[01OIL]/.test(CODE_ALPHABET));
    assert.equal(CODE_ALPHABET.length ** 6, 887503681);
    assert.equal(formatCode('K7M2QX'), 'K7M-2QX');
    assert.equal(normalizeCode(' k7m-2qx '), 'K7M2QX');
  });
});

describe('Räume und Teams', () => {
  it('Beitreten, Teams, Start-Prüfung, Host-Wechsel, Aufräumen', () => {
    const m = new RoomManager();
    const { room, player: host } = m.create({ gameId: 'tictactoe', mode: '1v1', token: 'tok-host-1234567890', profile: profile('Host') });
    assert.equal(room.seats.length, 2);
    assert.equal(m.startCheck(room).ok, false);
    const { player: guest } = m.join({ code: room.code, token: 'tok-guest-123456789', profile: profile('Gast') });
    assert.equal(m.seatOf(room, guest.id), 1);
    assert.equal(m.startCheck(room).missing[0].type, 'ready');
    m.setReady(room, guest.id, true);
    assert.equal(m.startCheck(room).ok, true);
    const spectator = m.join({ code: room.code, token: 'tok-spec-1234567890', profile: profile('Zuschauer') });
    assert.equal(spectator.spectator, true);
    m.removePlayer(room, host.id, 'left');
    assert.equal(room.hostId, guest.id);
    m.disconnect(room, guest.id);
    m.disconnect(room, spectator.player.id);
    m.sweep(Date.now() + 4 * 60_000);
    assert.equal(m.rooms.has(room.code), false);
  });

  it('Gruppe: Mindestzahl statt fester Plätze; Kick sperrt das Token', () => {
    const m = new RoomManager();
    const { room, player } = m.create({ gameId: 'tictactoe', mode: '1v1', token: 'tok-a-123456789012', profile: profile('Anna') });
    const b = m.join({ code: room.code, token: 'tok-b-123456789012', profile: profile('Ben') }).player;
    assert.deepEqual(m.hostCommand(room, player.id, { type: 'kick', playerId: b.id }), { ok: true });
    assert.equal(m.join({ code: room.code, token: 'tok-b-123456789012', profile: profile('Ben') }).error, 'kicked');
    assert.equal(m.hostCommand(room, b.id, { type: 'shuffle' }).error, 'not_host');
  });

  it('Entfernte kommen auch mit neuem Gerät unter gleichem Namen nicht zurück; abgeschlossener Raum', () => {
    const m = new RoomManager();
    const { room, player } = m.create({ gameId: 'tictactoe', mode: '1v1', token: 'tok-a-123456789012', profile: profile('Anna') });
    const b = m.join({ code: room.code, token: 'tok-b-123456789012', profile: profile('Ben') }).player;
    m.hostCommand(room, player.id, { type: 'kick', playerId: b.id });
    assert.equal(m.join({ code: room.code, token: 'tok-c-123456789012', profile: profile(' ben ') }).error, 'kicked');
    const c = m.join({ code: room.code, token: 'tok-d-123456789012', profile: profile('Cleo') }).player;
    assert.deepEqual(m.hostCommand(room, player.id, { type: 'lock', enabled: true }), { ok: true });
    assert.equal(m.publicRoom(room, player.id).locked, true);
    assert.equal(m.join({ code: room.code, token: 'tok-e-123456789012', profile: profile('Dana') }).error, 'room_locked');
    assert.equal(m.join({ code: room.code, token: 'tok-d-123456789012', profile: profile('Cleo') }).player.id, c.id, 'wer schon drin war, kommt zurück');
    assert.equal(m.hostCommand(room, c.id, { type: 'lock', enabled: false }).error, 'not_host');
  });

  it('Reconnect: dasselbe Token bekommt seinen Platz zurück', () => {
    const m = new RoomManager();
    const { room } = m.create({ gameId: 'tictactoe', mode: '1v1', token: 'tok-a-123456789012', profile: profile('Anna') });
    const b = m.join({ code: room.code, token: 'tok-b-123456789012', profile: profile('Ben') }).player;
    m.disconnect(room, b.id);
    const again = m.join({ code: room.code, token: 'tok-b-123456789012', profile: profile('Ben') });
    assert.equal(again.rejoined, true);
    assert.equal(again.player.id, b.id);
    assert.equal(m.seatOf(room, b.id), 1);
  });
});
