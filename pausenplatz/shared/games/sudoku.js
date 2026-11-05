// Sudoku: Jede Zeile, jede Spalte und jeder Block enthält jede Zahl genau einmal – klassisch 9×9 oder Mini 6×6.
// Allein oder als Wettrennen: 1 gegen 1, 2 gegen 2 (das Team teilt ein Gitter), in der Gruppe oder gegen den Computer.
// Alle lösen dasselbe Rätsel. Einträge werden sofort geprüft, Fehler sind begrenzt. Fremde Gitter bleiben geheim.
import { ok, fail } from '../util/actions.js';
import { attachRng, shuffle } from '../util/rng.js';
import { sides as teamSides, sideOf } from './common.js';

export const SIZES = { klassisch: { n: 9, br: 3, bc: 3 }, mini: { n: 6, br: 2, bc: 3 } };
/** Ziel für die vorgegebenen Zahlen. Es wird nur so weit entfernt, wie das Rätsel ohne Raten lösbar bleibt. */
const CLUES = { klassisch: { leicht: 38, mittel: 31, schwer: 24 }, mini: { leicht: 18, mittel: 14, schwer: 10 } };
/** Erlaubte Lösungstechniken: 1 = nur Singles, 2 = zusätzlich Block-Linien-Regeln und nackte Paare. */
const TECHNIQUE = { leicht: 1, mittel: 1, schwer: 2 };
const LEVELS = ['leicht', 'mittel', 'schwer'];
const MISTAKES = [3, 5, 10];
const HINTS = 3;
/** Tempo des Computers: Sekunden pro Feld, angepasst an Rätsel und Grösse (dazu etwas Zufall). */
const BOT_SECONDS = { leicht: 14, mittel: 9, schwer: 5.5 };
const PUZZLE_FACTOR = { leicht: 1, mittel: 1.35, schwer: 1.8 };
const SIZE_FACTOR = { klassisch: 1, mini: 0.7 };

const bitCount = (m) => {
  let c = 0;
  for (; m; m &= m - 1) c++;
  return c;
};
const lowDigit = (m) => 31 - Math.clz32(m & -m);
const digitsOf = (m) => {
  const out = [];
  for (; m; m &= m - 1) out.push(lowDigit(m));
  return out;
};

const GEO = new Map();
/** Zeilen, Spalten, Blöcke und Nachbarn eines Gitters (zwischengespeichert). Einheiten: erst Zeilen, dann Spalten, dann Blöcke. */
export function geometry(n = 9, br = 3, bc = 3) {
  const key = `${n}.${br}.${bc}`;
  if (GEO.has(key)) return GEO.get(key);
  const units = [];
  for (let r = 0; r < n; r++) units.push(Array.from({ length: n }, (_, c) => r * n + c));
  for (let c = 0; c < n; c++) units.push(Array.from({ length: n }, (_, r) => r * n + c));
  for (let r0 = 0; r0 < n; r0 += br) {
    for (let c0 = 0; c0 < n; c0 += bc) {
      const box = [];
      for (let r = r0; r < r0 + br; r++) for (let c = c0; c < c0 + bc; c++) box.push(r * n + c);
      units.push(box);
    }
  }
  const unitsOf = Array.from({ length: n * n }, () => []);
  units.forEach((unit, i) => unit.forEach((cell) => unitsOf[cell].push(i)));
  const peers = unitsOf.map((list, cell) => [...new Set(list.flatMap((i) => units[i]))].filter((x) => x !== cell));
  const geo = { n, br, bc, cells: n * n, full: ((1 << n) - 1) << 1, units, unitsOf, peers };
  GEO.set(key, geo);
  return geo;
}

/** Mögliche Zahlen einer Zelle als Bitmaske (Bit d = Zahl d). */
export function candidates(grid, geo, cell) {
  let used = 0;
  for (const p of geo.peers[cell]) used |= 1 << grid[p];
  return geo.full & ~used;
}

/** Leere Zelle mit den wenigsten Möglichkeiten (für Backtracking). */
function fewest(g, geo) {
  let best = -1;
  let mask = 0;
  let min = 99;
  for (let i = 0; i < geo.cells; i++) {
    if (g[i]) continue;
    const m = candidates(g, geo, i);
    const k = bitCount(m);
    if (k < min) {
      best = i;
      mask = m;
      min = k;
      if (k < 2) break;
    }
  }
  return { best, mask };
}

