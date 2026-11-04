import { describe, expect, it } from 'vitest';
import { detectDelimiter, looksLikeHeader, parseDelimited, rowsToCards } from './csv';

describe('CSV-Import', () => {
  it('liest den Quizlet-Export (Tab, neue Zeile)', () => {
    const text = 'la gare\tder Bahnhof\nle billet\tdie Fahrkarte\n';
    expect(detectDelimiter(text)).toBe('\t');
    expect(parseDelimited(text, '\t')).toEqual([
      ['la gare', 'der Bahnhof'],
      ['le billet', 'die Fahrkarte'],
    ]);
  });

  it('erkennt Semikolon und Komma', () => {
    expect(detectDelimiter('a;b\nc;d')).toBe(';');
    expect(detectDelimiter('a,b\nc,d')).toBe(',');
  });

  it('unterstützt Anführungszeichen mit Trennzeichen, Zeilenumbrüchen und "" darin', () => {
    const rows = parseDelimited('"Salut, ça va ?","Hallo, wie geht\'s?"\r\n"Er sagt ""Hallo""","mehrere\nZeilen"', ',');
    expect(rows).toEqual([
      ['Salut, ça va ?', "Hallo, wie geht's?"],
      ['Er sagt "Hallo"', 'mehrere\nZeilen'],
    ]);
  });

  it('kennt Semikolon als Trennung zwischen Karten (Quizlet-Option)', () => {
    expect(parseDelimited('a,b;c,d;', ',', ';')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('erkennt Kopfzeilen und überspringt unvollständige Zeilen', () => {
    const rows = parseDelimited('Vorderseite;Rückseite;Beispiel\nla plage;der Strand;On va à la plage.\nnur vorne;\n', ';');
    expect(looksLikeHeader(rows[0])).toBe(true);
    expect(looksLikeHeader(rows[1])).toBe(false);
    expect(rowsToCards(rows, { front: 0, back: 1, example: 2 }, true)).toEqual({
      cards: [{ front: 'la plage', back: 'der Strand', example: 'On va à la plage.' }],
      skipped: 1,
    });
  });

  it('entfernt ein BOM am Anfang', () => {
    expect(parseDelimited('\uFEFFa\tb', '\t')).toEqual([['a', 'b']]);
  });
});
