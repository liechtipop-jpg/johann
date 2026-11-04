// Zeichnen & Raten: Eine Person zeichnet, die anderen raten. Die Striche gehen live als Punktlisten an alle – nicht als Bild.
// Den Begriff kennen nur der Server, die zeichnende Person und wer ihn schon erraten hat.
import { ok, fail } from '../util/actions.js';
import { censor } from '../util/badwords.js';
import { attachRng, shuffle } from '../util/rng.js';
import { levenshtein, matches, normalize } from '../util/text.js';
import { WORDS } from '../content/woerter.js';
import { interleave } from './wortraten.js';

export const COLORS = ['#ffffff', '#ff6b6b', '#ffb46b', '#ffd95e', '#7ee081', '#5db4ff', '#c38bff', '#c9a27e', '#111111', 'erase'];
export const MAX_POINTS = 9000;
export const MAX_STROKES = 600;
export const CHUNK = 200;
const CHOOSE_MS = 15_000;
const REVEAL_MS = 5000;
const SAMPLE = [[[120, 140], [300, 260], [520, 210]], [[600, 600], [640, 700], [700, 640]]];
const isLetter = (ch) => /\p{L}/u.test(ch);

export default {
  id: 'zeichnen',
  name: 'Zeichnen & Raten',
  category: 'party',
  modes: ['group', '2v2', '3v3'],
  players: { min: 2, max: 12 },
  testPlayers: 4,
  duration: '10–20 Min.',
  accent: '#7ee081',
  defaultOptions: { difficulty: 'gemischt', seconds: 80, rounds: 1 },
  optionDefs: [
    { key: 'difficulty', type: 'select', values: ['gemischt', 'leicht', 'mittel', 'schwer'], default: 'gemischt' },
    { key: 'seconds', type: 'select', values: [60, 80, 120], default: 80 },
    { key: 'rounds', type: 'select', values: [1, 2, 3], default: 1 },
    { key: 'fast', type: 'bool', default: false, hidden: true },
  ],
  testOptions: { fast: true },

  setup(players, options, rng) {
    const teamOf = Object.fromEntries(players.map((p) => [p.id, p.team ?? null]));
    const teamMode = ['2v2', '3v3'].includes(options.mode) && players.some((p) => p.team);
    let order = shuffle(players.map((p) => p.id), rng);
    if (teamMode) order = interleave(order, (id) => teamOf[id]);
    const state = attachRng({
      teamOf, teamMode, order, difficulty: ['leicht', 'mittel', 'schwer'].includes(options.difficulty) ? options.difficulty : 'gemischt',
      duration: (Number(options.seconds) || 80) * 1000, total: order.length * (Number(options.rounds) || 1), turn: 0, used: [],
      scores: Object.fromEntries(players.map((p) => [p.id, 0])), scale: options.fast ? 0.002 : 1, log: [], result: null,
    }, rng);
    this.newTurn(state, options.now ?? Date.now());
    return state;
  },

  ms: (state, n) => Math.max(1, Math.round(n * state.scale)),

  pickChoices(state) {
    const levels = state.difficulty === 'gemischt' ? ['leicht', 'mittel', 'schwer'] : Array(3).fill(state.difficulty);
    const out = [];
    for (const level of levels) {
      const fresh = WORDS[level].filter((w) => !state.used.includes(w) && !out.includes(w));
      const pool = fresh.length ? fresh : WORDS[level].filter((w) => !out.includes(w));
      out.push(pool[state.rng.int(pool.length)]);
    }
    return out;
  },

  newTurn(state, now) {
    const drawer = state.order[state.turn % state.order.length];
    let guessers = state.order.filter((id) => id !== drawer && (!state.teamMode || state.teamOf[id] === state.teamOf[drawer]));
    if (!guessers.length) guessers = state.order.filter((id) => id !== drawer);
    Object.assign(state, { drawer, guessers, choices: this.pickChoices(state), word: null, phase: 'choose', deadline: now + this.ms(state, CHOOSE_MS), strokes: [], points: 0, guesses: [], correct: {}, hints: [], hintOrder: [], startedAt: null });
  },

  start(state, word, now) {
    state.word = word;
    state.used.push(word);
    state.phase = 'draw';
    state.startedAt = now;
    state.deadline = now + this.ms(state, state.duration);
    const letters = [...word].flatMap((ch, i) => (isLetter(ch) ? [i] : []));
    state.hintOrder = shuffle(letters, state.rng).slice(0, Math.min(3, Math.floor(letters.length / 3)));
    return ok(state, [{ type: 'start' }]);
  },

  hintTimes(state) {
    return state.hintOrder.map((_, i) => state.startedAt + this.ms(state, state.duration * (0.4 + 0.2 * i)));
  },

  getView(state, playerId) {
    const sees = playerId === state.drawer || playerId in state.correct || state.phase === 'reveal' || state.result;
    const sum = (team) => state.order.filter((id) => state.teamOf[id] === team).reduce((n, id) => n + state.scores[id], 0);
    return {
      phase: state.phase, drawer: state.drawer, guessers: state.guessers, turn: state.turn, total: state.total, deadline: state.deadline,
      choices: playerId === state.drawer && state.phase === 'choose' ? state.choices : null,
      word: sees ? state.word : null,
      pattern: state.word ? [...state.word].map((ch, i) => (isLetter(ch) && !state.hints.includes(i) ? null : ch)) : null,
      strokes: state.strokes, guesses: state.guesses.slice(-40), correct: Object.keys(state.correct), scores: state.scores,
      teamScores: state.teamMode ? { red: sum('red'), blue: sum('blue') } : null, log: state.log.slice(-12), result: state.result,
      toMove: state.phase === 'choose' ? state.drawer : null,
      turnIds: state.phase === 'draw' ? state.guessers.filter((id) => !(id in state.correct)) : state.phase === 'choose' ? [state.drawer] : [],
    };
  },

  getLegalActions(state, playerId) {
    if (state.result) return [];
    if (state.phase === 'choose') return playerId === state.drawer ? [{ type: 'choose', wordChoices: state.choices }] : [];
    if (state.phase !== 'draw') return [];
    if (playerId === state.drawer) {
      const list = [];
      if (state.strokes.length < MAX_STROKES && state.points < MAX_POINTS) list.push({ type: 'draw', sid: { min: (state.strokes.at(-1)?.sid ?? 0) + 1, max: (state.strokes.at(-1)?.sid ?? 0) + 1 }, pointsChoices: SAMPLE, color: '#ffffff', width: 8 });
      if (state.strokes.length) list.push({ type: 'undo' }, { type: 'clear' });
      return list;
    }
    return state.guessers.includes(playerId) && !(playerId in state.correct) ? [{ type: 'guess', text: '$text' }] : [];
  },

  applyAction(state, playerId, action, ctx = {}) {
    const now = ctx.now ?? Date.now();
    if (state.result) return fail('game_over');
    if (state.phase === 'choose') {
      if (playerId !== state.drawer) return fail('not_your_turn');
      if (action.type !== 'choose' || !state.choices.includes(action.word)) return fail('invalid');
      return this.start(state, action.word, now);
    }
    if (state.phase !== 'draw') return fail('not_your_turn');
    if (playerId === state.drawer) {
      if (action.type === 'draw') {
        const { sid, points } = action;
        const color = COLORS.includes(action.color) ? action.color : null;
        const width = Number.isInteger(action.width) && action.width >= 2 && action.width <= 40 ? action.width : null;
        if (!Number.isInteger(sid) || sid < 1 || !color || !width || !Array.isArray(points) || !points.length || points.length > CHUNK) return fail('invalid');
        if (!points.every((p) => Array.isArray(p) && p.length === 2 && p.every((v) => Number.isInteger(v) && v >= 0 && v <= 1000))) return fail('invalid');
        if (state.points + points.length > MAX_POINTS) return fail('too_much');
        const last = state.strokes.at(-1);
        if (last && last.sid === sid) last.points.push(...points);
        else if (!last || sid > last.sid) {
          if (state.strokes.length >= MAX_STROKES) return fail('too_much');
          state.strokes.push({ sid, color, width, points: [...points] });
        } else return fail('invalid');
        state.points += points.length;
        return { state, events: [{ type: 'draw', sid, color, width, points, notFor: [state.drawer] }], light: true };
      }
      if (action.type === 'undo' && state.strokes.length) {
        state.points -= state.strokes.pop().points.length;
        return ok(state, [{ type: 'strokes' }]);
      }
      if (action.type === 'clear' && state.strokes.length) {
        Object.assign(state, { strokes: [], points: 0 });
        return ok(state, [{ type: 'strokes' }]);
      }
      return fail('invalid');
    }
    if (action.type !== 'guess' || !state.guessers.includes(playerId)) return fail('not_your_turn');
    if (playerId in state.correct) return fail('invalid');
    const text = censor(String(action.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 40));
    if (!text) return fail('invalid');
    if (matches(text, state.word)) {
      const frac = Math.min(1, Math.max(0, (state.deadline - now) / (state.deadline - state.startedAt || 1)));
      state.correct[playerId] = 2 + Math.round(8 * frac);
      state.scores[playerId] += state.correct[playerId];
      state.scores[state.drawer] += 2;
      state.guesses.push({ by: playerId, text: null, correct: true });
      const events = [{ type: 'correct', by: playerId }];
      if (state.guessers.every((id) => id in state.correct)) this.reveal(state, now);
      return ok(state, events);
    }
    state.guesses.push({ by: playerId, text, correct: false });
    const a = normalize(text).replace(/ /g, '');
    const b = normalize(state.word).replace(/ /g, '');
    return ok(state, b.length >= 6 && levenshtein(a, b) === 2 ? [{ type: 'close', onlyFor: [playerId] }] : []);
  },

  reveal(state, now) {
    state.log.push({ word: state.word, drawer: state.drawer, solvedBy: Object.keys(state.correct) });
    state.phase = 'reveal';
    state.deadline = now + this.ms(state, REVEAL_MS);
  },

  nextTick(state) {
    if (state.result) return null;
    if (state.phase === 'draw') {
      const next = this.hintTimes(state)[state.hints.length];
      return next !== undefined ? Math.min(next, state.deadline) : state.deadline;
    }
    return state.deadline;
  },

  tick(state, now) {
    if (state.result) return null;
    if (state.phase === 'choose') return now >= state.deadline ? this.start(state, state.choices[0], now) : null;
    if (state.phase === 'draw') {
      const events = [];
      while (state.hints.length < state.hintOrder.length && this.hintTimes(state)[state.hints.length] <= now) {
        state.hints.push(state.hintOrder[state.hints.length]);
        events.push({ type: 'hint' });
      }
      if (now >= state.deadline) {
        this.reveal(state, now);
        events.push({ type: 'reveal' });
      }
      return events.length ? ok(state, events) : null;
    }
    if (now < state.deadline) return null;
    state.turn++;
    if (state.turn >= state.total) {
      const v = this.getView(state, null);
      let winners;
      if (v.teamScores) winners = v.teamScores.red === v.teamScores.blue ? [] : state.order.filter((id) => state.teamOf[id] === (v.teamScores.red > v.teamScores.blue ? 'red' : 'blue'));
      else {
        const best = Math.max(...Object.values(state.scores));
        winners = state.order.filter((id) => state.scores[id] === best);
      }
      state.result = { winners, reason: 'points' };
      return ok(state, []);
    }
    this.newTurn(state, now);
    return ok(state, [{ type: 'turn' }]);
  },

  getResult(state) {
    return state.result ? { over: true, winners: state.result.winners, reason: 'points', scores: state.scores } : { over: false, winners: [] };
  },
};
