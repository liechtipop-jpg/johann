// KI Wort-Raten: schwer = sucht passende Wörter in der Wortliste und wählt den häufigsten Buchstaben; mittel = Buchstabenhäufigkeit; leicht = oft zufällig.
import { LETTERS, toLetters } from '../games/wortraten.js';
import { WORDS } from '../content/woerter.js';

const FREQ = [...'ENISRATDHULCGMOBWFKZPVÜÄÖJYXQ'];
const ALL = [...new Set(Object.values(WORDS).flat().map(toLetters))];

export function candidates(pattern, guessed) {
  return ALL.filter((w) => w.length === pattern.length && [...w].every((ch, i) => (pattern[i] === null ? LETTERS.includes(ch) && !guessed.includes(ch) : pattern[i] === ch)));
}

export default {
  choose(view, legal, { level = 'mittel', rng }) {
    if (legal[0]?.type === 'word') {
      const list = WORDS.mittel;
      return { type: 'word', text: list[rng.int(list.length)] };
    }
    const open = legal.find((a) => a.type === 'letter')?.letterChoices ?? [];
    if (!open.length) return { type: 'solve', text: 'Ballon' };
    if (level === 'leicht' && rng.float() < 0.4) return { type: 'letter', letter: open[rng.int(open.length)] };
    if (level === 'schwer' && view.pattern) {
      const list = candidates(view.pattern, view.guessed);
      if (list.length === 1 && view.pattern.some((ch) => ch === null)) return { type: 'solve', text: list[0] };
      if (list.length) {
        const count = {};
        for (const w of list) for (const ch of new Set([...w].filter((c, i) => view.pattern[i] === null))) count[ch] = (count[ch] ?? 0) + 1;
        const best = open.filter((l) => count[l]).sort((a, b) => count[b] - count[a])[0];
        if (best) return { type: 'letter', letter: best };
      }
    }
    if (level === 'mittel' && rng.float() < 0.15) return { type: 'letter', letter: open[rng.int(open.length)] };
    return { type: 'letter', letter: FREQ.find((l) => open.includes(l)) ?? open[0] };
  },
};
