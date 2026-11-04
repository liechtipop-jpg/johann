import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matches, normalize, levenshtein } from '../../shared/util/text.js';
import { censor, checkName, containsBadWord } from '../../server/moderation.js';

describe('Antwortvergleich', () => {
  it('Gross/klein, Umlaute, Artikel, Mehrzahl, Tippfehler ab 5 Buchstaben', () => {
    assert.ok(matches('die Tafel', 'Tafel'));
    assert.ok(matches('TÜR', 'tuer'));
    assert.ok(matches('Äpfel', 'Aepfel'));
    assert.ok(matches('Tafeln', 'Tafel'));
    assert.ok(matches('Hunde', 'Hund'));
    assert.ok(matches('Fenstern', 'Fenster'));
    assert.ok(matches('Bleistigt', 'Bleistift'));
    assert.ok(!matches('Bleistfit', 'Bleistift'), 'Vertauschung = Distanz 2');
    assert.ok(!matches('Hund', 'Hand'), 'unter 5 Buchstaben kein Tippfehler');
    assert.ok(!matches('Lampe', 'Tafel'));
    assert.equal(normalize('  Grüne Straße! '), 'gruene strasse');
    assert.equal(levenshtein('kitten', 'sitting'), 3);
  });
});

describe('Wortfilter', () => {
  it('erkennt Deutsch, Schweizerdeutsch, Englisch und Umgehungen, lässt Harmloses durch', () => {
    for (const bad of ['Arschloch', 'du huere siech', 'F u c k', 'sh1t', 'Schafseckel']) assert.ok(containsBadWord(bad), bad);
    for (const good of ['Marsch', 'sauber', 'Schiffe versenken', 'Barsch', 'Klassenzimmer', 'Dickicht']) assert.ok(!containsBadWord(good), good);
    assert.ok(!censor('So ein Scheiss').toLowerCase().includes('scheiss'));
    assert.equal(checkName('Mia').name, 'Mia');
    assert.equal(checkName('M').error, 'name_length');
  });
});
