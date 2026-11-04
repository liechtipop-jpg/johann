// Schiffe versenken: klassisch (1v1), Team-Flotte (2v2, 3v3), gegen Computer.
// Gegnerische Positionen verlassen den Server erst nach Spielende.
import { ok, fail } from '../util/actions.js';
import { advanceMember, currentMember, sideOf, sides } from './common.js';

export const LAYOUTS = {
  '1v1': { size: 10, fleet: [5, 4, 3, 3, 2] },
  '2v2': { size: 12, fleet: [5, 4, 4, 3, 3, 2, 2] },
  '3v3': { size: 14, fleet: [5, 5, 4, 4, 3, 3, 3, 2, 2] },
};
export const PLACE_MS = 90_000;
const LETTERS = 'ABCDEFGHIJKLMN';
export const cellName = (x, y) => `${LETTERS[x]}${y + 1}`;

export function shipCells(ship) {
  return Array.from({ length: ship.len }, (_, i) => (ship.dir === 'h' ? [ship.x + i, ship.y] : [ship.x, ship.y + i]));
}

/** Passt das Schiff aufs Brett, ohne Überlappung (und ohne Berührung, falls verlangt)? */
export function canPlace(ships, ship, size, touching) {
  const cells = shipCells(ship);
  if (cells.some(([x, y]) => x < 0 || y < 0 || x >= size || y >= size)) return false;
  const blocked = new Set();
  for (const other of ships) {
    if (!other || other.id === ship.id || other.x == null) continue;
    for (const [x, y] of shipCells(other)) {
      if (touching) blocked.add(`${x},${y}`);
      else for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) blocked.add(`${x + dx},${y + dy}`);
    }
  }
  return cells.every(([x, y]) => !blocked.has(`${x},${y}`));
}

export function randomPlacement(ships, ids, size, touching, rng) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const trial = ships.map((s) => ({ ...s }));
    let okAll = true;
    for (const id of ids) {
      const ship = trial[id];
      let placed = false;
      for (let n = 0; n < 400 && !placed; n++) {
        Object.assign(ship, { dir: rng.int(2) ? 'h' : 'v', x: rng.int(size), y: rng.int(size) });
        if (canPlace(trial, ship, size, touching)) placed = true;
      }
      if (!placed) {
        okAll = false;
        break;
      }
    }
    if (okAll) return trial;
    ids.forEach((id) => Object.assign(ships[id], { x: null, y: null }));
  }
  throw new Error('Platzierung unmöglich');
}

