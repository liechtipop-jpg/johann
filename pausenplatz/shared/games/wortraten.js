// Wort-Raten: wie Galgenmännchen, aber mit einem Ballon, der bei jedem Fehler Luft verliert.
// Das Wort gibt eine Person vor oder die App wählt es. Nur der Server und die vorgebende Person kennen es.
import { ok, fail } from '../util/actions.js';
import { containsBadWord } from '../util/badwords.js';
import { attachRng, shuffle } from '../util/rng.js';
import { WORDS } from '../content/woerter.js';

export const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ'];
export const toLetters = (word) => String(word).toUpperCase().replace(/ß/g, 'SS');
const isLetter = (ch) => LETTERS.includes(ch);
const WORD_MS = 45_000;
const TURN_MS = 20_000;
const REVEAL_MS = 4500;

/** Teams abwechselnd (Rot, Blau, Rot, …), damit beide gleich oft raten. */
export function interleave(ids, teamOf) {
  const red = ids.filter((id) => teamOf(id) === 'red');
  const blue = ids.filter((id) => teamOf(id) === 'blue');
  if (!red.length || !blue.length) return ids;
  const out = [];
  for (let i = 0; i < Math.max(red.length, blue.length); i++) out.push(...[red[i], blue[i]].filter(Boolean));
  return out;
}

