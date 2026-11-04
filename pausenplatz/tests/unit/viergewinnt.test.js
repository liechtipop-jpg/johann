import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import c4, { at } from '../../shared/games/viergewinnt.js';
import ai from '../../shared/ai/viergewinnt.js';
import { seededRng } from '../../shared/util/rng.js';

const players = [{ id: 'a', team: 'red' }, { id: 'b', team: 'blue' }];
const play = (s, moves) => {
  for (const col of moves) {
    const r = c4.applyAction(s, c4.toMove(s), { type: 'drop', col });
    assert.ok(!r.error, r.error);
  }
  return s;
};

describe('Vier gewinnt', () => {
  it('Steine fallen nach unten, volle Spalten und falscher Spieler werden abgelehnt', () => {
    const s = c4.setup(players, { firstTeam: 'red' });
    assert.equal(c4.applyAction(s, 'b', { type: 'drop', col: 0 }).error, 'not_your_turn');
    play(s, [2, 2, 2, 2, 2, 2]);
    assert.equal(s.board[at(0, 2)], 0);
    assert.equal(s.board[at(5, 2)], 1);
    assert.equal(c4.applyAction(s, 'a', { type: 'drop', col: 2 }).error, 'full');
    assert.equal(c4.getLegalActions(s, 'a').length, 6);
  });

  it('Sieg waagrecht, senkrecht und diagonal', () => {
    assert.equal(c4.getResult(play(c4.setup(players, { firstTeam: 'red' }), [0, 0, 1, 1, 2, 2, 3])).reason, 'line');
    assert.deepEqual(c4.getResult(play(c4.setup(players, { firstTeam: 'red' }), [4, 5, 4, 5, 4, 5, 4])).winners, ['a']);
    const d = play(c4.setup(players, { firstTeam: 'red' }), [0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]);
    assert.deepEqual(c4.getResult(d).winners, ['a'], 'Diagonale von unten links');
    assert.equal(d.win.line.length, 4);
  });

  it('Volles Brett ohne Reihe ist unentschieden', () => {
    const s = c4.setup(players, { firstTeam: 'red' });
    // Spaltenpaare im Muster füllen, sodass keine Viererreihe entsteht
    play(s, [0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 2, 3, 2, 3, 2, 3, 3, 2, 3, 2, 3, 2, 4, 5, 4, 5, 4, 5, 5, 4, 5, 4, 5, 4, 6, 6, 6, 6, 6, 6]);
    assert.deepEqual(c4.getResult(s), { over: true, winners: [], reason: 'full' });
  });

  it('Staffel: im Team ziehen die Mitglieder reihum', () => {
    const team = [{ id: 'a1', team: 'red' }, { id: 'b1', team: 'blue' }, { id: 'a2', team: 'red' }, { id: 'b2', team: 'blue' }];
    const s = play(c4.setup(team, { firstTeam: 'red' }), [3, 3]);
    assert.equal(c4.toMove(s), 'a2');
  });

  it('KI erkennt Sieg und Abwehr und schlägt den Zufall', () => {
    const s = play(c4.setup(players, { firstTeam: 'red' }), [0, 6, 1, 6, 2]);
    const legal = c4.getLegalActions(s, 'b');
    assert.equal(ai.choose(c4.getView(s, 'b'), legal, { level: 'mittel', rng: seededRng(1), timeLimitMs: 200 }).col, 3, 'muss blocken');
    const rng = seededRng(5);
    let wins = 0;
    for (let g = 0; g < 6; g++) {
      const st = c4.setup(players, { firstTeam: g % 2 ? 'red' : 'blue' });
      while (!c4.getResult(st).over) {
        const id = c4.toMove(st);
        const l = c4.getLegalActions(st, id);
        const a = id === 'a' ? ai.choose(c4.getView(st, id), l, { level: 'mittel', rng, timeLimitMs: 100 }) : l[rng.int(l.length)];
        c4.applyAction(st, id, a);
      }
      if (c4.getResult(st).winners.includes('a')) wins++;
    }
    assert.ok(wins >= 6, `KI gewann nur ${wins} von 6`);
  });
});
