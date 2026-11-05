import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import sudoku, { SIZES, countSolutions, generate, geometry, solveLogic } from '../../shared/games/sudoku.js';
import ai from '../../shared/ai/sudoku.js';
import { seededRng } from '../../shared/util/rng.js';

const NOW = 1_000_000;
const valid = (grid, geo) => geo.units.every((u) => new Set(u.map((c) => grid[c])).size === geo.n && u.every((c) => grid[c] >= 1 && grid[c] <= geo.n));
const empties = (s, side = 0) => s.sides[side].grid.flatMap((v, i) => (v ? [] : [i]));
const wrongValue = (s, cell) => (s.solution[cell] % s.n) + 1;
const act = (s, id, action, now = NOW) => sudoku.applyAction(s, id, action, { now });
const start = (players, options = {}, seed = 1) => sudoku.setup(players, { now: NOW, ...options }, seededRng(seed));
const duo = [{ id: 'a', team: 'red' }, { id: 'b', team: 'blue' }];

describe('Sudoku: Rätsel', () => {
  for (const size of Object.keys(SIZES)) {
    for (const difficulty of ['leicht', 'mittel', 'schwer']) {
      it(`${size} ${difficulty}: gültige Lösung, genau eine Lösung, ohne Raten lösbar`, () => {
        const { n, br, bc } = SIZES[size];
        const geo = geometry(n, br, bc);
        for (let seed = 1; seed <= 8; seed++) {
          const { puzzle, solution, clues } = generate(size, difficulty, seededRng(seed));
          assert.ok(valid(solution, geo), 'Lösung erfüllt alle Regeln');
          assert.ok(puzzle.every((v, i) => v === 0 || v === solution[i]), 'Vorgaben passen zur Lösung');
          assert.equal(clues, puzzle.filter(Boolean).length);
          assert.equal(countSolutions(puzzle, geo, 2), 1, 'eindeutig');
          const logic = solveLogic(puzzle, geo, difficulty === 'schwer' ? 2 : 1);
          assert.ok(logic.solved, 'logisch lösbar');
          assert.deepEqual(logic.grid, solution);
        }
      });
    }
  }

  it('Schwierigkeit: weniger Vorgaben bei schwereren Rätseln', () => {
    const avg = (size, d) => Array.from({ length: 6 }, (_, i) => generate(size, d, seededRng(100 + i)).clues).reduce((a, b) => a + b) / 6;
    for (const size of ['klassisch', 'mini']) {
      assert.ok(avg(size, 'leicht') > avg(size, 'mittel'));
      assert.ok(avg(size, 'mittel') > avg(size, 'schwer'));
    }
  });
});