export default {
  id: 'wortraten',
  name: 'Wort-Raten',
  category: 'party',
  modes: ['group', '2v2', '3v3', 'ai'],
  botModes: ['2v2', '3v3', 'group'],
  players: { min: 2, max: 10 },
  testPlayers: 4,
  aiOpponents: 2,
  duration: '5–15 Min.',
  accent: '#5db4ff',
  defaultOptions: { source: 'app', difficulty: 'mittel', lives: 8, words: 5 },
  optionDefs: [
    { key: 'source', type: 'select', values: ['app', 'spieler'], default: 'app' },
    { key: 'difficulty', type: 'select', values: ['leicht', 'mittel', 'schwer'], default: 'mittel' },
    { key: 'lives', type: 'select', values: [6, 8, 10], default: 8 },
    { key: 'words', type: 'select', values: [3, 5, 8], default: 5 },
    { key: 'fast', type: 'bool', default: false, hidden: true },
  ],
  testOptions: { fast: true, words: 3, source: 'spieler' },

  setup(players, options, rng) {
    const teamOf = Object.fromEntries(players.map((p) => [p.id, p.team ?? null]));
    const teamMode = ['2v2', '3v3'].includes(options.mode) && players.some((p) => p.team);
    let order = shuffle(players.map((p) => p.id), rng);
    if (teamMode) order = interleave(order, (id) => teamOf[id]);
    const state = attachRng({
      teamOf, teamMode, order, source: options.source === 'spieler' ? 'spieler' : 'app', difficulty: WORDS[options.difficulty] ? options.difficulty : 'mittel',
      lives: Number(options.lives) || 8, total: Number(options.words) || 5, done: 0, used: [], scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      scale: options.fast ? 0.002 : 1, log: [], result: null,
    }, rng);
    this.newWord(state, options.now ?? Date.now());
    return state;
  },

  ms: (state, n) => Math.max(1, Math.round(n * state.scale)),

  pickWord(state) {
    const list = WORDS[state.difficulty].filter((w) => !state.used.includes(w));
    const word = (list.length ? list : WORDS[state.difficulty])[state.rng.int(list.length || WORDS[state.difficulty].length)];
    state.used.push(word);
    return word;
  },

  newWord(state, now) {
    const giver = state.source === 'spieler' ? state.order[state.done % state.order.length] : null;
    const guessers = giver && state.teamMode ? state.order.filter((id) => state.teamOf[id] !== state.teamOf[giver]) : state.order.filter((id) => id !== giver);
    Object.assign(state, { giver, guessers, word: giver ? null : this.pickWord(state), guessed: [], misses: 0, turn: state.done % guessers.length, solvedBy: null, popped: false, phase: giver ? 'word' : 'guess', deadline: now + this.ms(state, giver ? WORD_MS : TURN_MS) });
  },

  current(state) {
    return state.phase === 'guess' ? state.guessers[state.turn % state.guessers.length] : null;
  },

  pattern(state) {
    return [...toLetters(state.word)].map((ch) => (isLetter(ch) && !state.guessed.includes(ch) ? null : ch));
  },

  getView(state, playerId) {
    const open = playerId === state.giver || state.phase === 'reveal' || state.result;
    const teamScores = state.teamMode ? ['red', 'blue'].map((team) => state.order.filter((id) => state.teamOf[id] === team).reduce((n, id) => n + state.scores[id], 0)) : null;
    return {
      phase: state.phase, giver: state.giver, guessers: state.guessers, toMove: this.current(state) ?? (state.phase === 'word' ? state.giver : null),
      pattern: state.word ? this.pattern(state) : null, secret: open ? state.word : null, guessed: state.guessed, misses: state.misses, lives: state.lives,
      solvedBy: state.solvedBy, popped: state.popped, scores: state.scores, teamScores: teamScores && { red: teamScores[0], blue: teamScores[1] }, teamOf: state.teamOf,
      done: state.done, total: state.total, deadline: state.deadline, log: state.log.slice(-12), result: state.result,
    };
  },

  getLegalActions(state, playerId) {
    if (state.result) return [];
    if (state.phase === 'word') return playerId === state.giver ? [{ type: 'word', text: '$text' }] : [];
    if (state.phase !== 'guess' || this.current(state) !== playerId) return [];
    return [{ type: 'letter', letterChoices: LETTERS.filter((l) => !state.guessed.includes(l)) }, { type: 'solve', text: '$text' }];
  },

  applyAction(state, playerId, action, ctx = {}) {
    const now = ctx.now ?? Date.now();
    if (state.result) return fail('game_over');
    if (state.phase === 'word') {
      if (playerId !== state.giver) return fail('not_your_turn');
      const text = String(action.text ?? '').replace(/\s+/g, ' ').trim();
      const letters = [...toLetters(text)].filter(isLetter).length;
      if (action.type !== 'word' || text.length > 24 || letters < 3 || ![...toLetters(text)].every((ch) => isLetter(ch) || ch === ' ' || ch === '-')) return fail('word_invalid');
      if (containsBadWord(text)) return fail('text_bad');
      state.word = text;
      state.phase = 'guess';
      state.deadline = now + this.ms(state, TURN_MS);
      return ok(state, [{ type: 'start' }]);
    }
    if (state.phase !== 'guess' || this.current(state) !== playerId) return fail('not_your_turn');
    const word = toLetters(state.word);
    if (action.type === 'letter') {
      const letter = String(action.letter ?? '').toUpperCase();
      if (!isLetter(letter) || state.guessed.includes(letter)) return fail('invalid');
      state.guessed.push(letter);
      const hits = [...word].filter((ch) => ch === letter).length;
      if (hits) {
        state.scores[playerId] += hits;
        if (this.pattern(state).every((ch) => ch !== null)) return this.finish(state, playerId, now, 3);
      } else if (++state.misses >= state.lives) return this.finish(state, null, now);
      return this.nextTurn(state, now, [{ type: hits ? 'hit' : 'miss', letter, by: playerId }]);
    }
    if (action.type === 'solve') {
      const guess = toLetters(String(action.text ?? '').replace(/\s+/g, ' ').trim());
      if (!guess) return fail('invalid');
      if (guess.replace(/[\s-]/g, '') === word.replace(/[\s-]/g, '')) {
        const hidden = this.pattern(state).filter((ch) => ch === null).length;
        state.scores[playerId] += hidden;
        return this.finish(state, playerId, now, 5);
      }
      if (++state.misses >= state.lives) return this.finish(state, null, now);
      return this.nextTurn(state, now, [{ type: 'miss', by: playerId, solve: true }]);
    }
    return fail('invalid');
  },

  nextTurn(state, now, events) {
    state.turn++;
    state.deadline = now + this.ms(state, TURN_MS);
    return ok(state, events);
  },

  /** Wort gelöst (Bonus für die lösende Person) oder Ballon geplatzt (Punkte für die vorgebende Person). */
  finish(state, solver, now, bonus = 0) {
    if (solver) {
      state.scores[solver] += bonus;
      state.solvedBy = solver;
    } else {
      state.popped = true;
      if (state.giver) state.scores[state.giver] += 5;
    }
    state.log.push({ word: state.word, giver: state.giver, solvedBy: solver });
    state.phase = 'reveal';
    state.deadline = now + this.ms(state, REVEAL_MS);
    return ok(state, [{ type: solver ? 'solved' : 'pop', by: solver }]);
  },

  nextTick(state) {
    return state.result ? null : state.deadline;
  },

  tick(state, now) {
    if (state.result || now < state.deadline) return null;
    if (state.phase === 'word') {
      state.word = this.pickWord(state);
      state.phase = 'guess';
      state.deadline = now + this.ms(state, TURN_MS);
      return ok(state, [{ type: 'autoWord' }]);
    }
    if (state.phase === 'guess') return this.nextTurn(state, now, [{ type: 'skip' }]);
    state.done++;
    if (state.done >= state.total) {
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
    this.newWord(state, now);
    return ok(state, [{ type: 'word' }]);
  },

  getResult(state) {
    return state.result ? { over: true, winners: state.result.winners, reason: 'points', scores: state.scores } : { over: false, winners: [] };
  },
};
