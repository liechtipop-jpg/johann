import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import ttt from '../../shared/games/tictactoe.js';
import ai from '../../shared/ai/tictactoe.js';
import { seededRng } from '../../shared/util/rng.js';

const players = [{ id: 'a', team: 'red' }, { id: 'b', team: 'blue' }];

describe('Tic-Tac-Toe', () => {
  it('Reihe gewinnt, falscher Spieler und besetzte Felder werden abgelehnt', () => {
    let s = ttt.setup(players, { firstTeam: 'red' });
    assert.equal(ttt.applyAction(s, 'b', { type: 'place', cell: 0 }).error, 'not_your_turn');
    for (const [p, c] of [['a', 0], ['b', 3], ['a', 1], ['b', 4]]) s = ttt.applyAction(s, p, { type: 'place', cell: c }).state;
    assert.equal(ttt.applyAction(s, 'a', { type: 'place', cell: 0 }).error, 'occupied');
    s = ttt.applyAction(s, 'a', { type: 'place', cell: 2 }).state;
    assert.deepEqual(ttt.getResult(s), { over: true, winners: ['a'], reason: 'line' });
  });

  it('Staffel: Teammitglieder ziehen reihum', () => {
    const team = [{ id: 'a1', team: 'red' }, { id: 'b1', team: 'blue' }, { id: 'a2', team: 'red' }, { id: 'b2', team: 'blue' }];
    let s = ttt.setup(team, { firstTeam: 'red' });
    s = ttt.applyAction(s, 'a1', { type: 'place', cell: 0 }).state;
    s = ttt.applyAction(s, 'b1', { type: 'place', cell: 1 }).state;
    assert.equal(ttt.getLegalActions(s, 'a1').length, 0);
    assert.ok(ttt.getLegalActions(s, 'a2').length > 0);
  });

  it('Schwere KI verliert nie gegen Zufall', () => {
    const rng = seededRng(7);
    for (let g = 0; g < 30; g++) {
      let s = ttt.setup(players, { firstTeam: g % 2 ? 'red' : 'blue' });
      while (!ttt.getResult(s).over) {
        const id = ttt.toMove(s);
        const legal = ttt.getLegalActions(s, id);
        const action = id === 'a' ? ai.choose(ttt.getView(s, id), legal, { level: 'schwer', rng }) : legal[rng.int(legal.length)];
        s = ttt.applyAction(s, id, action).state;
      }
      assert.notDeepEqual(ttt.getResult(s).winners, ['b']);
    }
  });
});
