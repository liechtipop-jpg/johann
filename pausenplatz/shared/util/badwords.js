// Wortfilter (rein, ohne Node/Browser-Abhängigkeit) – für Chat, Namen, eigene Karten und Antworten.
import { BAD_WORDS } from '../content/schimpfwoerter.js';

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '€': 'e', '!': 'i' };

function fold(text) {
  return String(text)
    .toLowerCase()
    .replace(/[013457@$€!]/g, (c) => LEET[c] ?? c)
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[_.\-*+~|/\\]/g, ' ')
    .replace(/(.)\1{2,}/g, '$1$1');
}

/** Doppelte Buchstaben zusammenziehen («scheeeisse» → «scheise»), damit Strecken nicht am Filter vorbeikommen. */
const collapse = (text) => text.replace(/([a-z])\1+/g, '$1');

const toPattern = (entry, squash) => {
  const prefix = entry.endsWith('*');
  let word = fold(prefix ? entry.slice(0, -1) : entry);
  if (squash) {
    const short = collapse(word);
    // Würde das Zusammenziehen den Wortstamm stark kürzen («titt» → «tit»), träfe es harmlose Wörter wie «Titel»
    if (short !== word && short.length < 5) return null;
    word = short;
  }
  return new RegExp(`(^|[^a-z])(${word.replace(/ /g, '[^a-z]*')}${prefix ? '[a-z]*' : ''})(?=$|[^a-z])`, 'g');
};
const patterns = BAD_WORDS.map((entry) => toPattern(entry, false));
const collapsedPatterns = BAD_WORDS.map((entry) => toPattern(entry, true)).filter(Boolean);
const hit = (list, text) => list.some((re) => {
  re.lastIndex = 0;
  return re.test(text);
});

/** true, wenn der Text ein gesperrtes Wort enthält – auch getrennt («f u c k», «s.c.h.e.i.s.s.e»), gestreckt oder mit Ziffern. */
export function containsBadWord(text) {
  const folded = fold(text);
  const squeezed = folded.replace(/\b([a-z])\s+(?=[a-z]\b)/g, '$1');
  return hit(patterns, folded) || hit(patterns, squeezed) || hit(collapsedPatterns, collapse(folded)) || hit(collapsedPatterns, collapse(squeezed));
}

/** Ersetzt gesperrte Wörter durch Sterne (Chat). */
export function censor(text) {
  let out = String(text);
  const folded = fold(out);
  if (folded.length !== out.length) return containsBadWord(out) ? out.replace(/\S+/g, (w) => (containsBadWord(w) ? '★'.repeat(Math.min(5, w.length)) : w)) : out;
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(folded))) {
      const start = m.index + m[1].length;
      out = out.slice(0, start) + '★'.repeat(m[2].length) + out.slice(start + m[2].length);
    }
  }
  if (!containsBadWord(out)) return out;
  out = out.replace(/\S+/g, (w) => (containsBadWord(w) ? '★★★' : w));
  // Über mehrere Wörter verteilt (z. B. «f u c k»): dann die ganze Nachricht ausblenden
  return containsBadWord(out) ? '★★★★★' : out;
}

