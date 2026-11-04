// Vier gewinnt: 7 Spalten × 6 Reihen, die Steine fallen nach unten. Im Team als Staffel.
import { ok, fail } from '../util/actions.js';
import { advanceMember, currentMember, sideOf, sides } from './common.js';

export const COLS = 7;
export const ROWS = 6;
export const at = (r, c) => r * COLS + c; // r = 0 ist die unterste Reihe

/** Tiefste freie Reihe einer Spalte oder -1. */
export function dropRow(board, col) {
  for (let r = 0; r < ROWS; r++) if (board[at(r, col)] === null) return r;
  return -1;
}

/** Felder einer Viererreihe durch (r, c) oder null. */
export function lineAt(board, r, c) {
  const me = board[at(r, c)];
  if (me === null) return null;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [at(r, c)];
    for (const sgn of [1, -1]) {
      let rr = r + dr * sgn;
      let cc = c + dc * sgn;
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && board[at(rr, cc)] === me) {
        cells.push(at(rr, cc));
        rr += dr * sgn;
        cc += dc * sgn;
      }
    }
    if (cells.length >= 4) return cells;
  }
  return null;
}

export default {
  id: 'viergewinnt',
  name: 'Vier gewinnt',
  category: 'board',
  modes: ['1v1', '2v2', 'local', 'ai'],
  botModes: ['1v1', '2v2'],
  players: { min: 2, max: 4 },
  duration: '5–10 Min.',
  accent: '#ff6b6b',
  defaultOptions: {},
  optionDefs: [],

  setup(players, options) {
    return { board: Array(COLS * ROWS).fill(null), sides: sides(players, options), turn: 0, win: null, moves: 0, last: null };
  },

  getView(state, playerId) {
    return {
      board: state.board, mySide: sideOf(state, playerId), turn: state.turn, toMove: this.toMove(state),
      sides: state.sides.map((s) => ({ team: s.team, members: s.members })), win: state.win, last: state.last, moves: state.moves,
    };
  },

  toMove(state) {
    return state.win || state.moves === COLS * ROWS ? null : currentMember(state.sides[state.turn]);
  },

  getLegalActions(state, playerId) {
    if (this.toMove(state) !== playerId) return [];
    return Array.from({ length: COLS }, (_, col) => col).filter((col) => dropRow(state.board, col) >= 0).map((col) => ({ type: 'drop', col }));
  },

  applyAction(state, playerId, action) {
    if (this.toMove(state) !== playerId) return fail('not_your_turn');
    if (action.type !== 'drop' || !Number.isInteger(action.col) || action.col < 0 || action.col >= COLS) return fail('invalid');
    const row = dropRow(state.board, action.col);
    if (row < 0) return fail('full');
    state.board[at(row, action.col)] = state.turn;
    state.moves++;
    state.last = { row, col: action.col };
    advanceMember(state.sides[state.turn]);
    const line = lineAt(state.board, row, action.col);
    if (line) state.win = { side: state.turn, line };
    state.turn = 1 - state.turn;
    return ok(state, [{ type: 'drop', row, col: action.col }]);
  },

  getResult(state) {
    if (state.win) return { over: true, winners: [...state.sides[state.win.side].members], reason: 'line' };
    if (state.moves === COLS * ROWS) return { over: true, winners: [], reason: 'full' };
    return { over: false, winners: [] };
  },
};
