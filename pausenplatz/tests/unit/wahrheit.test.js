import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import wahrheit, { pickNext } from '../../shared/games/wahrheit.js';
import { CATEGORIES } from '../../shared/content/wahrheit-karten.js';
import { containsBadWord } from '../../shared/util/badwords.js';
import { seededRng } from '../../shared/util/rng.js';

const players = ['a', 'b', 'c', 'd'].map((id) => ({ id, team: null }));

describe('Wahrheit oder Tat', () => {
  it('Kartenkatalog: je Kategorie 40 Wahrheiten und 40 Aufgaben, verschieden, ohne ß und ohne gesperrte Wörter', () => {
    const all = [];
    for (const cat of Object.values(CATEGORIES)) {
      assert.ok(cat.truth.length >= 40 && cat.dare.length >= 40);
      all.push(...cat.truth, ...cat.dare);
    }
    assert.equal(new Set(all.map((c) => c.text)).size, all.length);
    for (const c of all) assert.ok(!c.text.includes('ß') && !containsBadWord(c.text), c.text);
  });

  it('faire Auswahl: nie zweimal hintereinander, alle gleich oft', () => {
    const rng = seededRng(4);
    const turns = {};
    let prev = null;
    const seq = [];
    for (let i = 0; i < 40; i++) {
      const id = pickNext(players, turns, prev, rng);
      assert.notEqual(id, prev);
      turns[id] = (turns[id] ?? 0) + 1;
      seq.push(id);
      prev = id;
    }
    assert.deepEqual(Object.values(turns), [10, 10, 10, 10]);
  });

  it('Abstimmung (Mehrheit, Gleichstand = geschafft) und Joker', () => {
    const s = wahrheit.setup(players, { categories: ['leise'], rounds: 1, now: 0 }, seededRng(2));
    wahrheit.tick(s, 10_000);
    assert.equal(s.phase, 'choose');
    const cur = s.current;
    wahrheit.applyAction(s, cur, { type: 'choose', choice: 'dare' }, { now: 10_000 });
    const first = s.card.text;
    wahrheit.applyAction(s, cur, { type: 'joker' }, { now: 11_000 });
    assert.notEqual(s.card.text, first);
    assert.equal(s.jokers[cur], 1);
    wahrheit.applyAction(s, cur, { type: 'done' }, { now: 12_000 });
    const voters = wahrheit.voters(s);
    wahrheit.applyAction(s, voters[0], { type: 'vote', passed: true });
    wahrheit.applyAction(s, voters[1], { type: 'vote', passed: false });
    assert.equal(wahrheit.applyAction(s, cur, { type: 'vote', passed: true }).error, 'invalid', 'nicht über sich selbst');
    wahrheit.applyAction(s, voters[2], { type: 'vote', passed: false });
    assert.equal(s.scores[cur], 0, '1 von 3 → nicht geschafft');
  });

  it('Antworten laufen durch den Wortfilter; Partie endet mit Punkten', () => {
    const s = wahrheit.setup(players.slice(0, 2), { categories: ['kopfnuss'], rounds: 1, now: 0 }, seededRng(3));
    let now = 0;
    for (let guard = 0; guard < 50 && !s.result; guard++) {
      now += 100_000;
      if (s.phase === 'task') wahrheit.applyAction(s, s.current, { type: 'answer', text: 'So ein Scheiss, 42' }, { now });
      else if (s.phase === 'vote') wahrheit.applyAction(s, wahrheit.voters(s)[0], { type: 'vote', passed: true }, { now });
      else wahrheit.tick(s, now);
      if (s.answer) assert.ok(!/scheiss/i.test(s.answer));
    }
    assert.ok(s.result);
    assert.equal(Object.values(s.scores).reduce((a, b) => a + b, 0) > 0, true);
  });
});
