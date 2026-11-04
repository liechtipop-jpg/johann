// Poker-Bots: Handstärke per Monte-Carlo-Simulation, Pot-Odds und drei Spielstile mit gelegentlichem Bluff.
import { bestHand, compare, newDeck } from '../games/pokerHands.js';

const STYLES = {
  vorsichtig: { raise: 0.72, call: 0.07, bluff: 0.03, size: 0.5 },
  ausgewogen: { raise: 0.62, call: 0, bluff: 0.07, size: 0.75 },
  aggressiv: { raise: 0.52, call: -0.06, bluff: 0.14, size: 1 },
};
const ITER = { leicht: 120, mittel: 400, schwer: 900 };

export function styleOf(id = '') {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Object.keys(STYLES)[h % 3];
}

/** Gewinnwahrscheinlichkeit gegen n zufällige Gegnerhände. */
export function equity(hole, board, opponents, iterations, rng) {
  const known = new Set([...hole, ...board]);
  const rest = newDeck().filter((c) => !known.has(c));
  let score = 0;
  for (let i = 0; i < iterations; i++) {
    const deck = [...rest];
    const draw = () => deck.splice(rng.int(deck.length), 1)[0];
    const opp = Array.from({ length: opponents }, () => [draw(), draw()]);
    const full = [...board];
    while (full.length < 5) full.push(draw());
    const mine = bestHand([...hole, ...full]).score;
    let better = false;
    let ties = 0;
    for (const o of opp) {
      const c = compare(bestHand([...o, ...full]).score, mine);
      if (c > 0) {
        better = true;
        break;
      }
      if (c === 0) ties++;
    }
    if (!better) score += 1 / (ties + 1);
  }
  return score / iterations;
}

export default {
  choose(view, legal, { level = 'mittel', rng, playerId }) {
    if (legal.length === 1) return legal[0];
    const style = STYLES[styleOf(playerId)];
    const opponents = Math.max(1, view.players.filter((p) => p.id !== playerId && p.hasCards).length);
    const eq = equity(view.hole, view.board, opponents, ITER[level] ?? 400, rng);
    const has = (type) => legal.find((a) => a.type === type);
    const potOdds = view.toCall / (view.pot + view.toCall || 1);
    const bluff = rng.float() < style.bluff;
    const raise = has('raise');
    if ((eq > style.raise || bluff) && (raise || has('allin'))) {
      if (eq > 0.86 && rng.float() < 0.25 && has('allin')) return { type: 'allin' };
      if (raise) {
        const target = view.currentBet + Math.round(view.pot * style.size * (0.6 + rng.float() * 0.6));
        return { type: 'raise', amount: Math.max(raise.amount.min, Math.min(raise.amount.max, target)) };
      }
    }
    if (has('check')) return { type: 'check' };
    if (eq >= potOdds + style.call || (level === 'leicht' && rng.float() < 0.25)) return has('call') ?? { type: 'allin' };
    return { type: 'fold' };
  },
};
