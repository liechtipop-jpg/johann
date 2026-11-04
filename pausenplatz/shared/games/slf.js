// Stadt, Land, Fluss: zufälliger Buchstabe, Kategorien wählbar. «Stopp!» beendet die Runde,
// danach stimmt die Gruppe über fragwürdige Antworten ab. Punkte: 20 (als Einzige in der Kategorie), 10 (eigene Antwort), 5 (mehrfach).
import { ok, fail } from '../util/actions.js';
import { containsBadWord } from '../util/badwords.js';
import { attachRng, shuffle } from '../util/rng.js';
import { canonical, normalize } from '../util/text.js';

export const CATEGORIES = ['stadt', 'land', 'fluss', 'tier', 'name', 'beruf', 'pflanze', 'essen', 'sport', 'gegenstand', 'instrument'];
export const LETTERS = [...'ABDEFGHIKLMNOPRSTUVWZ'];
const STOP_MS = 3000;
const VOTE_MS = 60_000;
const RESULT_MS = 7000;

export function autoCheck(letter, text) {
  if (!text) return 'empty';
  return normalize(text).startsWith(letter.toLowerCase()) ? '' : 'letter';
}

export default {
  id: 'slf',
  name: 'Stadt, Land, Fluss',
  category: 'party',
  modes: ['group', '2v2', '3v3'],
  players: { min: 2, max: 12 },
  testPlayers: 4,
  duration: '10–20 Min.',
  accent: '#ffd95e',
  defaultOptions: { categories: ['stadt', 'land', 'fluss', 'tier', 'name', 'beruf'], rounds: 5, seconds: 120 },
  optionDefs: [
    { key: 'categories', type: 'multi', values: CATEGORIES, default: ['stadt', 'land', 'fluss', 'tier', 'name', 'beruf'] },
    { key: 'rounds', type: 'select', values: [3, 5, 8], default: 5 },
    { key: 'seconds', type: 'select', values: [60, 90, 120, 180], default: 120 },
    { key: 'fast', type: 'bool', default: false, hidden: true },
  ],
  testOptions: { fast: true, rounds: 3 },

  setup(players, options, rng) {
    const teamOf = Object.fromEntries(players.map((p) => [p.id, p.team ?? null]));
    const teamMode = ['2v2', '3v3'].includes(options.mode) && players.some((p) => p.team);
    const cats = Array.isArray(options.categories) && options.categories.length ? CATEGORIES.filter((c) => options.categories.includes(c)) : this.defaultOptions.categories;
    const rounds = Number(options.rounds) || 5;
    const keys = teamMode ? ['red', 'blue'] : players.map((p) => p.id);
    const state = attachRng({
      ids: players.map((p) => p.id), teamOf, teamMode, keys, cats, letters: shuffle(LETTERS, rng).slice(0, rounds), round: 0, total: rounds,
      duration: (Number(options.seconds) || 120) * 1000, scores: Object.fromEntries(keys.map((k) => [k, 0])), scale: options.fast ? 0.002 : 1, history: [], result: null,
    }, rng);
    this.newRound(state, options.now ?? Date.now());
    return state;
  },

  ms: (state, n) => Math.max(1, Math.round(n * state.scale)),

  newRound(state, now) {
    Object.assign(state, { letter: state.letters[state.round], sheets: Object.fromEntries(state.keys.map((k) => [k, {}])), phase: 'write', deadline: now + this.ms(state, state.duration), stopBy: null, doubts: {}, voted: {}, roundPoints: null });
  },

  keyOf(state, playerId) {
    if (!state.ids.includes(playerId)) return null;
    return state.teamMode ? state.teamOf[playerId] : playerId;
  },

  /** Wer darf über eine Antwort abstimmen? Alle ausser den Verfassern. */
  voters(state, key) {
    return state.ids.filter((id) => this.keyOf(state, id) !== key);
  },

  getView(state, playerId) {
    const myKey = this.keyOf(state, playerId);
    const reveal = state.phase === 'vote' || state.phase === 'result' || state.result;
    return {
      phase: state.phase, letter: state.letter, cats: state.cats, round: state.round, total: state.total, deadline: state.deadline, stopBy: state.stopBy,
      teamMode: state.teamMode, keys: state.keys, myKey, mySheet: myKey ? state.sheets[myKey] : null,
      progress: Object.fromEntries(state.keys.map((k) => [k, state.cats.filter((c) => state.sheets[k][c]).length])),
      board: reveal ? state.cats.map((cat) => ({
        cat,
        entries: state.keys.map((key) => {
          const id = `${key}|${cat}`;
          const text = state.sheets[key][cat] ?? '';
          return { key, id, text, auto: autoCheck(state.letter, text), doubts: Object.keys(state.doubts[id] ?? {}).length, voters: this.voters(state, key).length, mine: Boolean(state.doubts[id]?.[playerId]), points: state.roundPoints?.[key]?.[cat] ?? null };
        }),
      })) : null,
      voted: Object.keys(state.voted), scores: state.scores, history: state.history.slice(-8), result: state.result,
      turnIds: state.phase === 'vote' ? state.ids.filter((id) => !state.voted[id]) : [],
    };
  },

  getLegalActions(state, playerId) {
    const key = this.keyOf(state, playerId);
    if (state.result || !key) return [];
    if (state.phase === 'write' || state.phase === 'stop') {
      const list = [{ type: 'answer', categoryChoices: state.cats, text: '$text' }];
      if (state.phase === 'write' && state.cats.every((c) => state.sheets[key][c])) list.push({ type: 'stop' });
      return list;
    }
    if (state.phase === 'vote' && !state.voted[playerId]) {
      const ids = state.keys.filter((k) => k !== key).flatMap((k) => state.cats.filter((c) => state.sheets[k][c]).map((c) => `${k}|${c}`));
      return ids.length ? [{ type: 'doubt', answerIdChoices: ids }, { type: 'done' }] : [{ type: 'done' }];
    }
    return [];
  },

  applyAction(state, playerId, action, ctx = {}) {
    const now = ctx.now ?? Date.now();
    const key = this.keyOf(state, playerId);
    if (state.result) return fail('game_over');
    if (!key) return fail('not_your_turn');
    if (action.type === 'answer') {
      if (state.phase !== 'write' && state.phase !== 'stop') return fail('not_your_turn');
      if (!state.cats.includes(action.category)) return fail('invalid');
      const text = String(action.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 30);
      if (containsBadWord(text)) return fail('text_bad');
      state.sheets[key][action.category] = text;
      return ok(state, [{ type: 'answer', onlyFor: state.ids.filter((id) => this.keyOf(state, id) === key) }]);
    }
    if (action.type === 'stop') {
      if (state.phase !== 'write' || !state.cats.every((c) => state.sheets[key][c])) return fail('not_ready');
      Object.assign(state, { phase: 'stop', stopBy: playerId, deadline: now + this.ms(state, STOP_MS) });
      return ok(state, [{ type: 'stop', by: playerId }]);
    }
    if (state.phase !== 'vote' || state.voted[playerId]) return fail('not_your_turn');
    if (action.type === 'doubt') {
      const [k, cat] = String(action.answerId ?? '').split('|');
      if (!state.keys.includes(k) || k === key || !state.cats.includes(cat) || !state.sheets[k][cat]) return fail('invalid');
      const id = `${k}|${cat}`;
      state.doubts[id] ??= {};
      if (state.doubts[id][playerId]) delete state.doubts[id][playerId];
      else state.doubts[id][playerId] = true;
      return ok(state, []);
    }
    if (action.type === 'done') {
      state.voted[playerId] = true;
      if (state.ids.every((id) => state.voted[id])) this.score(state, now);
      return ok(state, [{ type: 'voted', by: playerId }]);
    }
    return fail('invalid');
  },

  /** Abstimmung auswerten und Punkte verteilen. Ungültig: leer, falscher Anfangsbuchstabe oder mehr als die Hälfte zweifelt. */
  score(state, now) {
    const points = Object.fromEntries(state.keys.map((k) => [k, {}]));
    for (const cat of state.cats) {
      const valid = state.keys.filter((k) => {
        const text = state.sheets[k][cat] ?? '';
        const doubts = Object.keys(state.doubts[`${k}|${cat}`] ?? {}).length;
        return !autoCheck(state.letter, text) && doubts <= this.voters(state, k).length / 2;
      });
      for (const k of state.keys) points[k][cat] = 0;
      if (valid.length === 1) points[valid[0]][cat] = 20;
      else for (const k of valid) points[k][cat] = valid.filter((o) => canonical(state.sheets[o][cat]) === canonical(state.sheets[k][cat])).length > 1 ? 5 : 10;
    }
    for (const k of state.keys) state.scores[k] += Object.values(points[k]).reduce((a, b) => a + b, 0);
    state.roundPoints = points;
    state.history.push({ letter: state.letter, points: Object.fromEntries(state.keys.map((k) => [k, Object.values(points[k]).reduce((a, b) => a + b, 0)])) });
    state.phase = 'result';
    state.deadline = now + this.ms(state, RESULT_MS);
  },

  nextTick(state) {
    return state.result ? null : state.deadline;
  },

  tick(state, now) {
    if (state.result || now < state.deadline) return null;
    if (state.phase === 'write' || state.phase === 'stop') {
      state.phase = 'vote';
      state.deadline = now + this.ms(state, VOTE_MS);
      return ok(state, [{ type: 'vote' }]);
    }
    if (state.phase === 'vote') {
      this.score(state, now);
      return ok(state, [{ type: 'scored' }]);
    }
    state.round++;
    if (state.round >= state.total) {
      const best = Math.max(...Object.values(state.scores));
      const top = state.keys.filter((k) => state.scores[k] === best);
      const winners = state.teamMode ? (top.length > 1 ? [] : state.ids.filter((id) => state.teamOf[id] === top[0])) : top;
      state.result = { winners, reason: 'points' };
      return ok(state, []);
    }
    this.newRound(state, now);
    return ok(state, [{ type: 'round' }]);
  },

  getResult(state) {
    return state.result ? { over: true, winners: state.result.winners, reason: 'points', scores: state.scores } : { over: false, winners: [] };
  },
};
