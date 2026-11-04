// Mühle: 24 Punkte, 9 Steine je Seite. Setzen, Ziehen, Springen (mit 3 Steinen, abschaltbar).
import { ok, fail } from '../util/actions.js';
import { advanceMember, currentMember, sideOf, sides } from './common.js';

// Punkt = Ring * 8 + k (k: 0 oben links, im Uhrzeigersinn; ungerade k = Seitenmitte)
export const ADJ = Array.from({ length: 24 }, (_, i) => {
  const r = Math.floor(i / 8);
  const k = i % 8;
  const list = [r * 8 + ((k + 1) % 8), r * 8 + ((k + 7) % 8)];
  if (k % 2 === 1) {
    if (r > 0) list.push(i - 8);
    if (r < 2) list.push(i + 8);
  }
  return list;
});
export const MILLS = [
  ...[0, 1, 2].flatMap((r) => [0, 2, 4, 6].map((k) => [r * 8 + k, r * 8 + k + 1, r * 8 + ((k + 2) % 8)])),
  ...[1, 3, 5, 7].map((k) => [k, 8 + k, 16 + k]),
];
export const MILLS_AT = Array.from({ length: 24 }, (_, i) => MILLS.filter((m) => m.includes(i)));

export const inMill = (board, i) => board[i] !== -1 && MILLS_AT[i].some((m) => m.every((p) => board[p] === board[i]));

export function removable(board, victim) {
  const stones = board.flatMap((v, i) => (v === victim ? [i] : []));
  const free = stones.filter((i) => !inMill(board, i));
  return free.length ? free : stones;
}

export function canFly(state, side) {
  return state.options.flying && state.inHand[side] === 0 && state.onBoard[side] === 3;
}

export function movesFor(state, side) {
  const { board } = state;
  if (state.inHand[side] > 0) return board.flatMap((v, i) => (v === -1 ? [{ type: 'place', to: i }] : []));
  const fly = canFly(state, side);
  const out = [];
  board.forEach((v, from) => {
    if (v !== side) return;
    const targets = fly ? board.flatMap((w, j) => (w === -1 ? [j] : [])) : ADJ[from].filter((j) => board[j] === -1);
    for (const to of targets) out.push({ type: 'move', from, to });
  });
  return out;
}

const key = (s) => `${s.board.join('')}|${s.turn}|${s.inHand.join(',')}`;

export default {
  id: 'muehle',
  name: 'Mühle',
  category: 'board',
  modes: ['1v1', '2v2', '3v3', 'local', 'ai'],
  botModes: ['1v1', '2v2', '3v3'],
  players: { min: 2, max: 6 },
  duration: '10–20 Min.',
  accent: '#d9a066',
  defaultOptions: { flying: true },
  optionDefs: [{ key: 'flying', type: 'bool', default: true }],

  setup(players, options) {
    return {
      board: Array(24).fill(-1), inHand: [9, 9], onBoard: [0, 0], turn: 0, pendingRemove: false, sides: sides(players, options),
      options: { flying: options.flying !== false }, quiet: 0, seen: {}, last: null, result: null, moves: 0, log: [],
    };
  },

  toMove(state) {
    return state.result ? null : currentMember(state.sides[state.turn]);
  },

  getView(state, playerId) {
    return {
      board: state.board, inHand: state.inHand, onBoard: state.onBoard, turn: state.turn, pendingRemove: state.pendingRemove,
      toMove: this.toMove(state), mySide: sideOf(state, playerId), sides: state.sides.map((s) => ({ team: s.team, members: s.members })),
      fly: [canFly(state, 0), canFly(state, 1)], last: state.last, quiet: state.quiet, flying: state.options.flying, moves: state.moves, result: state.result, log: state.log.slice(-40),
    };
  },

  getLegalActions(state, playerId) {
    if (this.toMove(state) !== playerId) return [];
    if (state.pendingRemove) return removable(state.board, 1 - state.turn).map((at) => ({ type: 'remove', at }));
    return movesFor(state, state.turn);
  },

  applyAction(state, playerId, action) {
    if (this.toMove(state) !== playerId) return fail('not_your_turn');
    const legal = this.getLegalActions(state, playerId);
    const match = legal.find((a) => a.type === action.type && a.to === action.to && a.from === action.from && a.at === action.at);
    if (!match) return fail('invalid');
    const side = state.turn;
    const { board } = state;
    const events = [];
    if (match.type === 'remove') {
      board[match.at] = -1;
      state.onBoard[1 - side]--;
      state.pendingRemove = false;
      state.quiet = 0;
      state.last = { ...state.last, removed: match.at };
      events.push({ type: 'remove', at: match.at });
      state.log.push({ side, type: 'remove', at: match.at });
      return ok(this.endTurn(state), events);
    }
    if (match.type === 'place') {
      board[match.to] = side;
      state.inHand[side]--;
      state.onBoard[side]++;
    } else {
      board[match.from] = -1;
      board[match.to] = side;
    }
    state.moves++;
    state.last = { from: match.from ?? null, to: match.to, side };
    events.push({ type: match.type, from: match.from, to: match.to });
    state.log.push({ side, type: match.type, from: match.from, to: match.to });
    const placingDone = state.inHand[0] === 0 && state.inHand[1] === 0;
    if (inMill(board, match.to)) {
      state.pendingRemove = true;
      state.quiet = 0;
      events.push({ type: 'mill', at: match.to });
      return ok(state, events);
    }
    if (placingDone && match.type === 'move') state.quiet++;
    return ok(this.endTurn(state), events);
  },

  endTurn(state) {
    advanceMember(state.sides[state.turn]);
    state.turn = 1 - state.turn;
    const opp = state.turn;
    const total = state.onBoard[opp] + state.inHand[opp];
    if (total < 3) state.result = { winnerSide: 1 - opp, reason: 'stones' };
    else if (movesFor(state, opp).length === 0) state.result = { winnerSide: 1 - opp, reason: 'blocked' };
    else {
      const k = key(state);
      state.seen[k] = (state.seen[k] ?? 0) + 1;
      if (state.seen[k] >= 3 && state.inHand[0] === 0 && state.inHand[1] === 0) state.result = { winnerSide: null, reason: 'repetition' };
      else if (state.quiet >= 100) state.result = { winnerSide: null, reason: 'fifty' };
    }
    return state;
  },

  getResult(state) {
    if (!state.result) return { over: false, winners: [] };
    const winners = state.result.winnerSide === null ? [] : [...state.sides[state.result.winnerSide].members];
    return { over: true, winners, reason: state.result.reason };
  },
};
