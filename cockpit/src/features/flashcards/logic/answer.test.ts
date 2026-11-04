import { describe, expect, it } from 'vitest';
import { answerVariants, checkAnswer, normalizeAnswer, suggestedRating } from './answer';

describe('Antwort eintippen', () => {
  it('ist tolerant bei Gross-/Kleinschreibung, Leerzeichen und Satzzeichen', () => {
    expect(checkAnswer('  la Gare ', 'la gare')).toEqual({ result: 'correct' });
    expect(checkAnswer('ça va', 'Salut, ça va ?').result).toBe('wrong');
    expect(checkAnswer('salut, ça va', 'Salut, ça va ?')).toEqual({ result: 'correct' });
    expect(checkAnswer('j’ai faim', "J'ai faim.")).toEqual({ result: 'correct' });
    expect(normalizeAnswer('Je m’appelle …')).toBe("je m'appelle");
  });

  it('wertet reine Akzentfehler als «fast richtig» mit Hinweis', () => {
    const verdict = checkAnswer('le cafe', 'le café');
    expect(verdict).toEqual({ result: 'almost', expected: 'le café', hint: 'Achte auf die Akzente: «café»' });
    expect(checkAnswer('tres bien', 'très bien').result).toBe('almost');
    expect(checkAnswer('élève', 'élève').result).toBe('correct');
    expect(checkAnswer('éleve', 'élève').result).toBe('almost');
  });

  it('akzeptiert Alternativen und optionale Teile in Klammern', () => {
    expect(answerVariants('fatigué(e)')).toEqual(expect.arrayContaining(['fatigué', 'fatiguée']));
    expect(checkAnswer('fatiguée', 'Je suis fatigué(e).').result).toBe('wrong');
    expect(checkAnswer('je suis fatiguée', 'Je suis fatigué(e).')).toEqual({ result: 'correct' });
    expect(checkAnswer('à plus', 'À plus tard ! / À plus !')).toEqual({ result: 'correct' });
    expect(checkAnswer('lever', '(se) lever')).toEqual({ result: 'correct' });
    expect(checkAnswer('make money', 'make money; earn money')).toEqual({ result: 'correct' });
    expect(checkAnswer('earn money', 'make money; earn money')).toEqual({ result: 'correct' });
  });

  it('zeigt bei falschen Antworten die Lösung', () => {
    expect(checkAnswer('le train', 'la gare')).toEqual({ result: 'wrong', expected: 'la gare' });
    expect(checkAnswer('', 'la gare').result).toBe('wrong');
  });

  it('schlägt eine Bewertung vor', () => {
    expect(suggestedRating({ result: 'correct' })).toBe(3);
    expect(suggestedRating({ result: 'almost', hint: '', expected: '' })).toBe(2);
    expect(suggestedRating({ result: 'wrong', expected: '' })).toBe(1);
  });
});
