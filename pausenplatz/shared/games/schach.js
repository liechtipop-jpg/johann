// Schach mit allen Regeln (über chess.js): Rochade, en passant, Umwandlung, Matt, Patt, Remisregeln.
// Staffel-Schach: Teammitglieder ziehen reihum. Bedenkzeit zählt per Zeitstempel (Server bzw. lokal).
import { Chess } from 'chess.js';
import { ok, fail } from '../util/actions.js';
import { advanceMember, currentMember, sideOf, sides } from './common.js';

export const TIME_CONTROLS = { none: null, '1+0': [1, 0], '3+2': [3, 2], '5+0': [5, 0], '10+0': [10, 0], '15+10': [15, 10] };
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Kann diese Farbe überhaupt noch mattsetzen? (nur König oder König + eine Leichtfigur → nein) */
export function canMate(chess, color) {
  const pieces = chess.board().flat().filter((p) => p && p.color === color && p.type !== 'k');
  if (pieces.length === 0) return false;
  if (pieces.length === 1 && (pieces[0].type === 'b' || pieces[0].type === 'n')) return false;
  return true;
}

const chessOf = (state) => state.chess;
const sideToMove = (state) => (chessOf(state).turn() === 'w' ? 0 : 1);
const majority = (votes, members) => votes.size * 2 > members.length;

