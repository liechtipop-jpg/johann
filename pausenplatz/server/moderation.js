// Wortfilter und Längenprüfung für Chat, Spitznamen und eigene Karten.
import { BAD_WORDS } from '../shared/content/schimpfwoerter.js';
import { config } from './config.js';

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '€': 'e', '!': 'i' };

function fold(text) {
  return String(text)
    .toLowerCase()
    .replace(/[013457@$€!]/g, (c) => LEET[c] ?? c)
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/(.)\1{2,}/g, '$1$1');
}

const patterns = BAD_WORDS.map((entry) => {
  const prefix = entry.endsWith('*');
  const word = fold(prefix ? entry.slice(0, -1) : entry).replace(/ /g, '[^a-z]*');
  return new RegExp(`(^|[^a-z])(${word}${prefix ? '[a-z]*' : ''})(?=$|[^a-z])`, 'g');
});

/** true, wenn der Text ein gesperrtes Wort enthält (auch getrennt geschrieben: «f u c k»). */
export function containsBadWord(text) {
  const folded = fold(text);
  const squeezed = folded.replace(/\b([a-z]) (?=[a-z]\b)/g, '$1');
  return patterns.some((re) => {
    re.lastIndex = 0;
    if (re.test(folded)) return true;
    re.lastIndex = 0;
    return re.test(squeezed);
  });
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
  return containsBadWord(out) ? out.replace(/\S+/g, (w) => (containsBadWord(w) ? '★★★' : w)) : out;
}

export function cleanText(value, max) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Prüft einen Spitznamen: 2–16 Zeichen, ohne gesperrte Wörter. */
export function checkName(value) {
  const name = cleanText(value, 40);
  if (name.length < config.limits.nameMin || name.length > config.limits.nameMax) return { error: 'name_length' };
  if (containsBadWord(name)) return { error: 'name_bad' };
  return { name };
}
