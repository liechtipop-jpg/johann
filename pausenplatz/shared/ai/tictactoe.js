// KI Tic-Tac-Toe: perfektes Minimax; leichtere Stufen spielen manchmal zufällig.
import { winnerOf } from '../games/tictactoe.js';

function minimax(board, me, turn, depth) {
  const w = winnerOf(board);
  if (w) return w.mark === me ? 10 - depth : depth - 10;
  if (board.every((v) => v !== null)) return 0;
  let best = turn === me ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    board[i] = turn;
    const score = minimax(board, me, 1 - turn, depth + 1);
    board[i] = null;
    best = turn === me ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

export default {
  choose(view, legal, { level = 'mittel', rng }) {
    const mistake = { leicht: 0.55, mittel: 0.2, schwer: 0 }[level] ?? 0.2;
    if (rng.float() < mistake) return legal[rng.int(legal.length)];
    const board = [...view.board];
    let best = null;
    let bestScore = -Infinity;
    for (const action of legal) {
      board[action.cell] = view.turn;
      const score = minimax(board, view.turn, 1 - view.turn, 1) + rng.float() * 0.1;
      board[action.cell] = null;
      if (score > bestScore) [best, bestScore] = [action, score];
    }
    return best;
  },
};
