// KI Ultimate Tic-Tac-Toe: Monte-Carlo-Baumsuche (UCT) mit Zufallspartien, begrenzt durch die Bedenkzeit.
import { LINES } from '../games/tictactoe.js';

const LINES_AT = Array.from({ length: 9 }, (_, i) => LINES.filter((l) => l.includes(i)));

function fromView(view) {
  const cells = new Int8Array(81).map((_, i) => (view.cells[i] === null ? -1 : view.cells[i]));
  const small = new Int8Array(9).map((_, b) => (view.small[b] === null ? -1 : view.small[b] === 'draw' ? 2 : view.small[b]));
  const forced = view.open.length === 1 && small.filter((v) => v === -1).length > 1 ? view.open[0] : -1;
  return { cells, small, forced, turn: view.turn, winner: -1 };
}
const clone = (s) => ({ cells: s.cells.slice(), small: s.small.slice(), forced: s.forced, turn: s.turn, winner: s.winner });

function moves(s) {
  const out = [];
  const one = s.forced >= 0 && s.small[s.forced] === -1;
  for (let b = 0; b < 9; b++) {
    if ((one && b !== s.forced) || s.small[b] !== -1) continue;
    for (let c = 0; c < 9; c++) if (s.cells[b * 9 + c] === -1) out.push(b * 9 + c);
  }
  return out;
}

function apply(s, m) {
  const b = (m / 9) | 0;
  const c = m % 9;
  const me = s.turn;
  s.cells[m] = me;
  if (LINES_AT[c].some((l) => l.every((i) => s.cells[b * 9 + i] === me))) {
    s.small[b] = me;
    if (LINES_AT[b].some((l) => l.every((i) => s.small[i] === me))) s.winner = me;
  } else {
    let full = true;
    for (let i = 0; i < 9; i++) if (s.cells[b * 9 + i] === -1) full = false;
    if (full) s.small[b] = 2;
  }
  if (s.winner === -1 && s.small.every((v) => v !== -1)) s.winner = 2;
  s.forced = s.small[c] === -1 ? c : -1;
  s.turn = 1 - me;
}

export function search(view, timeLimitMs, seed) {
  let x = seed | 1;
  const rand = (n) => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) % n;
  };
  const start = fromView(view);
  const root = { parent: null, move: -1, player: 1 - start.turn, children: [], untried: moves(start), visits: 0, wins: 0 };
  const deadline = Date.now() + timeLimitMs;
  let iterations = 0;
  while ((iterations & 63) !== 0 || Date.now() < deadline) {
    iterations++;
    let node = root;
    const s = clone(start);
    while (!node.untried.length && node.children.length) {
      const logN = Math.log(node.visits);
      let best = null;
      let bestScore = -Infinity;
      for (const ch of node.children) {
        const score = ch.wins / ch.visits + 1.3 * Math.sqrt(logN / ch.visits);
        if (score > bestScore) [best, bestScore] = [ch, score];
      }
      node = best;
      apply(s, node.move);
    }
    if (node.untried.length && s.winner === -1) {
      const m = node.untried.splice(rand(node.untried.length), 1)[0];
      apply(s, m);
      const child = { parent: node, move: m, player: 1 - s.turn, children: [], untried: s.winner === -1 ? moves(s) : [], visits: 0, wins: 0 };
      node.children.push(child);
      node = child;
    }
    while (s.winner === -1) {
      const ms = moves(s);
      apply(s, ms[rand(ms.length)]);
    }
    for (let n = node; n; n = n.parent) {
      n.visits++;
      if (s.winner === n.player) n.wins += 1;
      else if (s.winner === 2) n.wins += 0.5;
    }
    if (iterations > 400000) break;
  }
  return root.children.sort((a, b) => b.visits - a.visits);
}

export default {
  choose(view, legal, { level = 'mittel', rng, timeLimitMs = 900 }) {
    if (legal.length === 1) return legal[0];
    if (level === 'leicht' && rng.float() < 0.3) return legal[rng.int(legal.length)];
    const time = level === 'leicht' ? 120 : level === 'mittel' ? Math.min(timeLimitMs, 600) : timeLimitMs;
    const ranked = search(view, time, rng.int(2 ** 31) + 1);
    const m = ranked[0]?.move;
    return legal.find((a) => a.board * 9 + a.cell === m) ?? legal[rng.int(legal.length)];
  },
};
