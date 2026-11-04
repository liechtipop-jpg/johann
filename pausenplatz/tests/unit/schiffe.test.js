import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import schiffe, { canPlace, LAYOUTS, randomPlacement, shipCells } from '../../shared/games/schiffe.js';
import ai from '../../shared/ai/schiffe.js';
import { seededRng } from '../../shared/util/rng.js';

const two = [{ id: 'a', team: 'red' }, { id: 'b', team: 'blue' }];
const act = (s, p, a) => {
  const r = schiffe.applyAction(s, p, a);
  assert.ok(!r.error, `${JSON.stringify(a)} → ${r.error}`);
  return r.state;
};
const ready = (s, ids) => ids.reduce((st, id) => act(act(st, id, { type: 'random' }), id, { type: 'ready' }), s);

describe('Schiffe versenken', () => {
  it('Platzierungsregeln: im Feld, keine Überlappung, Berühren nur erlaubt, wenn eingestellt', () => {
    const ships = [{ id: 0, len: 3, x: 2, y: 2, dir: 'h' }];
    assert.equal(canPlace(ships, { id: 1, len: 2, x: 9, y: 0, dir: 'h' }, 10, false), false, 'aus dem Feld');
    assert.equal(canPlace(ships, { id: 1, len: 2, x: 3, y: 1, dir: 'v' }, 10, false), false, 'überlappt');
    assert.equal(canPlace(ships, { id: 1, len: 2, x: 5, y: 3, dir: 'h' }, 10, false), false, 'berührt diagonal');
    assert.equal(canPlace(ships, { id: 1, len: 2, x: 5, y: 3, dir: 'h' }, 10, true), true, 'Berühren erlaubt');
    assert.equal(canPlace(ships, { id: 1, len: 2, x: 6, y: 2, dir: 'h' }, 10, false), true);
    const rng = seededRng(5);
    for (const mode of ['1v1', '2v2', '3v3']) {
      const { size, fleet } = LAYOUTS[mode];
      const placed = randomPlacement(fleet.map((len, id) => ({ id, len, x: null, y: null, dir: 'h' })), fleet.map((_, i) => i), size, false, rng);
      placed.forEach((ship) => assert.ok(canPlace(placed, ship, size, false)));
    }
  });

  it('Treffer, Versenkt, Sieg – und Positionen bleiben geheim', () => {
    let s = ready(schiffe.setup(two, { mode: '1v1', now: 0 }, seededRng(1)), ['a', 'b']);
    assert.equal(s.phase, 'battle');
    const viewB = schiffe.getView(s, 'b');
    assert.equal(viewB.enemySunk.length, 0);
    assert.ok(!JSON.stringify(viewB.enemyShots).includes('owner'));
    const targets = s.fleets[1].flatMap((ship) => shipCells(ship));
    const misses = [];
    for (let y = 0; y < 10 && misses.length < 20; y++) for (let x = 0; x < 10; x++) if (!targets.some(([a, b]) => a === x && b === y)) misses.push([x, y]);
    let m = 0;
    for (const [x, y] of targets) {
      s = act(s, 'a', { type: 'shoot', x, y });
      if (s.result) break;
      const [mx, my] = misses[m++];
      // b schiesst daneben (eigene Wahl irrelevant)
      const legal = schiffe.getLegalActions(s, 'b');
      s = act(s, 'b', legal.find((l) => l.x === mx && l.y === my) ?? legal[0]);
    }
    assert.deepEqual(schiffe.getResult(s), { over: true, winners: ['a'], reason: 'fleet' });
    assert.equal(schiffe.getView(s, 'b').enemySunk.length, 5, 'nach Spielende sichtbar');
  });

  it('Team-Flotte: gemeinsames Feld, Schiffe verteilt, reihum schiessen', () => {
    const four = [{ id: 'a1', team: 'red' }, { id: 'b1', team: 'blue' }, { id: 'a2', team: 'red' }, { id: 'b2', team: 'blue' }];
    let s = schiffe.setup(four, { mode: '2v2', now: 0 }, seededRng(2));
    assert.equal(s.size, 12);
    assert.deepEqual(s.fleets[0].map((x) => x.owner), ['a1', 'a2', 'a1', 'a2', 'a1', 'a2', 'a1']);
    s = ready(s, ['a1', 'a2', 'b1', 'b2']);
    const order = [];
    for (let i = 0; i < 6; i++) {
      const id = schiffe.toMove(s);
      order.push(id);
      const legal = schiffe.getLegalActions(s, id);
      s = act(s, id, legal[legal.length - 1 - i]);
    }
    assert.deepEqual(order.slice(0, 4).sort(), ['a1', 'a2', 'b1', 'b2']);
  });

  it('Nach 90 Sekunden wird automatisch platziert', () => {
    const s = schiffe.setup(two, { mode: '1v1', now: 1000 }, seededRng(3));
    assert.equal(schiffe.nextTick(s), 91000);
    assert.equal(schiffe.tick(s, 5000), null);
    const r = schiffe.tick(s, 91001);
    assert.equal(r.state.phase, 'battle');
    assert.ok(r.state.fleets.flat().every((x) => x.x !== null));
  });

  it('KI (schwer) braucht deutlich weniger Schüsse als Zufall', () => {
    const shotsNeeded = (level) => {
      const rng = seededRng(9);
      let total = 0;
      for (let g = 0; g < 5; g++) {
        let s = ready(schiffe.setup(two, { mode: '1v1', now: 0 }, seededRng(100 + g)), ['a', 'b']);
        let n = 0;
        while (!s.result) {
          const id = schiffe.toMove(s);
          const legal = schiffe.getLegalActions(s, id);
          const a = id === 'a' ? ai.choose(schiffe.getView(s, 'a'), legal, { level, rng }) : legal[0];
          if (id === 'a') n++;
          s = act(s, id, a);
          if (s.result) break;
        }
        total += n;
      }
      return total / 5;
    };
    assert.ok(shotsNeeded('schwer') < shotsNeeded('leicht') - 10);
  });
});