/** Zählt die Lösungen bis zur Grenze. Mit out wird die erste Lösung dort abgelegt. */
export function countSolutions(grid, geo, limit = 2, out = null) {
  const g = [...grid];
  let count = 0;
  const step = () => {
    const { best, mask } = fewest(g, geo);
    if (best < 0) {
      if (count++ === 0 && out) out.push(...g);
      return count >= limit;
    }
    for (let m = mask; m; m &= m - 1) {
      g[best] = lowDigit(m);
      if (step()) return true;
    }
    g[best] = 0;
    return false;
  };
  step();
  return count;
}

/** Zufälliges, vollständig ausgefülltes Gitter. */
function fillGrid(geo, rng) {
  const g = new Array(geo.cells).fill(0);
  const step = () => {
    const { best, mask } = fewest(g, geo);
    if (best < 0) return true;
    for (const d of shuffle(digitsOf(mask), rng)) {
      g[best] = d;
      if (step()) return true;
    }
    g[best] = 0;
    return false;
  };
  step();
  return g;
}

/** Streicht Kandidaten: Block-Linien-Regeln (in beide Richtungen) und nackte Paare. true, wenn sich etwas geändert hat. */
function eliminate(g, cand, geo) {
  const { n, units, unitsOf } = geo;
  let changed = false;
  const strip = (cells, bit, keep) => {
    for (const c of cells) {
      if (!keep(c) && cand[c] & bit) {
        cand[c] &= ~bit;
        changed = true;
      }
    }
  };
  units.forEach((unit, ui) => {
    for (let d = 1; d <= n; d++) {
      const bit = 1 << d;
      const spots = unit.filter((c) => cand[c] & bit);
      if (spots.length < 2) continue;
      const [row, col, box] = unitsOf[spots[0]];
      if (ui >= 2 * n) {
        // Liegt die Zahl im Block nur in einer Zeile oder Spalte, fällt sie im Rest dieser Linie weg.
        if (spots.every((c) => unitsOf[c][0] === row)) strip(units[row], bit, (c) => unitsOf[c][2] === ui);
        if (spots.every((c) => unitsOf[c][1] === col)) strip(units[col], bit, (c) => unitsOf[c][2] === ui);
      } else if (spots.every((c) => unitsOf[c][2] === box)) {
        // Liegt sie in der Linie nur in einem Block, fällt sie im Rest des Blocks weg.
        strip(units[box], bit, (c) => unitsOf[c][ui < n ? 0 : 1] === ui);
      }
    }
    const pairs = unit.filter((c) => !g[c] && bitCount(cand[c]) === 2);
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        if (cand[pairs[i]] !== cand[pairs[j]]) continue;
        const m = cand[pairs[i]];
        strip(unit, m, (c) => c === pairs[i] || c === pairs[j]);
      }
    }
  });
  return changed;
}

/**
 * Löst wie ein Mensch: nackte und versteckte Singles, bei technique 2 zusätzlich Streichregeln.
 * Liefert das (teilweise) gelöste Gitter und die Schritte samt Runde – Runde 0 ist sofort sichtbar.
 */
export function solveLogic(grid, geo, technique = 2) {
  const g = [...grid];
  const cand = g.map((v, i) => (v ? 0 : candidates(g, geo, i)));
  const steps = [];
  let round = 0;
  const place = (cell, d, how) => {
    g[cell] = d;
    cand[cell] = 0;
    steps.push({ cell, value: d, how, round });
    for (const p of geo.peers[cell]) cand[p] &= ~(1 << d);
  };
  for (;;) {
    const before = steps.length;
    for (let i = 0; i < geo.cells; i++) if (!g[i] && cand[i] && !(cand[i] & (cand[i] - 1))) place(i, lowDigit(cand[i]), 'naked');
    for (const unit of geo.units) {
      for (let d = 1; d <= geo.n; d++) {
        let spot = -1;
        let count = 0;
        for (const cell of unit) {
          if (g[cell] === d) {
            count = -1;
            break;
          }
          if (cand[cell] & (1 << d)) {
            spot = cell;
            count++;
          }
        }
        if (count === 1) place(spot, d, 'hidden');
      }
    }
    if (steps.length > before) round++;
    else if (technique < 2 || !eliminate(g, cand, geo)) break;
  }
  return { grid: g, solved: g.every(Boolean), steps };
}

