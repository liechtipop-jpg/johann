// KI Mühle: Minimax mit Alpha-Beta und iterativer Vertiefung (Zeitlimit).
// Bewertung: Steine, Mühlen, offene Mühlen, Beweglichkeit, blockierte Steine.
import { ADJ, MILLS, MILLS_AT } from '../games/muehle.js';

const DEPTH = { leicht: 1, mittel: 3, schwer: 7 };

function inMill(b, i) {
  return MILLS_AT[i].some((m) => m.every((p) => b[p] === b[i]));
}
function removable(b, victim) {
  const stones = [];
  const free = [];
  for (let i = 0; i < 24; i++) if (b[i] === victim) (stones.push(i), !inMill(b, i) && free.push(i));
  return free.length ? free : stones;
}
function moves(s, side) {
  const out = [];
  if (s.hand[side] > 0) {
    for (let i = 0; i < 24; i++) if (s.b[i] === -1) out.push([-1, i]);
    return out;
  }
  const fly = s.flying && s.on[side] === 3;
  for (let f = 0; f < 24; f++) {
    if (s.b[f] !== side) continue;
    if (fly) for (let t = 0; t < 24; t++) s.b[t] === -1 && out.push([f, t]);
    else for (const t of ADJ[f]) s.b[t] === -1 && out.push([f, t]);
  }
  return out;
}

function evaluate(s, me) {
  const opp = 1 - me;
  const total = (x) => s.on[x] + s.hand[x];
  if (total(opp) < 3) return 10000;
  if (total(me) < 3) return -10000;
  let score = (total(me) - total(opp)) * 120;
  for (const m of MILLS) {
    let mine = 0, theirs = 0, empty = 0;
    for (const p of m) s.b[p] === me ? mine++ : s.b[p] === opp ? theirs++ : empty++;
    if (mine === 3) score += 30;
    if (theirs === 3) score -= 30;
    if (mine === 2 && empty === 1) score += 18;
    if (theirs === 2 && empty === 1) score -= 22;
  }
  if (s.hand[me] === 0 && s.hand[opp] === 0) {
    const mm = moves(s, me).length;
    const om = moves(s, opp).length;
    if (om === 0) return 9000;
    if (mm === 0) return -9000;
    score += (mm - om) * 4;
  }
  return score;
}

export default {
  choose(view, legal, { level = 'mittel', rng, timeLimitMs = 900 }) {
    if (legal.length === 1) return legal[0];
    const me = view.turn;
    const s = { b: [...view.board], hand: [...view.inHand], on: [...view.onBoard], flying: view.flying };
    const deadline = Date.now() + timeLimitMs;
    let stop = false;
    const search = (side, depth, alpha, beta, pending) => {
      if (Date.now() > deadline) stop = true;
      if (stop) return 0;
      const total = (x) => s.on[x] + s.hand[x];
      if (total(0) < 3 || total(1) < 3 || depth === 0) return evaluate(s, me);
      const maximizing = side === me;
      let best = maximizing ? -Infinity : Infinity;
      if (pending) {
        for (const at of removable(s.b, 1 - side)) {
          s.b[at] = -1;
          s.on[1 - side]--;
          const v = search(1 - side, depth - 1, alpha, beta, false);
          s.b[at] = 1 - side;
          s.on[1 - side]++;
          if (maximizing ? v > best : v < best) best = v;
          if (maximizing) alpha = Math.max(alpha, v);
          else beta = Math.min(beta, v);
          if (beta <= alpha) break;
        }
        return best;
      }
      const list = moves(s, side);
      if (!list.length) return side === me ? -9000 : 9000;
      for (const [f, t] of list) {
        if (f === -1) (s.hand[side]--, s.on[side]++);
        else s.b[f] = -1;
        s.b[t] = side;
        const mill = inMill(s.b, t);
        const v = mill ? search(side, depth, alpha, beta, true) : search(1 - side, depth - 1, alpha, beta, false);
        s.b[t] = -1;
        if (f === -1) (s.hand[side]++, s.on[side]--);
        else s.b[f] = side;
        if (maximizing ? v > best : v < best) best = v;
        if (maximizing) alpha = Math.max(alpha, v);
        else beta = Math.min(beta, v);
        if (beta <= alpha) break;
      }
      return best;
    };
    const scoreAction = (a, depth) => {
      if (a.type === 'remove') {
        s.b[a.at] = -1;
        s.on[1 - me]--;
        const v = search(1 - me, depth - 1, -Infinity, Infinity, false);
        s.b[a.at] = 1 - me;
        s.on[1 - me]++;
        return v;
      }
      const f = a.type === 'place' ? -1 : a.from;
      if (f === -1) (s.hand[me]--, s.on[me]++);
      else s.b[f] = -1;
      s.b[a.to] = me;
      const v = inMill(s.b, a.to) ? search(me, depth, -Infinity, Infinity, true) : search(1 - me, depth - 1, -Infinity, Infinity, false);
      s.b[a.to] = -1;
      if (f === -1) (s.hand[me]++, s.on[me]--);
      else s.b[f] = me;
      return v;
    };
    let best = legal[rng.int(legal.length)];
    const maxDepth = DEPTH[level] ?? 3;
    for (let depth = 1; depth <= maxDepth && !stop; depth++) {
      let bestHere = null;
      let bestScore = -Infinity;
      for (const a of legal) {
        const v = scoreAction(a, depth) + rng.float() * (level === 'leicht' ? 60 : 2);
        if (stop) break;
        if (v > bestScore) [bestHere, bestScore] = [a, v];
      }
      if (!stop && bestHere) best = bestHere;
    }
    return best;
  },
};
