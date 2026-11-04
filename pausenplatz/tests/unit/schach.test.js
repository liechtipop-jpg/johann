import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import schach from '../../shared/games/schach.js';
import ai from '../../shared/ai/schach.js';
import { seededRng } from '../../shared/util/rng.js';

const two = [{ id: 'w', team: 'red' }, { id: 'b', team: 'blue' }];
function from(fen, opts = {}) {
  const s = schach.setup(two, { firstTeam: 'red', now: 0, ...opts });
  s.chess = new Chess(fen);
  return s;
}
const legal = (s, id) => schach.getLegalActions(s, id);
const play = (s, moves) => {
  for (const m of moves) {
    const id = schach.toMove(s);
    const [f, t, p] = [m.slice(0, 2), m.slice(2, 4), m[4]];
    const r = schach.applyAction(s, id, { type: 'move', from: f, to: t, promotion: p }, { now: 0 });
    assert.ok(!r.error, `${m}: ${r.error}`);
  }
  return s;
};

describe('Schach', () => {
  it('Rochade erlaubt – aber nicht im Schach, nicht über angegriffene Felder', () => {
    const okFen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    assert.ok(legal(from(okFen), 'w').some((a) => a.from === 'e1' && a.to === 'g1'));
    assert.ok(legal(from(okFen), 'w').some((a) => a.from === 'e1' && a.to === 'c1'));
    const inCheck = 'r3k2r/8/8/8/4r3/8/8/R3K2R w KQkq - 0 1';
    assert.ok(!legal(from(inCheck), 'w').some((a) => a.from === 'e1' && (a.to === 'g1' || a.to === 'c1')));
    const throughAttack = 'r3k2r/8/8/8/5r2/8/8/R3K2R w KQkq - 0 1';
    assert.ok(!legal(from(throughAttack), 'w').some((a) => a.from === 'e1' && a.to === 'g1'), 'f1 angegriffen');
  });

  it('en passant und Umwandlung mit Auswahl', () => {
    const s = play(from('rnbqkbnr/ppp1pppp/8/8/3pP3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 3'), []);
    assert.ok(legal(s, 'b').some((a) => a.from === 'd4' && a.to === 'e3'));
    const p = from('8/P6k/8/8/8/8/8/K7 w - - 0 1');
    const promos = legal(p, 'w').filter((a) => a.from === 'a7').map((a) => a.promotion).sort();
    assert.deepEqual(promos, ['b', 'n', 'q', 'r']);
    assert.equal(schach.applyAction(p, 'w', { type: 'move', from: 'a7', to: 'a8' }).error, 'invalid', 'ohne Auswahl');
    play(p, ['a7a8n']);
    assert.ok(p.chess.fen().startsWith('N7/'));
  });

  it('Matt und Patt', () => {
    const mate = play(from('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2'), ['d8h4']);
    assert.deepEqual(schach.getResult(mate), { over: true, winners: ['b'], reason: 'checkmate' });
    const stale = play(from('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'), ['f7g7'].slice(0, 0));
    play(stale, ['g6h6'].slice(0, 0));
    const st = play(from('k7/8/1Q6/8/8/8/8/7K w - - 0 1'), ['b6c7'].slice(0, 0));
    st.chess = new Chess('k7/8/2Q5/8/8/8/8/7K w - - 0 1');
    play(st, ['c6b6']);
    assert.equal(schach.getResult(st).reason, 'stalemate');
  });

  it('Remis: dreifache Wiederholung, 50-Züge-Regel, ungenügendes Material', () => {
    const rep = play(from('4k2r/8/8/8/8/8/8/R3K1N1 w - - 0 1'), ['g1f3', 'e8d8', 'f3g1', 'd8e8', 'g1f3', 'e8d8', 'f3g1', 'd8e8']);
    assert.equal(schach.getResult(rep).reason, 'threefold');
    const fifty = play(from('4k3/8/8/8/8/8/R7/4K3 w - - 99 80'), ['a2a3']);
    assert.equal(schach.getResult(fifty).reason, 'fifty');
    const mat = play(from('4k3/8/8/8/8/8/3r4/4K3 w - - 0 1'), ['e1d2']);
    assert.equal(schach.getResult(mat).reason, 'insufficient');
  });

  it('Zeit: Überschreitung verliert, ausser der Gegner kann nicht mattsetzen; Inkrement zählt', () => {
    const s = schach.setup(two, { firstTeam: 'red', time: '3+2', now: 0 });
    schach.applyAction(s, 'w', { type: 'move', from: 'e2', to: 'e4' }, { now: 10_000 });
    assert.equal(s.clock.left[0], 180_000 - 10_000 + 2000);
    assert.equal(schach.nextTick(s), 10_000 + 180_000);
    assert.equal(schach.tick(s, 100_000), null);
    schach.tick(s, 190_001);
    assert.deepEqual(schach.getResult(s), { over: true, winners: ['w'], reason: 'timeout' });
    const lone = from('4k3/8/8/8/8/8/8/4K2Q w - - 0 1', { time: '1+0' });
    lone.chess = new Chess('4k3/8/8/8/8/8/8/4K2Q b - - 0 1');
    schach.tick(lone, 61_000);
    assert.equal(schach.getResult(lone).reason, 'timeout', 'Weiss kann noch matt setzen');
    const draw = from('4k3/8/8/8/8/8/8/4KN2 b - - 0 1', { time: '1+0' });
    schach.tick(draw, 61_000);
    assert.equal(schach.getResult(draw).reason, 'timeoutDraw');
  });

  it('Staffel: Mehrheit im Team für Aufgabe; Teammitglieder ziehen reihum', () => {
    const four = [{ id: 'w1', team: 'red' }, { id: 'b1', team: 'blue' }, { id: 'w2', team: 'red' }, { id: 'b2', team: 'blue' }];
    const s = schach.setup(four, { firstTeam: 'red', now: 0 });
    schach.applyAction(s, 'w1', { type: 'move', from: 'e2', to: 'e4' });
    schach.applyAction(s, 'b1', { type: 'move', from: 'e7', to: 'e5' });
    assert.equal(schach.toMove(s), 'w2');
    schach.applyAction(s, 'b1', { type: 'resign' });
    assert.equal(schach.getResult(s).over, false, '1 von 2 reicht nicht');
    schach.applyAction(s, 'b2', { type: 'resign' });
    assert.deepEqual(schach.getResult(s).winners, ['w1', 'w2']);
  });

  it('KI findet ein Matt in einem Zug', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
    const c = new Chess(fen);
    const list = c.moves({ verbose: true }).map((m) => ({ type: 'move', from: m.from, to: m.to }));
    assert.deepEqual(ai.choose({ fen }, list, { level: 'mittel', rng: seededRng(1), timeLimitMs: 800, Chess }), { type: 'move', from: 'h5', to: 'f7' });
  });
});