/** Neues Rätsel mit genau einer Lösung, die ohne Raten erreichbar ist. */
export function generate(size = 'klassisch', difficulty = 'leicht', rng) {
  const spec = SIZES[size] ?? SIZES.klassisch;
  const geo = geometry(spec.n, spec.br, spec.bc);
  const target = (CLUES[size] ?? CLUES.klassisch)[difficulty] ?? CLUES.klassisch.leicht;
  const technique = TECHNIQUE[difficulty] ?? 1;
  let best = null;
  // «Schwer» soll mehr als Singles brauchen: ein paar Versuche, sonst das Rätsel mit den wenigsten Zahlen.
  for (let attempt = 0; attempt < (technique > 1 ? 5 : 1); attempt++) {
    const solution = fillGrid(geo, rng);
    const puzzle = [...solution];
    let clues = geo.cells;
    // Punktsymmetrisch paarweise entfernen (wie bei gedruckten Rätseln), solange es lösbar bleibt.
    for (const i of shuffle([...Array(Math.ceil(geo.cells / 2)).keys()], rng)) {
      const j = geo.cells - 1 - i;
      const k = i === j ? 1 : 2;
      if (clues - k < target) continue;
      const keep = puzzle[i];
      const keepJ = puzzle[j];
      puzzle[i] = 0;
      puzzle[j] = 0;
      if (solveLogic(puzzle, geo, technique).solved) clues -= k;
      else {
        puzzle[i] = keep;
        puzzle[j] = keepJ;
      }
    }
    const harder = technique > 1 && !solveLogic(puzzle, geo, 1).solved;
    if (!best || (harder && !best.harder) || (harder === best.harder && clues < best.clues)) best = { puzzle, solution, clues, harder };
    if (harder) break;
  }
  return { puzzle: best.puzzle, solution: best.solution, clues: best.clues };
}