export default {
  id: 'schiffe',
  name: 'Schiffe versenken',
  category: 'board',
  modes: ['1v1', '2v2', '3v3', 'ai'],
  botModes: ['1v1', '2v2', '3v3'],
  players: { min: 2, max: 6 },
  duration: '10–15 Min.',
  accent: '#4fb3d9',
  defaultOptions: { touching: false, again: false, salvo: false },
  optionDefs: [
    { key: 'touching', type: 'bool', default: false },
    { key: 'again', type: 'bool', default: false },
    { key: 'salvo', type: 'bool', default: false },
  ],

  setup(players, options, rng) {
    const layout = LAYOUTS[options.mode] ?? LAYOUTS['1v1'];
    const s = sides(players, options);
    const state = {
      size: layout.size, phase: 'place', deadline: (options.now ?? Date.now()) + PLACE_MS, sides: s, turn: 0, shotsLeft: 1, result: null, log: [],
      options: { touching: Boolean(options.touching), again: Boolean(options.again), salvo: Boolean(options.salvo) },
      fleets: s.map((side) => layout.fleet.map((len, id) => ({ id, len, owner: side.members[id % side.members.length], x: null, y: null, dir: 'h', hits: 0 }))),
      shots: [new Map(), new Map()], ready: new Set(),
    };
    Object.defineProperty(state, 'rng', { value: rng, enumerable: false });
    return state;
  },

  toMove(state) {
    return state.phase === 'battle' && !state.result ? currentMember(state.sides[state.turn]) : null;
  },

  sunk: (ship) => ship.hits >= ship.len,

  getView(state, playerId) {
    const me = sideOf(state, playerId);
    const over = Boolean(state.result);
    const shotList = (side) => [...state.shots[side].entries()].map(([k, v]) => ({ k, ...v }));
    const enemy = me === -1 ? null : 1 - me;
    return {
      size: state.size, phase: state.phase, deadline: state.phase === 'place' ? state.deadline : null, turn: state.turn, toMove: this.toMove(state), shotsLeft: state.shotsLeft,
      mySide: me, sides: state.sides.map((s) => ({ team: s.team, members: s.members })), options: state.options, log: state.log.slice(-30),
      ready: [...state.ready], turnIds: state.phase === 'place' ? state.sides.flatMap((s) => s.members).filter((id) => !state.ready.has(id)) : [this.toMove(state)].filter(Boolean),
      // Eigene Flotte (ganzes Team) – die gegnerische nur versenkt bzw. nach Spielende
      own: me === -1 ? null : state.fleets[me].map((s) => ({ ...s, sunk: this.sunk(s) })),
      ownShots: me === -1 ? null : shotList(1 - me),
      enemyShots: enemy === null ? null : shotList(me),
      enemySunk: enemy === null ? null : state.fleets[enemy].filter((s) => this.sunk(s) || over).map((s) => ({ ...s, sunk: this.sunk(s) })),
      enemyLeft: enemy === null ? null : state.fleets[enemy].filter((s) => !this.sunk(s)).map((s) => s.len),
      boards: me === -1 ? state.sides.map((_, i) => ({ shots: shotList(1 - i), sunk: state.fleets[i].filter((s) => this.sunk(s) || over), left: state.fleets[i].filter((s) => !this.sunk(s)).map((s) => s.len) })) : null,
      result: state.result,
    };
  },

  myShips(state, playerId) {
    const side = sideOf(state, playerId);
    return side === -1 ? [] : state.fleets[side].filter((s) => s.owner === playerId);
  },

  getLegalActions(state, playerId) {
    if (state.result) return [];
    if (state.phase === 'place') {
      if (state.ready.has(playerId) || sideOf(state, playerId) === -1) return [];
      const mine = this.myShips(state, playerId);
      const list = [{ type: 'random' }];
      if (mine.every((s) => s.x !== null)) list.push({ type: 'ready' });
      return list;
    }
    if (this.toMove(state) !== playerId) return [];
    const side = sideOf(state, playerId);
    const out = [];
    for (let y = 0; y < state.size; y++) for (let x = 0; x < state.size; x++) if (!state.shots[side].has(`${x},${y}`)) out.push({ type: 'shoot', x, y });
    return out;
  },

  applyAction(state, playerId, action) {
    if (state.result) return fail('game_over');
    const side = sideOf(state, playerId);
    if (side === -1) return fail('spectator');
    if (state.phase === 'place') return this.place(state, playerId, side, action);
    if (this.toMove(state) !== playerId) return fail('not_your_turn');
    if (action.type !== 'shoot' || !Number.isInteger(action.x) || !Number.isInteger(action.y)) return fail('invalid');
    const { x, y } = action;
    if (x < 0 || y < 0 || x >= state.size || y >= state.size) return fail('invalid');
    const key = `${x},${y}`;
    if (state.shots[side].has(key)) return fail('occupied');
    const enemy = state.fleets[1 - side];
    const ship = enemy.find((s) => shipCells(s).some(([sx, sy]) => sx === x && sy === y));
    const events = [];
    let shot;
    if (ship) {
      ship.hits++;
      shot = { hit: true, by: playerId };
      if (this.sunk(ship)) {
        shot.sunk = ship.id;
        events.push({ type: 'sunk', x, y, len: ship.len });
      } else events.push({ type: 'hit', x, y });
    } else {
      shot = { hit: false, by: playerId };
      events.push({ type: 'miss', x, y });
    }
    state.shots[side].set(key, shot);
    state.log.push({ side, by: playerId, x, y, hit: shot.hit, sunk: shot.sunk != null ? ship.len : null });
    if (enemy.every((s) => this.sunk(s))) {
      state.result = { winnerSide: side, reason: 'fleet' };
      return ok(state, events);
    }
    advanceMember(state.sides[side]);
    state.shotsLeft--;
    const fullBoard = state.shots[side].size >= state.size * state.size;
    if ((state.options.again && ship) || (state.shotsLeft > 0 && !fullBoard)) {
      if (state.options.again && ship) state.shotsLeft = Math.max(state.shotsLeft, 1);
      return ok(state, events);
    }
    state.turn = 1 - side;
    state.shotsLeft = this.shotsFor(state, state.turn);
    return ok(state, events);
  },

  shotsFor(state, side) {
    return state.options.salvo ? Math.max(1, state.fleets[side].filter((s) => !this.sunk(s)).length) : 1;
  },

  place(state, playerId, side, action) {
    if (state.ready.has(playerId)) return fail('invalid');
    const fleet = state.fleets[side];
    const mine = fleet.filter((s) => s.owner === playerId);
    if (action.type === 'random') {
      const ids = mine.map((s) => s.id);
      ids.forEach((id) => Object.assign(fleet[id], { x: null, y: null }));
      const placed = randomPlacement(fleet, ids, state.size, state.options.touching, state.rng);
      ids.forEach((id) => Object.assign(fleet[id], { x: placed[id].x, y: placed[id].y, dir: placed[id].dir }));
      return ok(state, [{ type: 'placed', onlyFor: state.sides[side].members }]);
    }
    if (action.type === 'place') {
      const ship = mine.find((s) => s.id === action.ship);
      if (!ship || !Number.isInteger(action.x) || !Number.isInteger(action.y) || !['h', 'v'].includes(action.dir)) return fail('invalid');
      const trial = { ...ship, x: action.x, y: action.y, dir: action.dir };
      if (!canPlace(fleet, trial, state.size, state.options.touching)) return fail('invalid');
      Object.assign(ship, { x: action.x, y: action.y, dir: action.dir });
      return ok(state, [{ type: 'placed', onlyFor: state.sides[side].members }]);
    }
    if (action.type === 'unplace') {
      const ship = mine.find((s) => s.id === action.ship);
      if (!ship) return fail('invalid');
      Object.assign(ship, { x: null, y: null });
      return ok(state, []);
    }
    if (action.type === 'ready') {
      if (mine.some((s) => s.x === null)) return fail('invalid');
      state.ready.add(playerId);
      if (state.sides.every((s) => s.members.every((id) => state.ready.has(id)))) this.startBattle(state);
      return ok(state, [{ type: 'ready', by: playerId }]);
    }
    return fail('invalid');
  },

  startBattle(state) {
    state.phase = 'battle';
    state.turn = 0;
    state.shotsLeft = this.shotsFor(state, 0);
  },

  nextTick(state) {
    return state.phase === 'place' && !state.result ? state.deadline : null;
  },

  /** Nach 90 Sekunden: Rest zufällig platzieren und loslegen. */
  tick(state, now) {
    if (state.phase !== 'place' || now < state.deadline) return null;
    state.fleets.forEach((fleet) => {
      const ids = fleet.filter((s) => s.x === null).map((s) => s.id);
      if (ids.length) {
        const placed = randomPlacement(fleet, ids, state.size, state.options.touching, state.rng);
        ids.forEach((id) => Object.assign(fleet[id], { x: placed[id].x, y: placed[id].y, dir: placed[id].dir }));
      }
    });
    state.sides.forEach((s) => s.members.forEach((id) => state.ready.add(id)));
    this.startBattle(state);
    return ok(state, [{ type: 'battle' }]);
  },

  getResult(state) {
    if (!state.result) return { over: false, winners: [] };
    return { over: true, winners: [...state.sides[state.result.winnerSide].members], reason: state.result.reason };
  },
};