export default {
  id: 'schach',
  name: 'Schach',
  category: 'board',
  modes: ['1v1', '2v2', '3v3', 'local', 'ai'],
  botModes: ['1v1', '2v2', '3v3'],
  players: { min: 2, max: 6 },
  duration: '5–40 Min.',
  accent: '#9ccf6e',
  defaultOptions: { time: 'none' },
  optionDefs: [{ key: 'time', type: 'select', values: Object.keys(TIME_CONTROLS), default: 'none' }],

  setup(players, options) {
    const tc = TIME_CONTROLS[options.time] ?? null;
    const state = {
      sides: sides(players, options), result: null, last: null, captured: [[], []], san: [],
      clock: tc ? { base: tc[0] * 60_000, inc: tc[1] * 1000, left: [tc[0] * 60_000, tc[0] * 60_000], since: options.now ?? Date.now() } : null,
      drawVotes: [new Set(), new Set()], drawOffer: null, resignVotes: [new Set(), new Set()],
    };
    Object.defineProperty(state, 'chess', { value: new Chess(), enumerable: false, writable: true });
    return state;
  },

  toMove(state) {
    return state.result ? null : currentMember(state.sides[sideToMove(state)]);
  },

  getView(state, playerId) {
    const chess = chessOf(state);
    const material = (side) => state.captured[side].reduce((n, p) => n + VALUE[p], 0);
    let checkSquare = null;
    if (chess.inCheck()) {
      const color = chess.turn();
      chess.board().forEach((row) => row.forEach((p) => p && p.type === 'k' && p.color === color && (checkSquare = p.square)));
    }
    return {
      fen: chess.fen(), turn: sideToMove(state), toMove: this.toMove(state), mySide: sideOf(state, playerId), sides: state.sides.map((s) => ({ team: s.team, members: s.members })),
      last: state.last, checkSquare, captured: state.captured, material: [material(0), material(1)], san: state.san,
      clock: state.clock ? { left: state.clock.left, since: state.clock.since, running: state.result ? null : sideToMove(state) } : null,
      deadline: state.clock && !state.result ? state.clock.since + state.clock.left[sideToMove(state)] : null,
      drawOffer: state.drawOffer, drawVotes: state.drawVotes.map((v) => [...v]), resignVotes: state.resignVotes.map((v) => [...v]),
      result: state.result,
    };
  },

  getLegalActions(state, playerId) {
    if (state.result || this.toMove(state) !== playerId) return [];
    return chessOf(state).moves({ verbose: true }).map((m) => (m.promotion ? { type: 'move', from: m.from, to: m.to, promotion: m.promotion } : { type: 'move', from: m.from, to: m.to }));
  },

  applyAction(state, playerId, action, ctx = {}) {
    if (state.result) return fail('game_over');
    const side = sideOf(state, playerId);
    if (side === -1) return fail('spectator');
    const now = ctx.now ?? Date.now();
    const members = state.sides[side].members;
    // Aufgeben, Remis anbieten und annehmen – im Team entscheidet die Mehrheit.
    if (action.type === 'resign') {
      state.resignVotes[side].add(playerId);
      if (majority(state.resignVotes[side], members)) state.result = { winnerSide: 1 - side, reason: 'resign' };
      return ok(state, [{ type: 'resign', side }]);
    }
    if (action.type === 'offerDraw' || action.type === 'acceptDraw') {
      if (state.drawOffer === 1 - side) {
        state.drawVotes[side].add(playerId);
        if (majority(state.drawVotes[side], members)) state.result = { winnerSide: null, reason: 'agreement' };
        return ok(state, [{ type: 'draw', side }]);
      }
      if (action.type === 'acceptDraw') return fail('invalid');
      state.drawVotes[side].add(playerId);
      if (majority(state.drawVotes[side], members)) {
        state.drawOffer = side;
        state.drawVotes = [new Set(), new Set()];
      }
      return ok(state, [{ type: 'drawOffer', side }]);
    }
    if (action.type === 'declineDraw') {
      if (state.drawOffer !== 1 - side) return fail('invalid');
      state.drawOffer = null;
      state.drawVotes = [new Set(), new Set()];
      return ok(state, [{ type: 'drawDeclined', side }]);
    }
    if (action.type !== 'move') return fail('invalid');
    if (this.toMove(state) !== playerId) return fail('not_your_turn');
    if (state.clock && now >= state.clock.since + state.clock.left[side]) return this.tick(state, now) ?? fail('invalid');
    const chess = chessOf(state);
    let move;
    try {
      move = chess.move({ from: String(action.from), to: String(action.to), promotion: action.promotion ? String(action.promotion) : undefined });
    } catch {
      return fail('invalid');
    }
    if (move.promotion && !action.promotion) {
      chess.undo();
      return fail('invalid');
    }
    if (state.clock) {
      state.clock.left[side] = state.clock.left[side] - (now - state.clock.since) + state.clock.inc;
      state.clock.since = now;
    }
    if (move.captured) state.captured[side].push(move.captured);
    state.san.push(move.san);
    state.last = { from: move.from, to: move.to };
    state.drawOffer = null;
    state.drawVotes = [new Set(), new Set()];
    advanceMember(state.sides[side]);
    if (chess.isCheckmate()) state.result = { winnerSide: side, reason: 'checkmate' };
    else if (chess.isStalemate()) state.result = { winnerSide: null, reason: 'stalemate' };
    else if (chess.isInsufficientMaterial()) state.result = { winnerSide: null, reason: 'insufficient' };
    else if (chess.isThreefoldRepetition()) state.result = { winnerSide: null, reason: 'threefold' };
    else if (chess.isDrawByFiftyMoves()) state.result = { winnerSide: null, reason: 'fifty' };
    return ok(state, [{ type: 'move', from: move.from, to: move.to, capture: Boolean(move.captured), check: chess.inCheck(), san: move.san }]);
  },

  nextTick(state) {
    if (!state.clock || state.result) return null;
    return state.clock.since + state.clock.left[sideToMove(state)];
  },

  /** Zeit abgelaufen: verloren – ausser der Gegner kann gar nicht mehr mattsetzen, dann Remis. */
  tick(state, now) {
    if (!state.clock || state.result) return null;
    const side = sideToMove(state);
    if (now < state.clock.since + state.clock.left[side]) return null;
    state.clock.left[side] = 0;
    const opponentColor = side === 0 ? 'b' : 'w';
    state.result = canMate(chessOf(state), opponentColor) ? { winnerSide: 1 - side, reason: 'timeout' } : { winnerSide: null, reason: 'timeoutDraw' };
    return ok(state, [{ type: 'flag', side }]);
  },

  getResult(state) {
    if (!state.result) return { over: false, winners: [] };
    return { over: true, winners: state.result.winnerSide === null ? [] : [...state.sides[state.result.winnerSide].members], reason: state.result.reason };
  },
};
