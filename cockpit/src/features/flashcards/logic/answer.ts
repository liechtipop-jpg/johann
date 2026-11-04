/**
 * Prüft eine eingetippte Antwort:
 * - Gross-/Kleinschreibung, Leerzeichen, Satzzeichen am Ende und Apostroph-Varianten sind egal.
 * - Alternativen mit «/», «;» oder «|» trennen; Teile in Klammern sind optional: «fatigué(e)», «(se) lever».
 * - Stimmt nur die Akzentsetzung nicht (é/è), gilt das als «fast richtig» mit Hinweis.
 */
export type AnswerVerdict =
  { result: 'correct' } | { result: 'almost'; hint: string; expected: string } | { result: 'wrong'; expected: string };

export function stripAccents(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .normalize('NFC');
}

export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘´`ʼ]/g, "'")
    .replace(/[«»“”„"]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s*'\s*/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\s+([?!:;.,])/g, '$1')
    .replace(/(\s*(\.\.\.|…|[.!?,;:]))+$/u, '')
    .trim();
}

/** Alle akzeptierten Schreibweisen einer Lösung. */
export function answerVariants(expected: string): string[] {
  const variants = new Set<string>();
  for (const part of expected.split(/\s*[/;|]\s*/)) {
    if (!part.trim()) continue;
    const without = part.replace(/\s*\([^)]*\)\s*/g, ' ');
    const withContent = part.replace(/[()]/g, '');
    for (const v of [part, without, withContent]) {
      const n = normalizeAnswer(v);
      if (n) variants.add(n);
    }
  }
  return [...variants];
}

/** Wörter der Lösung, bei denen die Akzente fehlen oder falsch sind. */
function accentWords(input: string, expected: string): string[] {
  const a = input.split(' ');
  const b = expected.split(' ');
  return b.filter((word, i) => a[i] !== undefined && a[i] !== word && stripAccents(a[i]) === stripAccents(word));
}

export function checkAnswer(input: string, expected: string): AnswerVerdict {
  const given = normalizeAnswer(input);
  const variants = answerVariants(expected);
  if (given && variants.includes(given)) return { result: 'correct' };
  const bare = stripAccents(given);
  const close = variants.find((v) => stripAccents(v) === bare);
  if (given && close) {
    const words = accentWords(given, close);
    return {
      result: 'almost',
      expected: close,
      hint: words.length ? `Achte auf die Akzente: ${words.map((w) => `«${w}»`).join(', ')}` : 'Achte auf die Akzente.',
    };
  }
  return { result: 'wrong', expected: expected.trim() };
}

/** Vorschlag für die Bewertung nach dem Eintippen. */
export function suggestedRating(verdict: AnswerVerdict): 1 | 2 | 3 {
  return verdict.result === 'correct' ? 3 : verdict.result === 'almost' ? 2 : 1;
}
