// Text-Normalisierung und tolerante Antwortprüfung (Ich sehe was, Zeichnen & Raten, Stadt-Land-Fluss).
const ARTICLES = new Set(['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines', 's', 'the', 'a', 'an']);

export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Ohne Artikel und grob ohne Mehrzahl-Endungen. */
export function canonical(text) {
  const words = normalize(text).split(' ').filter((w) => w && !ARTICLES.has(w));
  return words.map(stem).join(' ');
}

export function stem(word) {
  if (word.length <= 3) return word;
  for (const suffix of ['innen', 'nen', 'en', 'er', 'e', 'n', 's']) {
    if (word.length - suffix.length >= 3 && word.endsWith(suffix)) return word.slice(0, -suffix.length);
  }
  return word;
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Passt die Vermutung zum Begriff? Gross/klein egal, ä = ae, Artikel ignoriert,
 * Ein-/Mehrzahl grob gleich, ab 5 Buchstaben ein Tippfehler erlaubt.
 */
export function matches(guess, target) {
  const g = canonical(guess);
  const t = canonical(target);
  if (!g || !t) return false;
  if (g === t) return true;
  const plainT = normalize(target).split(' ').filter((w) => !ARTICLES.has(w)).join('');
  const plainG = normalize(guess).split(' ').filter((w) => !ARTICLES.has(w)).join('');
  if (plainG === plainT) return true;
  return plainT.length >= 5 && (levenshtein(plainG, plainT) <= 1 || levenshtein(g.replace(/ /g, ''), t.replace(/ /g, '')) <= 1);
}

export const firstLetter = (text) => normalize(text).replace(/ /g, '').charAt(0).toUpperCase();
