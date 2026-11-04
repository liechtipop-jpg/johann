import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import slf from '../../shared/games/slf.js';
import { seededRng } from '../../shared/util/rng.js';

const group = ['a', 'b', 'c'].map((id) => ({ id, team: null }));
const answer = (s, id, category, text) => slf.applyAction(s, id, { type: 'answer', category, text }, { now: 1 });

describe('Stadt, Land, Fluss', () => {
  it('Antworten bleiben bis zur Abstimmung geheim; Stopp nur mit vollem Blatt', () => {
    const s = slf.setup(group, { mode: 'group', categories: ['stadt', 'tier'], now: 0 }, seededRng(1));
    s.letter = 'B';
    answer(s, 'a', 'stadt', 'Bern');
    assert.equal(slf.getView(s, 'b').board, null);
    assert.equal(JSON.stringify(slf.getView(s, 'b')).includes('Bern'), false);
    assert.equal(slf.getView(s, 'b').progress.a, 1);
    assert.equal(slf.applyAction(s, 'a', { type: 'stop' }).error, 'not_ready');
    answer(s, 'a', 'tier', 'Bär');
    slf.applyAction(s, 'a', { type: 'stop' }, { now: 2 });
    assert.equal(s.phase, 'stop');
    answer(s, 'b', 'stadt', 'basel');
    slf.tick(s, s.deadline);
    assert.equal(s.phase, 'vote');
  });

  it('Punkte: 20 als Einzige, 10 für eigene Antwort, 5 für doppelte; falscher Buchstabe zählt nicht', () => {
    const s = slf.setup(group, { mode: 'group', categories: ['stadt', 'tier', 'fluss'], now: 0 }, seededRng(2));
    s.letter = 'B';
    answer(s, 'a', 'stadt', 'Bern');
    answer(s, 'b', 'stadt', 'bern');
    answer(s, 'c', 'stadt', 'Basel');
    answer(s, 'a', 'tier', 'Bär');
    answer(s, 'b', 'tier', 'Löwe');
    answer(s, 'a', 'fluss', 'Birs');
    slf.tick(s, s.deadline);
    for (const id of ['a', 'b', 'c']) slf.applyAction(s, id, { type: 'done' }, { now: 5 });
    assert.equal(s.phase, 'result');
    assert.deepEqual(s.roundPoints.a, { stadt: 5, tier: 20, fluss: 20 });
    assert.deepEqual(s.roundPoints.b, { stadt: 5, tier: 0, fluss: 0 });
    assert.deepEqual(s.roundPoints.c, { stadt: 10, tier: 0, fluss: 0 });
  });

  it('Die Gruppe stimmt ab: mehr als die Hälfte Zweifel macht eine Antwort ungültig', () => {
    const s = slf.setup(group, { mode: 'group', categories: ['stadt'], now: 0 }, seededRng(3));
    s.letter = 'B';
    answer(s, 'a', 'stadt', 'Bananenstadt');
    answer(s, 'b', 'stadt', 'Biel');
    slf.tick(s, s.deadline);
    assert.equal(slf.applyAction(s, 'a', { type: 'doubt', answerId: 'a|stadt' }).error, 'invalid', 'nicht über die eigene Antwort');
    slf.applyAction(s, 'b', { type: 'doubt', answerId: 'a|stadt' }, { now: 3 });
    slf.applyAction(s, 'c', { type: 'doubt', answerId: 'a|stadt' }, { now: 3 });
    slf.tick(s, s.deadline);
    assert.equal(s.roundPoints.a.stadt, 0);
    assert.equal(s.roundPoints.b.stadt, 20);
  });

  it('Teams füllen gemeinsam ein Blatt; nach allen Runden gewinnt die höhere Summe', () => {
    const team = [{ id: 'r1', team: 'red' }, { id: 'b1', team: 'blue' }, { id: 'r2', team: 'red' }, { id: 'b2', team: 'blue' }];
    const s = slf.setup(team, { mode: '2v2', categories: ['tier'], rounds: 3, now: 0 }, seededRng(4));
    for (let r = 0; r < 3; r++) {
      answer(s, 'r2', 'tier', `${s.letter}uchs`);
      assert.equal(slf.getView(s, 'r1').mySheet.tier, `${s.letter}uchs`, 'Teamkollegen sehen das gemeinsame Blatt');
      slf.tick(s, s.deadline);
      slf.tick(s, s.deadline);
      slf.tick(s, s.deadline);
    }
    assert.deepEqual(slf.getResult(s).winners.sort(), ['r1', 'r2']);
  });
});
