// Schere, Stein, Papier: 1v1 als Best of 3 oder 5, in der Gruppe als K.-o.-Turnier mit Turnierbaum.
// Die Wahl bleibt geheim, bis beide gewählt haben. Wer zu lange zögert, bekommt eine Zufallswahl.
import { ok, fail } from '../util/actions.js';
import { attachRng, shuffle } from '../util/rng.js';

export const CHOICES = ['schere', 'stein', 'papier'];
export const BEATS = { schere: 'papier', stein: 'schere', papier: 'stein' };
const THROW_MS = 20_000;

export default {
  id: 'ssp',
  name: 'Schere, Stein, Papier',
  category: 'party',
  modes: ['1v1', 'group', 'ai'],
  botModes: ['1v1', 'group'],
  players: { min: 2, max: 16 },
  testPlayers: 5,
  aiOpponents: 1,
  duration: '2–10 Min.',
  accent: '#ffb46b',
  defaultOptions: { bestOf: 3 },
  optionDefs: [
    { key: 'bestOf', type: 'select', values: [3, 5], default: 3 },
    { key: 'fast', type: 'bool', default: false, hidden: true },
  ],
  testOptions: { fast: true },

  setup(players, options, rng) {
    const ids = shuffle(players.map((p) => p.id), rng);
    let size = 2;
    while (size < ids.length) size *= 2;
    const bestOf = Number(options.bestOf) === 5 ? 5 : 3;
    const state = attachRng({ bestOf, need: Math.ceil(bestOf / 2), size, scale: options.fast ? 0.002 : 1, rounds: [], champion: null }, rng);
    // Freilose nur in der ersten Runde, damit danach jede Runde voll ist
    const real = ids.length - size / 2;
    const pairs = [];
    for (let i = 0; i < real; i++) pairs.push([ids[2 * i], ids[2 * i + 1]]);
    for (let i = 2 * real; i < ids.length; i++) pairs.push([ids[i], null]);
    this.addRound(state, pairs, options.now ?? Date.now());
    return state;
  },

  ms: (state, n) => Math.max(1, Math.round(n * state.scale)),

  addRound(state, pairs, now) {
    state.rounds.push(pairs.map(([a, b]) => ({ a, b, wins: [0, 0], picks: {}, throws: [], winner: b === null ? a : null, deadline: b === null ? null : now + this.ms(state, THROW_MS) })));
    this.advance(state, now);
  },

  /** Ist die Runde fertig, entsteht die nächste – bis nur noch eine Person übrig ist. */
  advance(state, now) {
    const round = state.rounds.at(-1);
    if (!round.every((m) => m.winner)) return;
    const winners = round.map((m) => m.winner);
    if (winners.length === 1) {
      state.champion = winners[0];
      return;
    }
    const pairs = [];
    for (let i = 0; i < winners.length; i += 2) pairs.push([winners[i], winners[i + 1] ?? null]);
    this.addRound(state, pairs, now);
  },

  matchOf(state, playerId) {
    return state.rounds.at(-1).find((m) => !m.winner && (m.a === playerId || m.b === playerId)) ?? null;
  },

  getView(state, playerId) {
    const current = state.champion ? null : this.matchOf(state, playerId);
    return {
      size: state.size, bestOf: state.bestOf, need: state.need, champion: state.champion, round: state.rounds.length - 1,
      rounds: state.rounds.map((round) => round.map((m) => ({
        a: m.a, b: m.b, wins: m.wins, winner: m.winner, throws: m.throws.slice(-10), deadline: m.deadline,
        picked: [Boolean(m.picks[m.a]), Boolean(m.b && m.picks[m.b])],
        mine: m.a === playerId || m.b === playerId ? m.picks[playerId] ?? null : null,
      }))),
      deadline: current?.deadline ?? null,
      turnIds: state.champion ? [] : state.rounds.at(-1).filter((m) => !m.winner).flatMap((m) => [m.a, m.b].filter((id) => !m.picks[id])),
    };
  },

  getLegalActions(state, playerId) {
    if (state.champion) return [];
    const m = this.matchOf(state, playerId);
    return m && !m.picks[playerId] ? [{ type: 'pick', choiceChoices: CHOICES }] : [];
  },

  applyAction(state, playerId, action, ctx = {}) {
    if (state.champion) return fail('game_over');
    const m = this.matchOf(state, playerId);
    if (!m) return fail('not_your_turn');
    if (action.type !== 'pick' || !CHOICES.includes(action.choice)) return fail('invalid');
    if (m.picks[playerId]) return fail('already');
    m.picks[playerId] = action.choice;
    if (!m.picks[m.a] || !m.picks[m.b]) return ok(state, [{ type: 'picked', by: playerId }]);
    return ok(state, this.resolve(state, m, ctx.now ?? Date.now()));
  },

  resolve(state, m, now) {
    const [pa, pb] = [m.picks[m.a], m.picks[m.b]];
    const winner = pa === pb ? null : BEATS[pa] === pb ? m.a : m.b;
    m.throws.push({ a: pa, b: pb, winner });
    m.picks = {};
    if (winner) m.wins[winner === m.a ? 0 : 1]++;
    if (m.wins.some((w) => w >= state.need)) m.winner = winner;
    m.deadline = m.winner ? null : now + this.ms(state, THROW_MS);
    this.advance(state, now);
    return [{ type: 'throw', a: m.a, b: m.b, winner, matchOver: Boolean(m.winner) }];
  },

  nextTick(state) {
    if (state.champion) return null;
    const times = state.rounds.at(-1).filter((m) => !m.winner && m.deadline).map((m) => m.deadline);
    return times.length ? Math.min(...times) : null;
  },

  tick(state, now) {
    if (state.champion) return null;
    const due = state.rounds.at(-1).filter((m) => !m.winner && m.deadline && m.deadline <= now);
    if (!due.length) return null;
    const events = [];
    for (const m of due) {
      for (const id of [m.a, m.b]) if (!m.picks[id]) m.picks[id] = CHOICES[state.rng.int(3)];
      events.push(...this.resolve(state, m, now));
    }
    return ok(state, events);
  },

  getResult(state) {
    return state.champion ? { over: true, winners: [state.champion], reason: state.size > 2 ? 'tournament' : 'match' } : { over: false, winners: [] };
  },
};
