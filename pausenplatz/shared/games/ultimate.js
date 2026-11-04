// Ultimate Tic-Tac-Toe: neun kleine Felder. Wo du setzt, bestimmt, in welchem kleinen Feld der Gegner spielen muss.
import { ok, fail } from '../util/actions.js';
import { advanceMember, currentMember, sideOf, sides } from './common.js';
import { winnerOf } from './tictactoe.js';

/** Kleine Felder, in denen gespielt werden darf. */
export function openBoards(state) {
  if (state.forced !== null && state.small[state.forced] === null) return [state.forced];
  return state.small.flatMap((v, b) => (v === null ? [b] : []));
}

export default {
  id: 'ultimate',
  name: 'Ultimate Tic-Tac-Toe',
  category: 'board',
  modes: ['1v1', 'local', 'ai'],
  botModes: ['1v1'],
  players: { min: 2, max: 2 },
  duration: '10–15 Min.',
  accent: '#4fd1c5',
  defaultOptions: {},
  optionDefs: [],

  setup(players, options) {
    return { cells: Array(81).fill(null), small: Array(9).fill(null), smallLines: Array(9).fill(null), forced: null, sides: sides(players, options), turn: 0, win: null, done: false, last: null, moves: 0 };
  },

  getView(state, playerId) {
    return {
      cells: state.cells, small: state.small, smallLines: state.smallLines, open: state.win || state.done ? [] : openBoards(state), mySide: sideOf(state, playerId),
      turn: state.turn, toMove: this.toMove(state), sides: state.sides.map((s) => ({ team: s.team, members: s.members })), win: state.win, last: state.last,
    };
  },

  toMove(state) {
    return state.win || state.done ? null : currentMember(state.sides[state.turn]);
  },

  getLegalActions(state, playerId) {
    if (this.toMove(state) !== playerId) return [];
    return openBoards(state).flatMap((board) => Array.from({ length: 9 }, (_, cell) => cell).filter((cell) => state.cells[board * 9 + cell] === null).map((cell) => ({ type: 'play', board, cell })));
  },

  applyAction(state, playerId, action) {
    if (this.toMove(state) !== playerId) return fail('not_your_turn');
    const { board, cell } = action;
    if (action.type !== 'play' || ![board, cell].every((n) => Number.isInteger(n) && n >= 0 && n < 9)) return fail('invalid');
    if (!openBoards(state).includes(board)) return fail('wrong_board');
    if (state.cells[board * 9 + cell] !== null) return fail('occupied');
    state.cells[board * 9 + cell] = state.turn;
    state.moves++;
    state.last = { board, cell };
    advanceMember(state.sides[state.turn]);
    const local = state.cells.slice(board * 9, board * 9 + 9);
    const w = winnerOf(local);
    const events = [{ type: 'play', board, cell }];
    if (w) {
      state.small[board] = state.turn;
      state.smallLines[board] = w.line;
      events.push({ type: 'board', board });
    } else if (local.every((v) => v !== null)) state.small[board] = 'draw';
    const big = winnerOf(state.small.map((v) => (v === 0 || v === 1 ? v : null)));
    if (big) state.win = { side: big.mark, line: big.line };
    else if (state.small.every((v) => v !== null)) state.done = true;
    state.forced = state.small[cell] === null ? cell : null;
    state.turn = 1 - state.turn;
    return ok(state, events);
  },

  getResult(state) {
    if (state.win) return { over: true, winners: [...state.sides[state.win.side].members], reason: 'line' };
    if (state.done) return { over: true, winners: [], reason: 'draw' };
    return { over: false, winners: [] };
  },
};
