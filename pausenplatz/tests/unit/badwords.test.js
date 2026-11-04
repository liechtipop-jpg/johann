import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { censor, containsBadWord } from '../../shared/util/badwords.js';
import { WORDS } from '../../shared/content/woerter.js';

describe('Wortfilter', () => {
  it('erkennt Tarnungen: Abstände, Punkte, Striche, Ziffern, gestreckte Buchstaben', () => {
    for (const text of ['s.c.h.e.i.s.s.e', 'f-u-c-k', 'f_u_c_k', 'scheeeeisse', 'sch31sse', 'A r s c h', 'aaarsch', 'du Hurensohn']) assert.ok(containsBadWord(text), text);
  });

  it('lässt harmlose Wörter durch (auch alle Spielbegriffe)', () => {
    for (const text of ['sauber', 'Kasse', 'Assel', 'Schifffahrt', 'Klassenarbeit', 'Dickicht', 'Mississippi', 'Titel', 'Figur', 'Passwort', 'Hallo.Du', ...Object.values(WORDS).flat()]) assert.ok(!containsBadWord(text), text);
  });

  it('zensiert im Chat Wörter, und verteilte Schimpfwörter blenden die Nachricht aus', () => {
    assert.equal(censor('du arsch'), 'du ★★★★★');
    assert.equal(censor('Kasse und Assel'), 'Kasse und Assel');
    assert.equal(censor('Hallo s c h e i s s e Leute'), '★★★★★');
  });
});
