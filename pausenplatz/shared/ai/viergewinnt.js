// KI Vier gewinnt: Negamax mit Alpha-Beta, Bewertung über alle Viererfenster, iterative Vertiefung mit Zeitlimit.
import { COLS, ROWS, at, dropRow, lineAt } from '../games/viergewinnt.js';

const ORDER = [3, 2, 4, 1, 5, 0, 6];
const WINDOWS = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const cells = [];
      for (let k = 0; k < 4; k++) {
        const rr = r + dr * k;
        const cc = c + dc * k;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
        cells.push(at(rr, cc));
      }
      if (cells.length === 4) WINDOWS.push(cells);
    }
  }
}
const WIN = 1_000_000;
const TIMEOUT = Symbol('timeout');

function evaluate(b, me) {
  let score = 0;
  for (let r = 0; r < ROWS; r++) score += b[at(r, 3)] === me ? 4 : b[at(r, 3)] === 1 - me ? -4 : 0;
  for (const w of WINDOWS) {
    let mine = 0;
    let theirs = 0;
    for (const i of w) {
      if (b[i] === me) mine++;
      else if (b[i] !== null) theirs++;
    }
    if (mine && theirs) continue;
    if (mine === 3) score += 8;
    else if (mine === 2) score += 2;
    if (theirs === 3) score -= 10;
    else if (theirs === 2) score -= 2;
  }
  return score;
}

export function bestMove(board, side, { maxDepth = 8, timeLimitMs = 900 } = {}) {
  const b = [...board];
  const deadline = Date.now() + timeLimitMs;
  let nodes = 0;
  const search = (turn, depth, alpha, beta, ply) => {
    if ((++nodes & 1023) === 0 && Date.now() > deadline) throw TIMEOUT;
    let best = -Infinity;
    let any = false;
    for (const c of ORDER) {
      const r = dropRow(b, c);
      if (r < 0) continue;
      any = true;
      b[at(r, c)] = turn;
      let score;
      if (lineAt(b, r, c)) score = WIN - ply;
      else if (depth <= 1) score = evaluate(b, turn);
      else score = -search(1 - turn, depth - 1, -beta, -alpha, ply + 1);
      b[at(r, c)] = null;
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return any ? best : 0;
  };
  let result = null;
  let order = ORDER.filter((c) => dropRow(b, c) >= 0);
  for (let depth = 1; depth <= maxDepth; depth++) {
    try {
      const scored = [];
      for (const c of order) {
        const r = dropRow(b, c);
        b[at(r, c)] = side;
        const score = lineAt(b, r, c) ? WIN : depth === 1 ? evaluate(b, side) : -search(1 - side, depth - 1, -Infinity, Infinity, 1);
        b[at(r, c)] = null;
        scored.push([c, score]);
      }
      scored.sort((x, y) => y[1] - x[1]);
      order = scored.map(([c]) => c);
      result = scored;
      if (scored[0][1] >= WIN - 100) break;
    } catch (err) {
      if (err !== TIMEOUT) throw err;
      break;
    }
  }
  return result;
}

export default {
  choose(view, legal, { level = 'mittel', rng, timeLimitMs = 900 }) {
    if (legal.length === 1) return legal[0];
    const side = view.turn;
    if (level === 'leicht' && rng.float() < 0.3) return legal[rng.int(legal.length)];
    const maxDepth = { leicht: 2, mittel: 5, schwer: 14 }[level] ?? 5;
    const scored = bestMove(view.board, side, { maxDepth, timeLimitMs: Math.min(timeLimitMs, level === 'schwer' ? timeLimitMs : 400) });
    if (!scored?.length) return legal[rng.int(legal.length)];
    const top = scored.filter(([, s]) => s >= scored[0][1] - (level === 'schwer' ? 0 : 3));
    const col = top[rng.int(top.length)][0];
    return legal.find((a) => a.col === col) ?? legal[0];
  },
};
