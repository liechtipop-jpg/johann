// Jedes Spiel wird von simulierten Spielern in allen Raum-Modi mehrfach komplett durchgespielt.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { playRandom, setupRoom, startTestServer, until } from './helpers.js';
import { GAMES } from '../../shared/games/index.js';
import { TEAM_SIZES } from '../../shared/util/options.js';

let server;
before(async () => (server = await startTestServer()));
after(async () => server.close());

const TOTAL = Number(process.env.GAMES_PER_GAME ?? 50);

for (const game of GAMES.filter((g) => !process.env.GAME_FILTER || process.env.GAME_FILTER.split(',').includes(g.id))) {
  const modes = game.modes.filter((m) => ['1v1', '2v2', '3v3', 'group'].includes(m));
  describe(`${game.name}: ${TOTAL} Partien mit zufälligen Zügen`, { timeout: 600000 }, () => {
    modes.forEach((mode, index) => {
      const rounds = Math.ceil(TOTAL / modes.length) + (index === 0 ? TOTAL % modes.length : 0);
      it(`${mode}: ${rounds} Partien ohne Absturz und ohne Hänger`, async () => {
        const n = mode === 'group' ? Math.min(game.players.max, Math.max(game.players.min, game.testPlayers ?? 4)) : TEAM_SIZES[mode] * 2;
        const { clients, host } = await setupRoom(server.port, game.id, mode, n, game.testOptions ?? {});
        for (let r = 0; r < rounds; r++) {
          const res = r === 0 ? await host.emit('room:start') : await host.emit('room:rematch');
          assert.equal(res.error, undefined, res.error);
          await until(() => clients.every((c) => c.last && !c.last.result?.over));
          await playRandom(clients, { seed: r + 1 });
          assert.ok(clients.every((c) => c.last.result.over));
          await until(() => host.room?.phase === 'results');
        }
        clients.forEach((c) => c.close());
      });
    });
  });
}