export default {
  id: 'sudoku',
  name: 'Sudoku',
  category: 'board',
  modes: ['solo', '1v1', '2v2', 'group', 'ai'],
  botModes: ['1v1', '2v2', 'group'],
  players: { min: 1, max: 16 },
  testPlayers: 4,
  aiOpponents: 1,
  duration: '3–20 Min.',
  accent: '#c08bff',
  // Wettrennen: Wer fehlt, kommt einfach nicht weiter – keine Ersatzzüge für getrennte Personen.
  standIn: false,
  defaultOptions: { size: 'klassisch', difficulty: 'leicht', mistakes: 5 },
  optionDefs: [
    { key: 'size', type: 'select', values: ['klassisch', 'mini'], default: 'klassisch' },
    { key: 'difficulty', type: 'select', values: LEVELS, default: 'leicht' },
    { key: 'mistakes', type: 'select', values: MISTAKES, default: 5 },
    // Nur für Tests: Der Computer denkt 500-mal schneller.
    { key: 'fast', type: 'bool', default: false, hidden: true },
  ],

  setup(players, options, rng) {
    const size = SIZES[options.size] ? options.size : 'klassisch';
    const difficulty = LEVELS.includes(options.difficulty) ? options.difficulty : 'leicht';
    const mistakesMax = MISTAKES.includes(Number(options.mistakes)) ? Number(options.mistakes) : 5;
    const { n, br, bc } = SIZES[size];
    const { puzzle, solution } = generate(size, difficulty, rng);
    const now = options.now ?? Date.now();
    let groups;
    if (players.length === 1) groups = [{ team: null, members: [players[0].id] }];
    else if (options.mode === 'group') groups = players.map((p) => ({ team: null, members: [p.id] }));
    else groups = teamSides(players, options).map(({ team, members }) => ({ team, members }));
    const solo = groups.length === 1;
    const state = attachRng({
      size, n, br, bc, difficulty, mistakesMax, givens: puzzle, solution, toFill: puzzle.filter((v) => !v).length, scale: options.fast ? 0.002 : 1,
      startedAt: now, endedAt: null, winner: null, reason: null, bots: {},
      sides: groups.map((g) => ({ ...g, grid: [...puzzle], notes: Array(n * n).fill(0), filled: 0, mistakes: 0, hintsLeft: solo ? HINTS : 0, hintsUsed: 0, done: false, out: false, finishedAt: null })),
    }, rng);
    for (const p of players) {
      const side = state.sides[sideOf(state, p.id)];
      if (!p.isBot || !side) continue;
      const level = LEVELS.includes(p.botLevel) ? p.botLevel : 'mittel';
      state.bots[p.id] = { level, ready: false, at: now + this.botDelay(state, side, level) };
    }
    return state;
  },

  geo: (state) => geometry(state.n, state.br, state.bc),

  /** Wie lange der Computer für das nächste Feld braucht: anfangs länger, gegen Ende schneller. */
  botDelay(state, side, level) {
    const base = BOT_SECONDS[level] * PUZZLE_FACTOR[state.difficulty] * SIZE_FACTOR[state.size];
    const ramp = 0.5 + (state.toFill - side.filled) / state.toFill;
    return Math.max(1, Math.round(base * ramp * (0.7 + 0.6 * state.rng.float()) * 1000 * state.scale));
  },

  isOver: (state) => state.winner !== null || state.sides.every((s) => s.out),

  getView(state, playerId) {
    const mine = sideOf(state, playerId);
    const me = state.sides[mine];
    const over = this.isOver(state);
    return {
      size: state.size, n: state.n, br: state.br, bc: state.bc, difficulty: state.difficulty, mistakesMax: state.mistakesMax,
      givens: state.givens, grid: [...(me ? me.grid : state.givens)], notes: me ? [...me.notes] : null, mySide: mine, hintsLeft: me?.hintsLeft ?? 0,
      solo: state.sides.length === 1, toFill: state.toFill, startedAt: state.startedAt, endedAt: state.endedAt, winner: state.winner,
      sides: state.sides.map((s) => ({ team: s.team, members: s.members, filled: s.filled, mistakes: s.mistakes, hints: s.hintsUsed, done: s.done, out: s.out, finishedAt: s.finishedAt })),
      // Die Lösung gibt es erst am Ende – vorher würde sie das Wettrennen verraten.
      solution: over ? state.solution : null,
      turnIds: [],
    };
  },

  getLegalActions(state, playerId) {
    if (this.isOver(state)) return [];
    const side = state.sides[sideOf(state, playerId)];
    if (!side || side.out) return [];
    const bot = state.bots[playerId];
    if (bot) return bot.ready ? [{ type: 'bot' }] : [];
    const empty = side.grid.flatMap((v, cell) => (v ? [] : [cell]));
    const digits = Array.from({ length: state.n }, (_, i) => i + 1);
    const list = [{ type: 'set', cellChoices: empty, valueChoices: digits }, { type: 'note', cellChoices: empty, valueChoices: digits }];
    if (side.hintsLeft > 0) list.push({ type: 'hint' });
    return list;
  },

  /** Zahl eintragen; passende Notizen in Zeile, Spalte und Block verschwinden. */
  place(state, side, cell, value) {
    side.grid[cell] = value;
    side.notes[cell] = 0;
    side.filled++;
    for (const p of this.geo(state).peers[cell]) side.notes[p] &= ~(1 << value);
  },

  /** Ein Feld, das man gerade logisch herausfinden kann (für Tipps und den Computer). */
  nextCell(state, side) {
    const { steps } = solveLogic(side.grid, this.geo(state), 2);
    const first = steps.filter((s) => s.round === 0);
    if (first.length) return first[state.rng.int(first.length)].cell;
    const empty = side.grid.flatMap((v, cell) => (v ? [] : [cell]));
    return empty[state.rng.int(empty.length)];
  },

  /** Nach jedem Eintrag: Ist eine Seite fertig oder bleibt nur noch eine übrig? */
  settle(state, now) {
    const done = state.sides.findIndex((s) => s.done);
    const active = state.sides.filter((s) => !s.out);
    if (done >= 0) {
      state.winner = done;
      state.reason = 'solved';
    } else if (state.sides.length > 1 && active.length === 1) {
      state.winner = state.sides.indexOf(active[0]);
      state.reason = 'last';
    }
    if (this.isOver(state)) state.endedAt = now;
  },

  /** Richtige Zahl: stehen lassen und prüfen, ob die Seite fertig ist. */
  fill(state, index, cell, value, by, now, type = 'placed') {
    const side = state.sides[index];
    this.place(state, side, cell, value);
    const events = [{ type, cell, by, onlyFor: side.members }];
    if (side.filled === state.toFill) {
      side.done = true;
      side.finishedAt = now;
      events.push({ type: 'finished', side: index });
      this.settle(state, now);
    }
    return ok(state, events);
  },

  applyAction(state, playerId, action, ctx = {}) {
    const now = ctx.now ?? Date.now();
    if (this.isOver(state)) return fail('game_over');
    const index = sideOf(state, playerId);
    const side = state.sides[index];
    if (!side) return fail('spectator');
    if (side.out) return fail('out');
    const bot = state.bots[playerId];
    const cells = state.n * state.n;
    const cell = action.cell;
    const okCell = Number.isInteger(cell) && cell >= 0 && cell < cells;
    const okValue = Number.isInteger(action.value) && action.value >= 1 && action.value <= state.n;
    if (bot) {
      // Der Computer kennt das Rätsel, zieht aber nur Felder, die man gerade logisch herausfinden kann.
      if (action.type !== 'bot') return fail('invalid');
      if (!bot.ready) return fail('not_your_turn');
      const target = this.nextCell(state, side);
      bot.ready = false;
      const res = this.fill(state, index, target, state.solution[target], playerId, now);
      bot.at = now + this.botDelay(state, side, bot.level);
      return res;
    }
    switch (action.type) {
      case 'set': {
        if (!okCell || !okValue) return fail('invalid');
        if (side.grid[cell]) return fail('occupied');
        if (state.solution[cell] === action.value) return this.fill(state, index, cell, action.value, playerId, now);
        side.mistakes++;
        const events = [{ type: 'wrong', cell, value: action.value, by: playerId, onlyFor: side.members }];
        if (side.mistakes >= state.mistakesMax) {
          side.out = true;
          events.push({ type: 'out', side: index });
          this.settle(state, now);
        }
        return ok(state, events);
      }
      case 'note': {
        if (!okCell || !okValue) return fail('invalid');
        if (side.grid[cell]) return fail('occupied');
        side.notes[cell] ^= 1 << action.value;
        return ok(state, []);
      }
      case 'erase': {
        if (!okCell || side.grid[cell] || !side.notes[cell]) return fail('invalid');
        side.notes[cell] = 0;
        return ok(state, []);
      }
      case 'hint': {
        if (side.hintsLeft <= 0) return fail('no_hints');
        const target = okCell && !side.grid[cell] ? cell : this.nextCell(state, side);
        side.hintsLeft--;
        side.hintsUsed++;
        return this.fill(state, index, target, state.solution[target], playerId, now, 'hint');
      }
      default:
        return fail('invalid');
    }
  },

  nextTick(state) {
    if (this.isOver(state)) return null;
    const times = Object.entries(state.bots).filter(([id, b]) => !b.ready && !state.sides[sideOf(state, id)].out).map(([, b]) => b.at);
    return times.length ? Math.min(...times) : null;
  },

  /** Der Computer ist bereit für sein nächstes Feld. */
  tick(state, now) {
    if (this.isOver(state)) return null;
    let changed = false;
    for (const [id, b] of Object.entries(state.bots)) {
      if (b.ready || b.at > now || state.sides[sideOf(state, id)].out) continue;
      b.ready = true;
      changed = true;
    }
    return changed ? ok(state, []) : null;
  },

  getResult(state) {
    if (state.winner !== null) return { over: true, winners: [...state.sides[state.winner].members], reason: state.reason };
    if (state.sides.every((s) => s.out)) return { over: true, winners: [], reason: 'mistakes', lost: true };
    return { over: false, winners: [] };
  },
};
