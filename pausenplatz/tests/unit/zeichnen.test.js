import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import zr from '../../shared/games/zeichnen.js';
import { seededRng } from '../../shared/util/rng.js';

const group = ['a', 'b', 'c'].map((id) => ({ id, team: null }));

describe('Zeichnen & Raten', () => {
  it('Wortwahl nur für die zeichnende Person; Begriff bleibt geheim', () => {
    const s = zr.setup(group, { mode: 'group', now: 0 }, seededRng(1));
    const d = s.drawer;
    const other = s.guessers[0];
    assert.equal(zr.getView(s, other).choices, null);
    assert.equal(zr.getView(s, d).choices.length, 3);
    zr.applyAction(s, d, { type: 'choose', word: s.choices[1] }, { now: 0 });
    assert.equal(zr.getView(s, other).word, null);
    assert.equal(JSON.stringify(zr.getView(s, other)).includes(`"${s.word}"`), false);
    assert.equal(zr.getView(s, other).pattern.length, [...s.word].length);
  });

  it('Striche: live als Teilstücke, nur leichte Ereignisse, Grenzen werden geprüft', () => {
    const s = zr.setup(group, { mode: 'group', now: 0 }, seededRng(2));
    zr.applyAction(s, s.drawer, { type: 'choose', word: s.choices[0] }, { now: 0 });
    const r = zr.applyAction(s, s.drawer, { type: 'draw', sid: 1, points: [[1, 2], [3, 4]], color: '#ffffff', width: 8 });
    assert.equal(r.light, true);
    assert.deepEqual(r.events[0].notFor, [s.drawer]);
    zr.applyAction(s, s.drawer, { type: 'draw', sid: 1, points: [[5, 6]], color: '#ffffff', width: 8 });
    assert.equal(s.strokes.length, 1);
    assert.equal(s.strokes[0].points.length, 3, 'gleiche Strich-Nummer wird verlängert');
    assert.equal(zr.applyAction(s, s.drawer, { type: 'draw', sid: 2, points: [[5, 2000]], color: '#ffffff', width: 8 }).error, 'invalid');
    assert.equal(zr.applyAction(s, s.drawer, { type: 'draw', sid: 2, points: [[5, 5]], color: 'red', width: 8 }).error, 'invalid');
    assert.equal(zr.applyAction(s, s.guessers[0], { type: 'draw', sid: 3, points: [[5, 5]], color: '#ffffff', width: 8 }).error, 'not_your_turn');
    zr.applyAction(s, s.drawer, { type: 'undo' });
    assert.equal(s.strokes.length, 0);
  });

  it('Raten: tolerant, schneller gibt mehr Punkte, alle richtig beendet den Zug', () => {
    const s = zr.setup(group, { mode: 'group', seconds: 80, now: 0 }, seededRng(3));
    zr.applyAction(s, s.drawer, { type: 'choose', word: s.choices[0] }, { now: 0 });
    const [g1, g2] = s.guessers;
    zr.applyAction(s, g1, { type: 'guess', text: s.word.toUpperCase() }, { now: 8000 });
    zr.applyAction(s, g2, { type: 'guess', text: `die ${s.word}` }, { now: 60_000 });
    assert.equal(s.scores[g1], 2 + Math.round(8 * 0.9));
    assert.equal(s.scores[g2], 2 + Math.round(8 * 0.25));
    assert.equal(s.scores[s.drawer], 4);
    assert.equal(s.phase, 'reveal');
  });

  it('Buchstabentipps erscheinen mit der Zeit; Teams raten nur ihre eigene Zeichnung', () => {
    const s = zr.setup(group, { mode: 'group', difficulty: 'schwer', seconds: 60, now: 0 }, seededRng(4));
    zr.applyAction(s, s.drawer, { type: 'choose', word: s.choices[0] }, { now: 0 });
    zr.tick(s, 30_000);
    assert.equal(s.hints.length, 1);
    assert.equal(zr.getView(s, s.guessers[0]).pattern.filter((c) => c !== null).length >= 1, true);
    const team = [{ id: 'r1', team: 'red' }, { id: 'b1', team: 'blue' }, { id: 'r2', team: 'red' }, { id: 'b2', team: 'blue' }];
    const t = zr.setup(team, { mode: '2v2', now: 0 }, seededRng(5));
    assert.deepEqual(t.guessers.map((id) => t.teamOf[id]), [t.teamOf[t.drawer]]);
  });
});
