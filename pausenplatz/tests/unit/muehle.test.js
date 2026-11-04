import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import muehle, { ADJ, MILLS, removable } from '../../shared/games/muehle.js';
import ai from '../../shared/ai/muehle.js';
import { seededRng } from '../../shared/util/rng.js';

const players = [{ id: 'a', team: 'red' }, { id: 'b', team: 'blue' }];
const fresh = (opts = {}) => muehle.setup(players, { firstTeam: 'red', ...opts });
const act = (s, p, a) => {
  const r = muehle.applyAction(s, p, a);
  assert.ok(!r.error, `${JSON.stringify(a)}: ${r.error}`);
  return r.state;
};

describe('Mühle', () => {
  it('Brett: 24 Punkte, 16 Mühlen, symmetrische Nachbarn', () => {
    assert.equal(MILLS.length, 16);
    for (let i = 0; i < 24; i++) for (const j of ADJ[i]) assert.ok(ADJ[j].includes(i));
    assert.equal(ADJ.flat().length / 2, 32);
  });

  it('Mühle erkennen und einen Stein wegnehmen; geschützte Steine', () => {
    let s = fresh();
    s = act(s, 'a', { type: 'place', to: 0 });
    s = act(s, 'b', { type: 'place', to: 8 });
    s = act(s, 'a', { type: 'place', to: 1 });
    s = act(s, 'b', { type: 'place', to: 9 });
    s = act(s, 'a', { type: 'place', to: 2 });
    assert.equal(s.pendingRemove, true);
    assert.deepEqual(muehle.getLegalActions(s, 'a').map((x) => x.at).sort(), [8, 9]);
    assert.equal(muehle.getLegalActions(s, 'b').length, 0, 'b muss warten');
    s = act(s, 'a', { type: 'remove', at: 9 });
    assert.equal(s.onBoard[1], 1);
    // Steine in einer Mühle sind geschützt, solange es andere gibt
    const board = Array(24).fill(-1);
    [16, 17, 18, 20].forEach((i) => (board[i] = 1));
    assert.deepEqual(removable(board, 1), [20]);
    board[20] = -1;
    assert.deepEqual(removable(board, 1), [16, 17, 18], 'alle in Mühlen → alle entfernbar');
  });

  it('Doppelmühle bringt nur einen Stein', () => {
    const s = fresh();
    Object.assign(s, { inHand: [5, 5], onBoard: [4, 4], turn: 0 });
    [1, 2, 6, 7].forEach((i) => (s.board[i] = 0));
    [9, 11, 13, 15].forEach((i) => (s.board[i] = 1));
    let st = act(s, 'a', { type: 'place', to: 0 });
    assert.equal(st.pendingRemove, true);
    st = act(st, 'a', { type: 'remove', at: 9 });
    assert.equal(st.pendingRemove, false);
    assert.equal(st.turn, 1);
    assert.equal(st.onBoard[1], 3);
  });

  it('Springen mit drei Steinen (abschaltbar)', () => {
    for (const flying of [true, false]) {
      const s = fresh({ flying });
      Object.assign(s, { inHand: [0, 0], onBoard: [3, 4], turn: 0 });
      [0, 10, 21].forEach((i) => (s.board[i] = 0));
      [3, 5, 12, 14].forEach((i) => (s.board[i] = 1));
      const moves = muehle.getLegalActions(s, 'a');
      if (flying) assert.equal(moves.filter((m) => m.from === 0).length, 24 - 7);
      else assert.ok(moves.filter((m) => m.from === 0).length <= 2);
    }
  });

  it('Sieg durch Blockade und durch zwei verbleibende Steine', () => {
    const s = fresh();
    Object.assign(s, { inHand: [0, 0], onBoard: [5, 4], turn: 0 });
    // Dunkle Steine auf 1, 3, 5, 7 (Seitenmitten aussen) – blockiert durch helle auf 0, 2, 9, 11, 13, 15?
    [1, 3, 5, 7].forEach((i) => (s.board[i] = 1));
    [0, 2, 4, 6, 9, 11, 13, 15].forEach((i) => (s.board[i] = 0));
    s.onBoard = [8, 4];
    s.board[15] = -1;
    s.onBoard[0] = 7;
    // hell zieht 14 → 15? 14 ist leer; wir setzen einen Stein auf 14 und ziehen ihn nach 15
    s.board[14] = 0;
    s.onBoard[0] = 8;
    const st = act(s, 'a', { type: 'move', from: 14, to: 15 });
    assert.deepEqual(muehle.getResult(st), { over: true, winners: ['a'], reason: 'blocked' });
    const t = fresh();
    Object.assign(t, { inHand: [0, 0], onBoard: [3, 3], turn: 0, pendingRemove: true });
    [0, 1, 2].forEach((i) => (t.board[i] = 0));
    [10, 12, 20].forEach((i) => (t.board[i] = 1));
    const end = act(t, 'a', { type: 'remove', at: 10 });
    assert.equal(muehle.getResult(end).reason, 'stones');
  });

  it('KI (mittel) schlägt einen Zufallsspieler fast immer', () => {
    const rng = seededRng(11);
    let wins = 0;
    for (let g = 0; g < 6; g++) {
      let st = fresh({ firstTeam: g % 2 ? 'red' : 'blue' });
      for (let ply = 0; ply < 400 && !muehle.getResult(st).over; ply++) {
        const id = muehle.toMove(st);
        const legal = muehle.getLegalActions(st, id);
        const a = id === 'a' ? ai.choose(muehle.getView(st, id), legal, { level: 'mittel', rng, timeLimitMs: 150 }) : legal[rng.int(legal.length)];
        st = act(st, id, a);
      }
      if (muehle.getResult(st).winners.includes('a')) wins++;
    }
    assert.ok(wins >= 5, `KI gewann nur ${wins} von 6`);
  });
});
