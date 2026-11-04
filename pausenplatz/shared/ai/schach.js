// KI Schach: Minimax mit Alpha-Beta, Figuren-Feld-Tabellen, Zugsortierung (MVV-LVA),
// iterativer Vertiefung und Zeitlimit. Leicht macht absichtlich gelegentlich Fehler.
const V = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// Tabellen aus Sicht von Weiss (a8 … h1), Schwarz gespiegelt
const PST = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};
const LIMITS = { leicht: { depth: 1, blunder: 0.3 }, mittel: { depth: 3, blunder: 0 }, schwer: { depth: 5, blunder: 0 } };

function evaluate(chess) {
  let score = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!p) continue;
    const idx = p.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;
    const v = V[p.type] + PST[p.type][idx];
    score += p.color === 'w' ? v : -v;
  }
  return chess.turn() === 'w' ? score : -score;
}

const order = (moves) => moves.sort((a, b) => (b.captured ? V[b.captured] * 10 - V[b.piece] : 0) + (b.promotion ? 800 : 0) - ((a.captured ? V[a.captured] * 10 - V[a.piece] : 0) + (a.promotion ? 800 : 0)));

export default {
  choose(view, legal, { level = 'mittel', rng, timeLimitMs = 900, Chess }) {
    if (legal.length === 1 || !Chess) return legal[rng.int(legal.length)];
    const cfg = LIMITS[level] ?? LIMITS.mittel;
    if (rng.float() < cfg.blunder) return legal[rng.int(legal.length)];
    const chess = new Chess(view.fen);
    const deadline = Date.now() + timeLimitMs;
    let stop = false;
    let nodes = 0;
    const quiesce = (alpha, beta, depth) => {
      const stand = evaluate(chess);
      if (stand >= beta) return beta;
      if (stand > alpha) alpha = stand;
      if (depth <= 0) return alpha;
      for (const m of order(chess.moves({ verbose: true }).filter((x) => x.captured))) {
        chess.move(m);
        const v = -quiesce(-beta, -alpha, depth - 1);
        chess.undo();
        if (v >= beta) return beta;
        if (v > alpha) alpha = v;
      }
      return alpha;
    };
    const negamax = (depth, alpha, beta) => {
      if ((++nodes & 255) === 0 && Date.now() > deadline) stop = true;
      if (stop) return 0;
      const moves = chess.moves({ verbose: true });
      if (!moves.length) return chess.inCheck() ? -100000 - depth : 0;
      if (depth === 0) return level === 'schwer' ? quiesce(alpha, beta, 3) : evaluate(chess);
      let best = -Infinity;
      for (const m of order(moves)) {
        chess.move(m);
        const v = chess.isThreefoldRepetition() ? 0 : -negamax(depth - 1, -beta, -alpha);
        chess.undo();
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (alpha >= beta) break;
      }
      return best;
    };
    let rootMoves = order(chess.moves({ verbose: true }));
    let best = rootMoves[0];
    for (let depth = 1; depth <= cfg.depth && !stop; depth++) {
      let bestHere = null;
      let bestScore = -Infinity;
      for (const m of rootMoves) {
        chess.move(m);
        const v = -negamax(depth - 1, -Infinity, -bestScore) + rng.float() * 4;
        chess.undo();
        if (stop) break;
        if (v > bestScore) [bestHere, bestScore] = [m, v];
      }
      if (!stop && bestHere) {
        best = bestHere;
        rootMoves = [bestHere, ...rootMoves.filter((m) => m !== bestHere)];
      }
    }
    return best.promotion ? { type: 'move', from: best.from, to: best.to, promotion: best.promotion } : { type: 'move', from: best.from, to: best.to };
  },
};
