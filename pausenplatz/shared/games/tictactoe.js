// Tic-Tac-Toe – Referenzspiel: zeigt die komplette Kette (Modul, KI, Mehrspieler, lokal).
import { ok, fail } from '../util/actions.js';
import { advanceMember, currentMember, sideOf, sides } from './common.js';

export const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

export function winnerOf(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) return { mark: board[a], line };
  }
  return null;
}

export default {
  id: 'tictactoe',
  name: 'Tic-Tac-Toe',
  category: 'board',
  modes: ['1v1', 'local', 'ai'],
  botModes: ['1v1'],
  players: { min: 2, max: 2 },
  duration: '1–2 Min.',
  accent: '#f2b84b',
  defaultOptions: {},
  optionDefs: [],

  setup(players, options) {
    return { board: Array(9).fill(null), sides: sides(players, options), turn: 0, win: null, moves: 0, last: null };
  },

  getView(state, playerId) {
    const mySide = sideOf(state, playerId);
    return {
      board: state.board,
      mySide,
      turn: state.turn,
      toMove: this.toMove(state),
      sides: state.sides.map((s) => ({ team: s.team, members: s.members })),
      win: state.win,
      last: state.last,
    };
  },

  toMove(state) {
    return state.win || state.moves === 9 ? null : currentMember(state.sides[state.turn]);
  },

  getLegalActions(state, playerId) {
    if (this.toMove(state) !== playerId) return [];
    return state.board.flatMap((v, cell) => (v === null ? [{ type: 'place', cell }] : []));
  },

  applyAction(state, playerId, action) {
    if (this.toMove(state) !== playerId) return fail('not_your_turn');
    if (action.type !== 'place' || !Number.isInteger(action.cell) || action.cell < 0 || action.cell > 8) return fail('invalid');
    if (state.board[action.cell] !== null) return fail('occupied');
    state.board[action.cell] = state.turn;
    state.moves++;
    state.last = action.cell;
    advanceMember(state.sides[state.turn]);
    const w = winnerOf(state.board);
    if (w) state.win = { side: w.mark, line: w.line };
    state.turn = 1 - state.turn;
    return ok(state, [{ type: 'place', cell: action.cell }]);
  },

  getResult(state) {
    if (state.win) return { over: true, winners: [...state.sides[state.win.side].members], reason: 'line' };
    if (state.moves === 9) return { over: true, winners: [], reason: 'draw' };
    return { over: false, winners: [] };
  },
};
