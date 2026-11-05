// Sudoku über echte Verbindungen: Computer im Raum mit eigenem Tempo, keine Ersatzzüge für getrennte Personen.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { makeClient, setupRoom, startTestServer, until, wait } from './helpers.js';

let server;
before(async () => (server = await startTestServer()));
after(async () => server.close());

describe('Sudoku im Raum', { timeout: 30000 }, () => {
  it('Computer füllt sein Gitter ohne Fehler und gewinnt, wenn niemand sonst spielt', async () => {
    const host = makeClient(server.port, 'Sudokuhost');
    await host.ready;
    try {
      const created = await host.emit('room:create', { gameId: 'sudoku', mode: '1v1', options: { size: 'mini', fast: true }, profile: host.profile });
      assert.equal(created.error, undefined);
      assert.equal((await host.emit('room:host', { type: 'fillBots', level: 'schwer' })).error, undefined);
      await until(() => host.room?.canStart);
      assert.equal((await host.emit('room:start')).error, undefined);
      await until(() => host.last?.result?.over, 10000);
      const { view, result } = host.last;
      const bot = view.sides.findIndex((_, i) => i !== view.mySide);
      assert.deepEqual(result.winners, view.sides[bot].members);
      assert.equal(result.reason, 'solved');
      assert.equal(view.sides[bot].filled, view.toFill);
      assert.equal(view.sides[bot].mistakes, 0);
      assert.equal(view.sides[view.mySide].filled, 0, 'für den Menschen hat niemand gezogen');
    } finally {
      host.close();
    }
  });

  it('Getrennte Personen bekommen keine Ersatzzüge – ihre Seite bleibt stehen', async () => {
    const { clients, host } = await setupRoom(server.port, 'sudoku', '1v1', 2, { size: 'mini', mistakes: 3 });
    try {
      assert.equal((await host.emit('room:start')).error, undefined);
      await until(() => clients.every((c) => c.last && !c.last.result?.over));
      clients[1].close();
      await wait(1500); // viel länger als die Wartezeit für Ersatzzüge im Test (200 ms)
      const cell = host.last.view.grid.findIndex((v) => !v);
      assert.equal((await host.emit('game:action', { action: { type: 'note', cell, value: 1 } })).error, undefined);
      await until(() => host.last.view.notes[cell] === 2);
      const other = host.last.view.sides[1 - host.last.view.mySide];
      assert.equal(other.filled + other.mistakes, 0);
      assert.equal(host.last.result.over, false);
    } finally {
      clients.forEach((c) => c.close());
    }
  });
});
