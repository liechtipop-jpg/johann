// Handbewertung Texas Hold'em: beste 5 aus 7 Karten, alle Kategorien inkl. A-2-3-4-5-Strasse, Kicker korrekt.
export const RANKS = '23456789TJQKA';
export const SUITS = 'shdc';
export const CATEGORY_NAMES = ['Höchste Karte', 'Paar', 'Zwei Paare', 'Drilling', 'Strasse', 'Flush', 'Full House', 'Vierling', 'Straight Flush', 'Royal Flush'];

export function newDeck() {
  return [...RANKS].flatMap((r) => [...SUITS].map((s) => r + s));
}
const rankOf = (card) => RANKS.indexOf(card[0]) + 2;

/** Bewertet genau 5 Karten → [Kategorie, Tiebreaker …] (lexikografisch vergleichbar). */
export function rank5(cards) {
  const ranks = cards.map(rankOf).sort((a, b) => b - a);
  const flush = cards.every((c) => c[1] === cards[0][1]);
  const unique = [...new Set(ranks)];
  let straightHigh = 0;
  if (unique.length === 5) {
    if (ranks[0] - ranks[4] === 4) straightHigh = ranks[0];
    else if (ranks.join() === '14,5,4,3,2') straightHigh = 5;
  }
  const counts = new Map();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const byGroup = groups.map(([r]) => r);
  if (straightHigh && flush) return [straightHigh === 14 ? 9 : 8, straightHigh];
  if (groups[0][1] === 4) return [7, ...byGroup];
  if (groups[0][1] === 3 && groups[1][1] === 2) return [6, ...byGroup];
  if (flush) return [5, ...ranks];
  if (straightHigh) return [4, straightHigh];
  if (groups[0][1] === 3) return [3, ...byGroup];
  if (groups[0][1] === 2 && groups[1][1] === 2) return [2, ...byGroup];
  if (groups[0][1] === 2) return [1, ...byGroup];
  return [0, ...ranks];
}

export function compare(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** Beste Hand aus 5–7 Karten: { score, cards, name }. Royal Flush zählt als Straight Flush. */
export function bestHand(cards) {
  let best = null;
  const n = cards.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
    const five = [cards[a], cards[b], cards[c], cards[d], cards[e]];
    const score = rank5(five);
    const cmpScore = score[0] === 9 ? [8, 14] : score;
    if (!best || compare(cmpScore, best.cmp) > 0) best = { score, cmp: cmpScore, cards: five };
  }
  return { score: best.cmp, cards: best.cards, name: CATEGORY_NAMES[best.score[0]] };
}

/**
 * Pots aus den Einsätzen der Hand: Haupt- und Side-Pots.
 * contributions: [{ id, amount, folded }] → [{ amount, eligible: [ids] }]
 */
export function buildPots(contributions) {
  const levels = [...new Set(contributions.filter((c) => !c.folded && c.amount > 0).map((c) => c.amount))].sort((a, b) => a - b);
  const pots = [];
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    for (const c of contributions) amount += Math.max(0, Math.min(c.amount, level) - prev);
    const eligible = contributions.filter((c) => !c.folded && c.amount >= level).map((c) => c.id);
    if (amount > 0) pots.push({ amount, eligible });
    prev = level;
  }
  // Einsätze über dem höchsten Level von Ausgestiegenen gehören in den letzten Pot
  const covered = pots.reduce((n, p) => n + p.amount, 0);
  const total = contributions.reduce((n, c) => n + c.amount, 0);
  if (pots.length && total > covered) pots[pots.length - 1].amount += total - covered;
  return pots;
}