describe('Sudoku: Spiel', () => {
  it('Richtige Zahlen bleiben stehen, falsche zählen als Fehler und werden nur der eigenen Seite gezeigt', () => {
    const s = start(duo, { mode: '1v1', mistakes: 3 });
    const [c1, c2] = empties(s);
    const right = act(s, 'a', { type: 'set', cell: c1, value: s.solution[c1] });
    assert.equal(s.sides[0].grid[c1], s.solution[c1]);
    assert.deepEqual(right.events[0].onlyFor, ['a']);
    assert.equal(act(s, 'a', { type: 'set', cell: c1, value: s.solution[c1] }).error, 'occupied');
    const wrong = act(s, 'a', { type: 'set', cell: c2, value: wrongValue(s, c2) });
    assert.equal(wrong.events[0].type, 'wrong');
    assert.deepEqual(wrong.events[0].onlyFor, ['a']);
    assert.equal(s.sides[0].grid[c2], 0);
    assert.equal(s.sides[0].mistakes, 1);
    assert.equal(s.sides[1].grid[c1], 0, 'das andere Gitter bleibt unberührt');
    assert.equal(act(s, 'a', { type: 'set', cell: c2, value: 0 }).error, 'invalid');
    assert.equal(act(s, 'a', { type: 'set', cell: 999, value: 1 }).error, 'invalid');
    assert.equal(act(s, 'x', { type: 'set', cell: c2, value: 1 }).error, 'spectator');
  });

  it('Fremde Zahlen und die Lösung bleiben geheim', () => {
    const s = start(duo, { mode: '1v1' });
    const cell = empties(s)[0];
    act(s, 'a', { type: 'set', cell, value: s.solution[cell] });
    const forB = sudoku.getView(s, 'b');
    assert.equal(forB.grid[cell], 0);
    assert.equal(forB.sides[0].filled, 1, 'nur der Fortschritt ist sichtbar');
    assert.equal(forB.solution, null);
    const forSpectator = sudoku.getView(s, null);
    assert.deepEqual(forSpectator.grid, s.givens);
    assert.equal(forSpectator.notes, null);
    assert.deepEqual(sudoku.getLegalActions(s, null), []);
    assert.ok(!JSON.stringify(forB).includes(JSON.stringify(s.solution)));
  });

  it('Notizen: umschalten, löschen und automatisch aufräumen', () => {
    const s = start([{ id: 'a' }], { size: 'mini' });
    const geo = geometry(6, 2, 3);
    const cell = empties(s)[0];
    const value = s.solution[cell];
    const peer = geo.peers[cell].find((p) => !s.givens[p]);
    act(s, 'a', { type: 'note', cell: peer, value });
    act(s, 'a', { type: 'note', cell: peer, value: wrongValue(s, cell) });
    assert.equal(s.sides[0].notes[peer], (1 << value) | (1 << wrongValue(s, cell)));
    act(s, 'a', { type: 'set', cell, value });
    assert.equal(s.sides[0].notes[peer], 1 << wrongValue(s, cell), 'die gesetzte Zahl verschwindet aus den Notizen der Nachbarn');
    assert.equal(act(s, 'a', { type: 'note', cell, value: 1 }).error, 'occupied');
    assert.ok(!act(s, 'a', { type: 'erase', cell: peer }).error);
    assert.equal(s.sides[0].notes[peer], 0);
    assert.equal(act(s, 'a', { type: 'erase', cell: peer }).error, 'invalid');
  });

  it('1 gegen 1: Wer zuerst fertig ist, gewinnt – mit Zeit', () => {
    const s = start(duo, { mode: '1v1', size: 'mini' });
    const cells = empties(s);
    act(s, 'b', { type: 'set', cell: cells[0], value: s.solution[cells[0]] });
    cells.forEach((cell, i) => act(s, 'a', { type: 'set', cell, value: s.solution[cell] }, NOW + 1000 * (i + 1)));
    assert.deepEqual(sudoku.getResult(s), { over: true, winners: ['a'], reason: 'solved' });
    assert.equal(s.sides[0].finishedAt - s.startedAt, 1000 * cells.length);
    assert.equal(s.endedAt, s.sides[0].finishedAt);
    assert.deepEqual(sudoku.getView(s, 'b').solution, s.solution, 'am Ende gibt es die Lösung');
    assert.equal(act(s, 'b', { type: 'set', cell: cells[1], value: s.solution[cells[1]] }).error, 'game_over');
  });

  it('Zu viele Fehler: Wer übrig bleibt, gewinnt', () => {
    const s = start(duo, { mode: '1v1', mistakes: 3 });
    const cell = empties(s)[0];
    for (let i = 0; i < 3; i++) act(s, 'b', { type: 'set', cell, value: wrongValue(s, cell) });
    assert.ok(s.sides[1].out);
    assert.deepEqual(sudoku.getResult(s), { over: true, winners: ['a'], reason: 'last' });
  });

  it('2 gegen 2: Das Team teilt ein Gitter, Notizen und Fehler', () => {
    const players = [{ id: 'a', team: 'red' }, { id: 'b', team: 'blue' }, { id: 'c', team: 'red' }, { id: 'd', team: 'blue' }];
    const s = start(players, { mode: '2v2', firstTeam: 'red', mistakes: 3 });
    assert.deepEqual(s.sides.map((x) => x.members), [['a', 'c'], ['b', 'd']]);
    const [c1, c2] = empties(s);
    act(s, 'a', { type: 'set', cell: c1, value: s.solution[c1] });
    act(s, 'c', { type: 'note', cell: c2, value: 1 });
    const forC = sudoku.getView(s, 'c');
    assert.equal(forC.grid[c1], s.solution[c1], 'Teamkollegin sieht die Zahl');
    assert.equal(forC.notes[c2], 1 << 1);
    assert.equal(act(s, 'c', { type: 'set', cell: c1, value: s.solution[c1] }).error, 'occupied');
    act(s, 'a', { type: 'set', cell: c2, value: wrongValue(s, c2) });
    act(s, 'c', { type: 'set', cell: c2, value: wrongValue(s, c2) });
    assert.equal(s.sides[0].mistakes, 2);
    const res = act(s, 'c', { type: 'set', cell: c2, value: wrongValue(s, c2) });
    assert.ok(res.events.some((e) => e.type === 'out' && e.side === 0));
    assert.deepEqual(sudoku.getResult(s), { over: true, winners: ['b', 'd'], reason: 'last' });
  });

  it('Gruppe: jede Person für sich, das Spiel läuft weiter, bis eine fertig ist oder nur noch eine übrig bleibt', () => {
    const players = ['a', 'b', 'c'].map((id) => ({ id, team: null }));
    const s = start(players, { mode: 'group', mistakes: 3 });
    assert.equal(s.sides.length, 3);
    const cell = empties(s)[0];
    for (let i = 0; i < 3; i++) act(s, 'a', { type: 'set', cell, value: wrongValue(s, cell) });
    assert.equal(sudoku.getResult(s).over, false);
    assert.equal(act(s, 'a', { type: 'set', cell, value: s.solution[cell] }).error, 'out');
    assert.deepEqual(sudoku.getLegalActions(s, 'a'), []);
    for (let i = 0; i < 3; i++) act(s, 'b', { type: 'set', cell, value: wrongValue(s, cell) });
    assert.deepEqual(sudoku.getResult(s), { over: true, winners: ['c'], reason: 'last' });
  });

  it('Allein: drei Tipps, verloren erst bei zu vielen Fehlern', () => {
    const s = start([{ id: 'a' }], { mistakes: 3 });
    const view = sudoku.getView(s, 'a');
    assert.equal(view.solo, true);
    assert.equal(view.hintsLeft, 3);
    const chosen = empties(s)[5];
    const res = act(s, 'a', { type: 'hint', cell: chosen });
    assert.equal(res.events[0].type, 'hint');
    assert.equal(s.sides[0].grid[chosen], s.solution[chosen], 'Tipp deckt das gewählte Feld auf');
    act(s, 'a', { type: 'hint' });
    act(s, 'a', { type: 'hint' });
    assert.equal(s.sides[0].filled, 3);
    assert.equal(act(s, 'a', { type: 'hint' }).error, 'no_hints');
    assert.ok(!sudoku.getLegalActions(s, 'a').some((x) => x.type === 'hint'));
    const cell = empties(s)[0];
    for (let i = 0; i < 3; i++) act(s, 'a', { type: 'set', cell, value: wrongValue(s, cell) });
    assert.deepEqual(sudoku.getResult(s), { over: true, winners: [], reason: 'mistakes', lost: true });
  });

  it('Im Wettrennen gibt es keine Tipps', () => {
    const s = start(duo, { mode: '1v1' });
    assert.equal(sudoku.getView(s, 'a').hintsLeft, 0);
    assert.equal(act(s, 'a', { type: 'hint' }).error, 'no_hints');
  });

  it('Computer: zieht erst, wenn er so weit ist, setzt nur richtige Zahlen und hält das Tempo', () => {
    const players = [{ id: 'me', team: 'red' }, { id: 'cpu', team: 'blue', isBot: true, botLevel: 'schwer' }];
    const s = start(players, { mode: 'ai', size: 'mini' });
    const at = sudoku.nextTick(s);
    assert.ok(at > NOW, 'erst nach einer Denkpause');
    assert.deepEqual(sudoku.getLegalActions(s, 'cpu'), []);
    assert.equal(sudoku.tick(s, at - 1), null);
    assert.ok(sudoku.tick(s, at));
    const legal = sudoku.getLegalActions(s, 'cpu');
    assert.deepEqual(legal, [{ type: 'bot' }]);
    assert.equal(act(s, 'me', { type: 'bot' }).error, 'invalid', 'Menschen dürfen den Computerzug nicht auslösen');
    const res = act(s, 'cpu', ai.choose(sudoku.getView(s, 'cpu'), legal), at);
    const placed = res.events.find((e) => e.type === 'placed');
    assert.equal(s.sides[1].grid[placed.cell], s.solution[placed.cell]);
    assert.deepEqual(sudoku.getLegalActions(s, 'cpu'), []);
    assert.ok(sudoku.nextTick(s) > at);
    assert.equal(act(s, 'cpu', { type: 'set', cell: 0, value: 1 }).error, 'invalid');
    // Bis zum Ende: der Computer macht keinen Fehler und gewinnt allein
    let now = at;
    for (let guard = 0; guard < 100 && !sudoku.getResult(s).over; guard++) {
      now = sudoku.nextTick(s);
      sudoku.tick(s, now);
      act(s, 'cpu', { type: 'bot' }, now);
    }
    assert.deepEqual(sudoku.getResult(s), { over: true, winners: ['cpu'], reason: 'solved' });
    assert.equal(s.sides[1].mistakes, 0);
    assert.deepEqual(s.sides[1].grid, s.solution);
    const perCell = (now - NOW) / s.toFill / 1000;
    assert.ok(perCell > 1.5 && perCell < 8, `Tempo ${perCell.toFixed(1)} s pro Feld`);
  });

  it('Stärke bestimmt das Tempo des Computers', () => {
    const total = (level) => {
      const s = start([{ id: 'me', team: 'red' }, { id: 'cpu', team: 'blue', isBot: true, botLevel: level }], { mode: 'ai' }, 7);
      let now = NOW;
      while (!sudoku.getResult(s).over) {
        now = sudoku.nextTick(s);
        sudoku.tick(s, now);
        act(s, 'cpu', { type: 'bot' }, now);
      }
      return now - NOW;
    };
    assert.ok(total('leicht') > total('mittel'));
    assert.ok(total('mittel') > total('schwer'));
  });

  it('Logik-Löser: Schwere Rätsel brauchen meist mehr als Singles, lösbar bleiben sie immer', () => {
    const geo = geometry();
    let harder = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const { puzzle } = generate('klassisch', 'schwer', seededRng(seed));
      const full = solveLogic(puzzle, geo, 2);
      assert.ok(full.solved);
      assert.ok(full.steps.every((x) => x.round >= 0 && ['naked', 'hidden'].includes(x.how)));
      if (!solveLogic(puzzle, geo, 1).solved) harder++;
    }
    assert.ok(harder >= 3, `${harder} von 10 brauchen Streichregeln`);
  });
});
