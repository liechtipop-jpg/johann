import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import ut from '../../shared/games/ultimate.js';
import ai from '../../shared/ai/ultimate.js';
import { seededRng } from '../../shared/util/rng.js';

const players = [{ id: 'a', team: 'red' }, { id: 'b', team: 'blue' }];
const act = (s, board, cell) => {
  const r = ut.applyAction(s, ut.toMove(s), { type: 'play', board, cell });
  assert.ok(!r.error, `${board}/${cell}: ${r.error}`);
};

describe('Ultimate Tic-Tac-Toe', () => {
  it('Der Zug schickt den Gegner ins passende kleine Feld', () => {
    const s = ut.setup(players, { firstTeam: 'red' });
    assert.equal(ut.getLegalActions(s, 'a').length, 81);
    act(s, 4, 2);
    assert.deepEqual([...new Set(ut.getLegalActions(s, 'b').map((a) => a.board))], [2]);
    assert.equal(ut.applyAction(s, 'b', { type: 'play', board: 5, cell: 0 }).error, 'wrong_board');
  });

  it('Kleines Feld gewinnen; ist das Zielfeld entschieden, darf man frei wählen', () => {
    const s = ut.setup(players, { firstTeam: 'red' });
    // b gewinnt Feld 0 mit den Zellen 3, 4, 5
    for (const [b, c] of [[0, 0], [0, 3], [3, 0], [0, 4], [4, 0], [0, 5]]) act(s, b, c);
    assert.equal(s.small[0], 1, 'b hat Feld 0 mit 3-4-5 gewonnen');
    act(s, 5, 0);
    assert.ok(new Set(ut.getLegalActions(s, ut.toMove(s)).map((a) => a.board)).size > 1, 'Feld 0 ist entschieden → freie Wahl');
  });

  it('Drei kleine Felder in einer Reihe gewinnen das Spiel', () => {
    const s = ut.setup(players, { firstTeam: 'red' });
    s.small = [0, 0, null, null, 1, null, null, null, null];
    s.cells.fill(0, 0, 18);
    s.cells[2 * 9 + 0] = 0;
    s.cells[2 * 9 + 1] = 0;
    s.forced = 2;
    act(s, 2, 2);
    assert.deepEqual(ut.getResult(s), { over: true, winners: ['a'], reason: 'line' });
  });

  it('KI (mittel) schlägt einen Zufallsspieler', () => {
    const rng = seededRng(3);
    let wins = 0;
    for (let g = 0; g < 4; g++) {
      const s = ut.setup(players, { firstTeam: g % 2 ? 'red' : 'blue' });
      while (!ut.getResult(s).over) {
        const id = ut.toMove(s);
        const legal = ut.getLegalActions(s, id);
        const a = id === 'a' ? ai.choose(ut.getView(s, id), legal, { level: 'mittel', rng, timeLimitMs: 60 }) : legal[rng.int(legal.length)];
        ut.applyAction(s, id, a);
      }
      if (ut.getResult(s).winners.includes('a')) wins++;
    }
    assert.ok(wins >= 3, `KI gewann nur ${wins} von 4`);
  });
});
