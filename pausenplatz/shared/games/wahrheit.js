// Wahrheit oder Tat – Unterrichts-Edition. Die Flasche wählt fair, die Gruppe stimmt ab, 2 Joker pro Person.
import { ok, fail } from '../util/actions.js';
import { censor } from '../util/badwords.js';
import { shuffle } from '../util/rng.js';
import { CATEGORIES, CATEGORY_KEYS } from '../content/wahrheit-karten.js';

const SPIN_MS = 2600;
const CHOOSE_MS = 25_000;
const TASK_MS = 90_000;
const VOTE_MS = 30_000;
const RESULT_MS = 3500;
const POINTS = { truth: 1, dare: 2 };
const MAX_STROKES = 400;

export function pickNext(players, turns, previous, rng) {
  const pool = players.filter((p) => p.id !== previous || players.length === 1);
  const min = Math.min(...pool.map((p) => turns[p.id] ?? 0));
  const candidates = pool.filter((p) => (turns[p.id] ?? 0) === min);
  return candidates[rng.int(candidates.length)].id;
}

export default {
  id: 'wahrheit',
  name: 'Wahrheit oder Tat',
  category: 'party',
  modes: ['1v1', '2v2', '3v3', 'group'],
  players: { min: 2, max: 12 },
  testPlayers: 5,
  duration: '10–25 Min.',
  accent: '#ff9f5a',
  defaultOptions: { categories: ['leise'], rounds: 2 },
  optionDefs: [
    { key: 'categories', type: 'multi', values: CATEGORY_KEYS, default: ['leise'] },
    { key: 'rounds', type: 'select', values: [1, 2, 3, 4], default: 2 },
    { key: 'fast', type: 'bool', default: false, hidden: true },
  ],
  testOptions: { rounds: 1, fast: true },

  setup(players, options, rng) {
    const cats = (options.categories ?? ['leise']).filter((c) => CATEGORIES[c]);
    const custom = (options.customCards ?? []).map((c) => ({ text: c.text, input: 'text', type: c.type, custom: true }));
    const pool = (type) => shuffle([...cats.flatMap((c) => CATEGORIES[c][type].map((card) => ({ ...card, cat: c }))), ...custom.filter((c) => c.type === type).map((c) => ({ ...c, cat: 'eigene' }))], rng);
    const state = {
      players: players.map((p) => ({ id: p.id, team: p.team ?? null })), scores: {}, jokers: {}, turns: {}, total: players.length * (Number(options.rounds) || 2), done: 0,
      deck: { truth: pool('truth'), dare: pool('dare') }, phase: 'spin', current: null, previous: null, choice: null, card: null, answer: null, strokes: [], votes: {}, deadline: 0, log: [], result: null,
      teamScore: players.some((p) => p.team), scale: options.fast ? 0.002 : 1,
    };
    for (const p of players) {
      state.scores[p.id] = 0;
      state.jokers[p.id] = 2;
    }
    Object.defineProperty(state, 'rng', { value: rng, enumerable: false });
    this.spin(state, options.now ?? Date.now());
    return state;
  },

  ms: (state, n) => Math.max(1, Math.round(n * state.scale)),

  spin(state, now) {
    state.current = pickNext(state.players, state.turns, state.previous, state.rng);
    state.turns[state.current] = (state.turns[state.current] ?? 0) + 1;
    Object.assign(state, { phase: 'spin', choice: null, card: null, answer: null, strokes: [], votes: {}, deadline: now + this.ms(state, SPIN_MS) });
  },

  draw(state, type) {
    if (!state.deck[type].length) state.deck[type] = shuffle(state.deck[type].concat(state.log.filter((l) => l.card?.type === type).map((l) => l.card)), state.rng);
    return state.deck[type].pop() ?? { text: type === 'truth' ? 'Was hat dich heute zum Lächeln gebracht?' : 'Schreib drei Dinge, die dich glücklich machen.', input: 'text' };
  },

  voters(state) {
    return state.players.filter((p) => p.id !== state.current).map((p) => p.id);
  },

  getView(state, playerId) {
    const sum = (team) => state.players.filter((p) => p.team === team).reduce((n, p) => n + state.scores[p.id], 0);
    return {
      phase: state.phase, current: state.current, toMove: state.phase === 'choose' || state.phase === 'task' ? state.current : null, choice: state.choice, card: state.card, answer: state.answer, strokes: state.strokes,
      votes: Object.keys(state.votes).length, votedByMe: playerId in state.votes, voters: this.voters(state).length, scores: state.scores, jokers: state.jokers, deadline: state.deadline, round: state.done + 1, total: state.total,
      teamScores: state.teamScore ? { red: sum('red'), blue: sum('blue') } : null, log: state.log.slice(-20).map(({ card, ...rest }) => ({ ...rest, text: card?.text })), result: state.result,
      turnIds: state.phase === 'vote' ? this.voters(state).filter((id) => !(id in state.votes)) : state.current ? [state.current] : [],
    };
  },

  getLegalActions(state, playerId) {
    if (state.result) return [];
    if (state.phase === 'choose' && playerId === state.current) return [{ type: 'choose', choiceChoices: ['truth', 'dare'] }];
    if (state.phase === 'task' && playerId === state.current) {
      const list = [{ type: 'done' }];
      if (state.jokers[playerId] > 0) list.push({ type: 'joker' });
      if (state.card.input === 'text') list.push({ type: 'answer', text: '$text' });
      if (state.card.input === 'draw') list.push({ type: 'stroke', points: [[100, 100], [400, 300], [700, 200]], color: '#ffffff', width: 6 });
      return list;
    }
    if (state.phase === 'vote' && playerId !== state.current && !(playerId in state.votes)) return [{ type: 'vote', passed: true }, { type: 'vote', passed: false }];
    return [];
  },

  applyAction(state, playerId, action, ctx = {}) {
    const now = ctx.now ?? Date.now();
    if (state.result) return fail('game_over');
    if (state.phase === 'choose' && playerId === state.current && action.type === 'choose') {
      if (!['truth', 'dare'].includes(action.choice)) return fail('invalid');
      state.choice = action.choice;
      state.card = { ...this.draw(state, action.choice), type: action.choice };
      state.phase = 'task';
      state.deadline = now + this.ms(state, TASK_MS);
      return ok(state, [{ type: 'card' }]);
    }
    if (state.phase === 'task' && playerId === state.current) {
      if (action.type === 'joker') {
        if (state.jokers[playerId] <= 0) return fail('invalid');
        state.jokers[playerId]--;
        state.log.push({ id: playerId, joker: true, card: state.card });
        state.card = { ...this.draw(state, state.choice), type: state.choice };
        Object.assign(state, { answer: null, strokes: [], deadline: now + this.ms(state, TASK_MS) });
        return ok(state, [{ type: 'joker' }]);
      }
      if (action.type === 'answer') {
        const text = censor(String(action.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 240));
        if (!text) return fail('invalid');
        state.answer = text;
        return this.toVote(state, now);
      }
      if (action.type === 'done') return this.toVote(state, now);
      if (action.type === 'stroke' && state.card.input === 'draw') {
        const points = Array.isArray(action.points) ? action.points.slice(0, 300).filter((p) => Array.isArray(p) && p.length === 2 && p.every((v) => Number.isFinite(v) && v >= 0 && v <= 1000)).map((p) => p.map(Math.round)) : [];
        if (!points.length || state.strokes.length >= MAX_STROKES) return fail('invalid');
        const color = /^#[0-9a-f]{6}$/i.test(action.color) || action.color === 'erase' ? action.color : '#ffffff';
        state.strokes.push({ points, color, width: Math.min(40, Math.max(2, Number(action.width) || 6)) });
        return ok(state, []);
      }
      if (action.type === 'undoStroke' && state.card.input === 'draw') {
        state.strokes.pop();
        return ok(state, []);
      }
      return fail('invalid');
    }
    if (state.phase === 'vote' && action.type === 'vote') {
      if (playerId === state.current || playerId in state.votes || !this.voters(state).includes(playerId)) return fail('invalid');
      state.votes[playerId] = Boolean(action.passed);
      if (Object.keys(state.votes).length >= this.voters(state).length) return this.score(state, now);
      return ok(state, []);
    }
    return fail('not_your_turn');
  },

  toVote(state, now) {
    state.phase = 'vote';
    state.deadline = now + this.ms(state, VOTE_MS);
    return ok(state, [{ type: 'vote' }]);
  },

  /** Mehrheit entscheidet; Gleichstand zählt als geschafft. */
  score(state, now) {
    const votes = Object.values(state.votes);
    const yes = votes.filter(Boolean).length;
    const passed = votes.length === 0 || yes * 2 >= votes.length;
    if (passed) state.scores[state.current] += POINTS[state.choice];
    state.log.push({ id: state.current, choice: state.choice, passed, card: state.card, answer: state.answer });
    state.phase = 'result';
    state.lastPassed = passed;
    state.deadline = now + this.ms(state, RESULT_MS);
    state.done++;
    return ok(state, [{ type: passed ? 'passed' : 'failed' }]);
  },

  nextTick(state) {
    return state.result ? null : state.deadline;
  },

  tick(state, now) {
    if (state.result || now < state.deadline) return null;
    if (state.phase === 'spin') {
      state.phase = 'choose';
      state.deadline = now + this.ms(state, CHOOSE_MS);
      return ok(state, [{ type: 'chosen', id: state.current }]);
    }
    if (state.phase === 'choose') return this.applyAction(state, state.current, { type: 'choose', choice: state.rng.int(2) ? 'truth' : 'dare' }, { now });
    if (state.phase === 'task') return this.toVote(state, now);
    if (state.phase === 'vote') return this.score(state, now);
    if (state.phase === 'result') {
      state.previous = state.current;
      if (state.done >= state.total) {
        const best = Math.max(...Object.values(state.scores));
        let winners = state.players.filter((p) => state.scores[p.id] === best).map((p) => p.id);
        if (state.teamScore) {
          const v = this.getView(state, null).teamScores;
          winners = v.red === v.blue ? [] : state.players.filter((p) => p.team === (v.red > v.blue ? 'red' : 'blue')).map((p) => p.id);
        }
        state.result = { winners, reason: 'points' };
        return ok(state, []);
      }
      this.spin(state, now);
      return ok(state, [{ type: 'spin' }]);
    }
    return null;
  },

  getResult(state) {
    return state.result ? { over: true, winners: state.result.winners, reason: state.result.reason, scores: state.scores } : { over: false, winners: [] };
  },
};
