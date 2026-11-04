import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import ssp from '../../shared/games/ssp.js';
import ai from '../../shared/ai/ssp.js';
import { seededRng } from '../../shared/util/rng.js';

const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, team: null }));

describe('Schere, Stein, Papier', () => {
  it('Best of 3: Wahl bleibt geheim, Gleichstand zählt nicht, zwei Siege gewinnen', () => {
    const s = ssp.setup(mk(2), { bestOf: 3, now: 0 }, seededRng(1));
    const { a, b } = s.rounds[0][0];
    ssp.applyAction(s, a, { type: 'pick', choice: 'stein' }, { now: 1 });
    assert.equal(ssp.getView(s, b).rounds[0][0].mine, null);
    assert.equal(JSON.stringify(ssp.getView(s, b)).includes('stein'), false, 'Gegner sieht die Wahl nicht');
    assert.equal(ssp.applyAction(s, a, { type: 'pick', choice: 'papier' }).error, 'already');
    ssp.applyAction(s, b, { type: 'pick', choice: 'stein' }, { now: 2 });
    assert.deepEqual(s.rounds[0][0].wins, [0, 0], 'Gleichstand');
    for (const [x, y] of [['papier', 'stein'], ['schere', 'papier']]) {
      ssp.applyAction(s, a, { type: 'pick', choice: x }, { now: 3 });
      ssp.applyAction(s, b, { type: 'pick', choice: y }, { now: 3 });
    }
    assert.deepEqual(ssp.getResult(s), { over: true, winners: [a], reason: 'match' });
  });

  it('Turnier mit 5 Personen: Freilose in Runde 1, danach volle Runden bis zum Sieger', () => {
    const s = ssp.setup(mk(5), { bestOf: 3, now: 0 }, seededRng(2));
    assert.equal(s.size, 8);
    assert.equal(s.rounds[0].filter((m) => m.b === null).length, 3);
    let guard = 0;
    while (!s.champion && guard++ < 200) {
      for (const m of s.rounds.at(-1).filter((x) => !x.winner)) {
        ssp.applyAction(s, m.a, { type: 'pick', choice: 'stein' }, { now: 5 });
        ssp.applyAction(s, m.b, { type: 'pick', choice: 'schere' }, { now: 5 });
      }
    }
    assert.equal(s.rounds.length, 3);
    assert.ok(s.champion);
    assert.equal(ssp.getResult(s).reason, 'tournament');
  });

  it('Zeitablauf wählt zufällig für Zögernde', () => {
    const s = ssp.setup(mk(2), { bestOf: 5, now: 0 }, seededRng(3));
    assert.equal(ssp.nextTick(s), 20_000);
    ssp.tick(s, 20_001);
    assert.equal(s.rounds[0][0].throws.length, 1);
  });

  it('KI (schwer) nutzt ein festes Muster aus', () => {
    const s = ssp.setup(mk(2), { bestOf: 5, now: 0 }, seededRng(4));
    const m = s.rounds[0][0];
    m.throws = Array.from({ length: 8 }, () => ({ a: 'stein', b: 'stein', winner: null }));
    const rng = seededRng(9);
    let counters = 0;
    for (let i = 0; i < 40; i++) if (ai.choose(ssp.getView(s, m.b), ssp.getLegalActions(s, m.b), { level: 'schwer', rng, playerId: m.b }).choice === 'papier') counters++;
    assert.ok(counters >= 28, `nur ${counters}/40 Konter`);
  });
});
