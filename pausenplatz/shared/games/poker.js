// Texas Hold'em No-Limit – nur Spielgeld. Heads-up, Team-Poker (2v2, 3v3) und Gruppe (2–8).
// Die Reihenfolge des Decks und fremde Karten verlassen den Server nie.
import { ok, fail } from '../util/actions.js';
import { shuffle } from '../util/rng.js';
import { bestHand, buildPots, compare, newDeck } from './pokerHands.js';

const BLINDS = { '5/10': [5, 10], '10/20': [10, 20], '25/50': [25, 50], '50/100': [50, 100] };
const SHOW_MS = 4500;

const active = (p) => !p.out && !p.folded;
const canAct = (p) => !p.out && !p.folded && !p.allIn;

export default {
  id: 'poker',
  name: 'Poker',
  category: 'cards',
  modes: ['1v1', '2v2', '3v3', 'group', 'ai'],
  botModes: ['1v1', '2v2', '3v3', 'group'],
  players: { min: 2, max: 8 },
  aiOpponents: 3,
  testPlayers: 4,
  duration: '15–40 Min.',
  accent: '#e8667a',
  defaultOptions: { chips: 1000, blinds: '10/20', rising: false, turnSeconds: 30, rebuy: false, hands: 20 },
  optionDefs: [
    { key: 'chips', type: 'select', values: [500, 1000, 2000, 5000], default: 1000 },
    { key: 'blinds', type: 'select', values: Object.keys(BLINDS), default: '10/20' },
    { key: 'rising', type: 'bool', default: false },
    { key: 'turnSeconds', type: 'select', values: [15, 30, 60], default: 30 },
    { key: 'rebuy', type: 'bool', default: false },
    { key: 'hands', type: 'select', values: [10, 20, 30, 50], default: 20 },
    // Pause nach dem Showdown (in Tests 0)
    { key: 'pause', type: 'int', min: 0, max: 10000, default: 4500, hidden: true },
  ],
  testOptions: { pause: 0 },

  setup(players, options, rng) {
    const team = players.some((p) => p.team) && ['2v2', '3v3', '1v1'].includes(options.mode);
    // Team-Poker: Teammitglieder abwechselnd setzen
    let seating = [...players];
    if (team) {
      const red = players.filter((p) => p.team === 'red');
      const blue = players.filter((p) => p.team === 'blue');
      seating = [];
      for (let i = 0; i < Math.max(red.length, blue.length); i++) seating.push(...[red[i], blue[i]].filter(Boolean));
    }
    const [sb, bb] = BLINDS[options.blinds] ?? BLINDS['10/20'];
    const start = Number(options.chips) || 1000;
    const state = {
      players: seating.map((p) => ({ id: p.id, team: p.team ?? null, chips: start, bet: 0, total: 0, folded: false, allIn: false, out: false, hole: [], acted: false, seen: -1, rebuys: 0 })),
      options: { start, sb, bb, rising: Boolean(options.rising), turnMs: (Number(options.turnSeconds) || 30) * 1000, rebuy: Boolean(options.rebuy), hands: Number(options.hands) || 20, team, pause: Number.isInteger(options.pause) ? options.pause : SHOW_MS },
      sb, bb, handNo: 0, dealer: -1, deck: [], board: [], street: 'preflop', phase: 'between', toAct: -1, currentBet: 0, minRaise: bb, raiseVersion: 0,
      deadline: null, nextAt: null, showdown: null, log: [], result: null, blindsAt: [-1, -1],
    };
    Object.defineProperty(state, 'rng', { value: rng, enumerable: false });
    this.startHand(state, options.now ?? Date.now());
    return state;
  },

  nextSeat(state, from, pred) {
    const n = state.players.length;
    for (let i = 1; i <= n; i++) {
      const idx = (from + i) % n;
      if (pred(state.players[idx])) return idx;
    }
    return -1;
  },

  pay(p, amount) {
    const x = Math.min(amount, p.chips);
    p.chips -= x;
    p.bet += x;
    p.total += x;
    if (p.chips === 0) p.allIn = true;
    return x;
  },

  checkOver(state) {
    const { options } = state;
    const alive = state.players.filter((p) => p.chips > 0 || (options.rebuy && !p.out));
    const net = (p) => p.chips - p.rebuys * options.start;
    if (options.team) {
      const teams = new Set(state.players.filter((p) => p.chips > 0).map((p) => p.team));
      if (teams.size <= 1) return (state.result = { winners: state.players.filter((p) => teams.has(p.team)).map((p) => p.id), reason: 'last_team' });
      if (state.handNo >= options.hands) {
        const sum = (team) => state.players.filter((p) => p.team === team).reduce((n, p) => n + net(p), 0);
        const red = sum('red');
        const blue = sum('blue');
        const win = red === blue ? null : red > blue ? 'red' : 'blue';
        return (state.result = { winners: win ? state.players.filter((p) => p.team === win).map((p) => p.id) : [], reason: 'hands' });
      }
      return null;
    }
    if (options.rebuy && state.handNo >= options.hands) {
      const best = Math.max(...state.players.map(net));
      return (state.result = { winners: state.players.filter((p) => net(p) === best).map((p) => p.id), reason: 'hands' });
    }
    if (alive.length <= 1) return (state.result = { winners: alive.map((p) => p.id), reason: 'last_player' });
    return null;
  },

  startHand(state, now) {
    const { options } = state;
    for (const p of state.players) {
      if (p.chips === 0 && options.rebuy) {
        p.chips = options.start;
        p.rebuys++;
      }
      p.out = p.chips === 0;
      Object.assign(p, { bet: 0, total: 0, folded: false, allIn: false, hole: [], acted: false, seen: -1 });
    }
    if (this.checkOver(state)) return;
    state.handNo++;
    const level = options.rising ? Math.floor((state.handNo - 1) / 10) : 0;
    state.sb = options.sb * 2 ** level;
    state.bb = options.bb * 2 ** level;
    state.dealer = this.nextSeat(state, state.dealer, (p) => !p.out);
    state.deck = shuffle(newDeck(), state.rng);
    state.board = [];
    state.showdown = null;
    state.street = 'preflop';
    state.phase = 'betting';
    const seated = state.players.filter((p) => !p.out);
    for (let round = 0; round < 2; round++) {
      let i = state.dealer;
      for (let k = 0; k < seated.length; k++) {
        i = this.nextSeat(state, i, (p) => !p.out);
        state.players[i].hole.push(state.deck.pop());
      }
    }
    const headsUp = seated.length === 2;
    const sbSeat = headsUp ? state.dealer : this.nextSeat(state, state.dealer, (p) => !p.out);
    const bbSeat = this.nextSeat(state, sbSeat, (p) => !p.out);
    state.blindsAt = [sbSeat, bbSeat];
    this.pay(state.players[sbSeat], state.sb);
    this.pay(state.players[bbSeat], state.bb);
    state.currentBet = Math.max(...state.players.map((p) => p.bet));
    state.minRaise = state.bb;
    state.raiseVersion = 0;
    state.log.push({ type: 'hand', no: state.handNo, sb: state.sb, bb: state.bb });
    state.toAct = this.nextSeat(state, bbSeat, canAct);
    if (headsUp && canAct(state.players[sbSeat])) state.toAct = sbSeat;
    this.afterAction(state, now, true);
  },

  /** Setzrunde weiter oder beenden. */
  afterAction(state, now, fresh = false) {
    const live = state.players.filter(active);
    if (live.length === 1) return this.finishHand(state, now, false);
    const actors = state.players.filter(canAct);
    const done = (p) => p.acted && p.bet === state.currentBet;
    const pending = actors.filter((p) => !done(p));
    const allMatched = state.players.filter(active).every((p) => p.allIn || p.bet === state.currentBet);
    if (pending.length === 0 || (actors.length <= 1 && allMatched && !(actors.length === 1 && actors[0].bet < state.currentBet))) {
      if (actors.length <= 1 && allMatched) return this.runOut(state, now);
      return this.nextStreet(state, now);
    }
    if (!fresh || !canAct(state.players[state.toAct]) || done(state.players[state.toAct])) {
      state.toAct = this.nextSeat(state, fresh ? state.toAct - 1 : state.toAct, (p) => canAct(p) && !done(p));
    }
    state.deadline = now + state.options.turnMs;
  },

  nextStreet(state, now) {
    for (const p of state.players) Object.assign(p, { bet: 0, acted: false, seen: -1 });
    state.currentBet = 0;
    state.minRaise = state.bb;
    state.raiseVersion = 0;
    if (state.street === 'river') return this.finishHand(state, now, true);
    state.street = state.street === 'preflop' ? 'flop' : state.street === 'flop' ? 'turn' : 'river';
    state.board.push(...state.deck.splice(-(state.street === 'flop' ? 3 : 1)));
    state.log.push({ type: 'street', street: state.street, board: [...state.board] });
    const actors = state.players.filter(canAct);
    if (actors.length <= 1) return this.runOut(state, now);
    state.toAct = this.nextSeat(state, state.dealer, canAct);
    state.deadline = now + state.options.turnMs;
  },

  runOut(state, now) {
    while (state.board.length < 5) state.board.push(state.deck.pop());
    this.finishHand(state, now, true);
  },

  finishHand(state, now, showdown) {
    const contributions = state.players.map((p) => ({ id: p.id, amount: p.total, folded: !active(p) }));
    const pots = buildPots(contributions);
    const byId = new Map(state.players.map((p) => [p.id, p]));
    const order = [];
    for (let i = 1; i <= state.players.length; i++) order.push(state.players[(state.dealer + i) % state.players.length].id);
    const hands = {};
    if (showdown) for (const p of state.players.filter(active)) hands[p.id] = bestHand([...p.hole, ...state.board]);
    const awards = pots.map((pot) => {
      let winners = pot.eligible;
      if (showdown && winners.length > 1) {
        const best = winners.reduce((b, id) => (compare(hands[id].score, hands[b].score) > 0 ? id : b), winners[0]);
        winners = winners.filter((id) => compare(hands[id].score, hands[best].score) === 0);
      }
      const share = Math.floor(pot.amount / winners.length);
      let odd = pot.amount - share * winners.length;
      winners.forEach((id) => (byId.get(id).chips += share));
      // Ungerader Chip: an den ersten Gewinner links vom Dealer
      for (const id of order) if (odd > 0 && winners.includes(id)) (byId.get(id).chips += 1), odd--;
      return { amount: pot.amount, winners, hand: showdown ? hands[winners[0]]?.name : null };
    });
    state.showdown = {
      reveal: showdown ? Object.fromEntries(state.players.filter(active).map((p) => [p.id, p.hole])) : {},
      hands: Object.fromEntries(Object.entries(hands).map(([id, hnd]) => [id, { name: hnd.name, cards: hnd.cards }])),
      awards,
    };
    state.log.push({ type: 'win', awards: awards.map((a) => ({ amount: a.amount, winners: a.winners, hand: a.hand })) });
    state.phase = 'between';
    state.toAct = -1;
    state.deadline = null;
    state.nextAt = now + state.options.pause;
    for (const p of state.players) p.bet = 0;
  },

  getView(state, playerId) {
    const me = state.players.find((p) => p.id === playerId);
    const toCall = me ? Math.max(0, state.currentBet - me.bet) : 0;
    return {
      players: state.players.map((p) => ({ id: p.id, team: p.team, chips: p.chips, bet: p.bet, folded: p.folded, allIn: p.allIn, out: p.out, hasCards: p.hole.length > 0 && !p.folded, rebuys: p.rebuys })),
      hole: me && !me.out ? me.hole : [], best: me && me.hole.length && state.board.length >= 3 ? bestHand([...me.hole, ...state.board]) : null,
      board: state.board, pot: state.players.reduce((n, p) => n + p.total, 0), dealer: state.dealer, blindsAt: state.blindsAt, sb: state.sb, bb: state.bb,
      toMove: state.toAct >= 0 ? state.players[state.toAct].id : null, currentBet: state.currentBet, toCall, minRaise: state.minRaise,
      street: state.street, phase: state.phase, handNo: state.handNo, hands: state.options.hands, team: state.options.team,
      deadline: state.phase === 'betting' ? state.deadline : null, nextAt: state.nextAt, showdown: state.showdown, log: state.log.slice(-30), result: state.result,
    };
  },

  getLegalActions(state, playerId) {
    if (state.result || state.phase !== 'betting') return [];
    const p = state.players[state.toAct];
    if (!p || p.id !== playerId) return [];
    const toCall = state.currentBet - p.bet;
    const maxTo = p.bet + p.chips;
    const list = [];
    if (toCall > 0) list.push({ type: 'fold' }, { type: 'call' });
    else list.push({ type: 'check' });
    const mayRaise = !p.acted || p.seen < state.raiseVersion;
    const minTo = state.currentBet === 0 ? Math.min(state.bb, maxTo) : state.currentBet + state.minRaise;
    if (mayRaise && maxTo > state.currentBet) {
      if (maxTo > minTo) list.push({ type: 'raise', amount: { min: minTo, max: maxTo } });
      list.push({ type: 'allin' });
    }
    return list;
  },

  applyAction(state, playerId, action, ctx = {}) {
    const now = ctx.now ?? Date.now();
    if (state.result) return fail('game_over');
    if (state.phase !== 'betting') return fail('not_your_turn');
    const p = state.players[state.toAct];
    if (!p || p.id !== playerId) return fail('not_your_turn');
    const legal = this.getLegalActions(state, playerId);
    const allowed = legal.find((a) => a.type === action.type);
    if (!allowed) return fail('invalid');
    const toCall = state.currentBet - p.bet;
    const events = [];
    let to = null;
    if (action.type === 'fold') p.folded = true;
    else if (action.type === 'call') this.pay(p, toCall);
    else if (action.type === 'raise') {
      to = Math.floor(Number(action.amount));
      if (!Number.isFinite(to) || to < allowed.amount.min || to > allowed.amount.max) return fail('invalid');
    } else if (action.type === 'allin') {
      to = p.bet + p.chips;
    }
    if (to !== null) {
      if (to <= state.currentBet) this.pay(p, to - p.bet);
      else {
        const increase = to - state.currentBet;
        this.pay(p, to - p.bet);
        state.currentBet = to;
        if (increase >= state.minRaise) {
          // volle Erhöhung: eröffnet die Setzrunde neu
          state.minRaise = increase;
          state.raiseVersion++;
          for (const other of state.players) if (other !== p && canAct(other)) other.acted = false;
        }
      }
    }
    p.acted = true;
    p.seen = state.raiseVersion;
    const amount = action.type === 'call' ? Math.min(toCall, p.bet) : to;
    state.log.push({ type: 'act', id: p.id, act: action.type, amount: action.type === 'fold' || action.type === 'check' ? null : p.bet });
    events.push({ type: action.type, id: p.id, amount });
    this.afterAction(state, now);
    return ok(state, events);
  },

  nextTick(state) {
    if (state.result) return null;
    return state.phase === 'betting' ? state.deadline : state.nextAt;
  },

  /** Zugzeit abgelaufen → Check oder Fold. Nach dem Showdown startet die nächste Hand. */
  tick(state, now) {
    if (state.result) return null;
    if (state.phase === 'between') {
      if (now < state.nextAt) return null;
      this.startHand(state, now);
      return ok(state, [{ type: 'deal' }]);
    }
    if (now < state.deadline) return null;
    const p = state.players[state.toAct];
    const res = this.applyAction(state, p.id, { type: state.currentBet > p.bet ? 'fold' : 'check' }, { now });
    return res.error ? null : res;
  },

  getResult(state) {
    if (!state.result) return { over: false, winners: [] };
    return { over: true, winners: state.result.winners, reason: state.result.reason };
  },
};
