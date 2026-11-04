import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import wr from '../../shared/games/wortraten.js';
import ai, { candidates } from '../../shared/ai/wortraten.js';
import { WORDS } from '../../shared/content/woerter.js';
import { seededRng } from '../../shared/util/rng.js';

const group = ['a', 'b', 'c'].map((id) => ({ id, team: null }));

describe('Wort-Raten', () => {
  it('Wortliste: mindestens 300 Begriffe in drei Stufen', () => {
    assert.ok(Object.values(WORDS).flat().length >= 300);
    assert.deepEqual(Object.keys(WORDS), ['leicht', 'mittel', 'schwer']);
  });

  it('Spieler gibt das Wort vor: geheim für die anderen, Treffer zählen, Fehler kosten Luft', () => {
    const s = wr.setup(group, { mode: 'group', source: 'spieler', lives: 6, now: 0 }, seededRng(1));
    const giver = s.giver;
    assert.equal(wr.applyAction(s, giver, { type: 'word', text: 'x1' }).error, 'word_invalid');
    wr.applyAction(s, giver, { type: 'word', text: 'Ballon' }, { now: 1 });
    const g = wr.current(s);
    assert.equal(wr.getView(s, g).secret, null);
    assert.equal(JSON.stringify(wr.getView(s, g)).includes('BALLON'), false);
    assert.equal(wr.getView(s, giver).secret, 'Ballon');
    wr.applyAction(s, g, { type: 'letter', letter: 'L' }, { now: 2 });
    assert.equal(s.scores[g], 2, 'zwei L');
    assert.deepEqual(wr.getView(s, g).pattern, [null, null, 'L', 'L', null, null]);
    const g2 = wr.current(s);
    assert.notEqual(g2, g, 'nach jedem Versuch ist die nächste Person dran');
    wr.applyAction(s, g2, { type: 'letter', letter: 'X' }, { now: 3 });
    assert.equal(s.misses, 1);
    wr.applyAction(s, wr.current(s), { type: 'solve', text: 'ballon' }, { now: 4 });
    assert.equal(s.phase, 'reveal');
    assert.equal(s.scores[s.solvedBy], (s.solvedBy === g ? 2 : 0) + 4 + 5, 'versteckte Buchstaben plus Lösebonus');
  });

  it('Ballon platzt nach zu vielen Fehlern; die vorgebende Person punktet', () => {
    const s = wr.setup(group, { mode: 'group', source: 'spieler', lives: 6, now: 0 }, seededRng(2));
    wr.applyAction(s, s.giver, { type: 'word', text: 'Igel' }, { now: 0 });
    for (const l of 'ABCDFH') wr.applyAction(s, wr.current(s), { type: 'letter', letter: l }, { now: 1 });
    assert.equal(s.popped, true);
    assert.equal(s.scores[s.giver], 5);
  });

  it('Teams: das andere Team rät das vorgegebene Wort', () => {
    const team = [{ id: 'r1', team: 'red' }, { id: 'b1', team: 'blue' }, { id: 'r2', team: 'red' }, { id: 'b2', team: 'blue' }];
    const s = wr.setup(team, { mode: '2v2', source: 'spieler', now: 0 }, seededRng(3));
    assert.ok(s.guessers.every((id) => s.teamOf[id] !== s.teamOf[s.giver]));
  });

  it('App wählt das Wort; Zeitablauf überspringt; KI (schwer) findet das Wort', () => {
    const s = wr.setup(group, { mode: 'group', source: 'app', difficulty: 'leicht', now: 0 }, seededRng(4));
    assert.equal(s.phase, 'guess');
    assert.equal(s.giver, null);
    const first = wr.current(s);
    wr.tick(s, s.deadline);
    assert.notEqual(wr.current(s), first);
    const rng = seededRng(5);
    for (let i = 0; i < 40 && s.phase === 'guess'; i++) {
      const id = wr.current(s);
      wr.applyAction(s, id, ai.choose(wr.getView(s, id), wr.getLegalActions(s, id), { level: 'schwer', rng }), { now: 10 });
    }
    assert.ok(s.solvedBy, 'gelöst');
    assert.ok(s.misses < s.lives);
    assert.ok(candidates([null, 'A', null, null], []).includes('HASE'));
  });
});
