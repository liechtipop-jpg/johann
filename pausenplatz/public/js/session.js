// Sitzungen: online (Server-autoritativ) oder lokal im Browser (gegen Computer bzw. zu zweit an einem Gerät).
import { getGame } from '/shared/games/index.js';
import { cryptoRng } from '/shared/util/rng.js';
import { on, request } from './net.js';

export class OnlineSession {
  constructor(gameId) {
    this.gameId = gameId;
    this.kind = 'online';
    this.subs = new Set();
    this.off = on('game:view', (payload) => {
      if (payload.gameId !== this.gameId) return;
      this.last = payload;
      this.subs.forEach((fn) => fn(payload));
    });
  }
  subscribe(fn) {
    this.subs.add(fn);
    if (this.last) fn(this.last);
    return () => this.subs.delete(fn);
  }
  act(action) {
    return request('game:action', { action });
  }
  destroy() {
    this.off();
    this.subs.clear();
  }
}

let worker = null;
let seq = 0;
const waiting = new Map();
function aiWorker() {
  if (!worker) {
    worker = new Worker('/js/workers/ai-worker.js', { type: 'module' });
    worker.onmessage = ({ data }) => {
      waiting.get(data.id)?.(data.action);
      waiting.delete(data.id);
    };
  }
  return worker;
}
export function askAi(gameId, view, legal, level, playerId) {
  const id = ++seq;
  return new Promise((resolve) => {
    waiting.set(id, resolve);
    aiWorker().postMessage({ id, gameId, view, legal, level, playerId });
  });
}

/** Lokales Spiel: das gleiche Spielmodul wie auf dem Server, KI im Web Worker. */
export class LocalSession {
  constructor(gameId, { players, options = {}, aiPlayers = {}, humans = [] }) {
    this.gameId = gameId;
    this.game = getGame(gameId);
    this.kind = Object.keys(aiPlayers).length ? 'ai' : 'local';
    this.players = players;
    this.aiPlayers = aiPlayers;
    this.humans = humans;
    this.options = options;
    this.subs = new Set();
    this.viewer = humans[0];
    this.alive = true;
    this.thinking = new Set();
    this.restart();
  }
  restart(swap = false) {
    clearTimeout(this.tickTimer);
    if (swap) this.options = { ...this.options, firstTeam: this.options.firstTeam === 'blue' ? 'red' : 'blue' };
    this.state = this.game.setup(this.players, this.options, cryptoRng());
    this.thinking.clear();
    this.emit([]);
  }
  payload(events = []) {
    const result = this.game.getResult(this.state);
    if (this.kind === 'local') {
      const turn = this.humans.find((id) => this.game.getLegalActions(this.state, id).length);
      if (turn) this.viewer = turn;
    }
    return { gameId: this.gameId, view: this.game.getView(this.state, this.viewer), legal: result.over ? [] : this.game.getLegalActions(this.state, this.viewer), result, now: Date.now(), events, me: this.viewer };
  }
  emit(events) {
    if (!this.alive) return;
    const payload = this.payload(events);
    this.subs.forEach((fn) => fn(payload));
    if (payload.result.over) return;
    clearTimeout(this.tickTimer);
    const at = this.game.nextTick?.(this.state);
    if (at != null) this.tickTimer = setTimeout(() => this.tick(), Math.max(0, at - Date.now()) + 5);
    this.runAi();
  }
  tick() {
    const res = this.game.tick(this.state, Date.now());
    if (res && !res.error) {
      this.state = res.state;
      this.emit(res.events ?? []);
    }
  }
  runAi() {
    for (const [id, level] of Object.entries(this.aiPlayers)) {
      if (this.thinking.has(id)) continue;
      const legal = this.game.getLegalActions(this.state, id);
      if (!legal.length) continue;
      this.thinking.add(id);
      const started = Date.now();
      askAi(this.gameId, this.game.getView(this.state, id), legal, level, id).then((action) => {
        const wait = Math.max(0, 450 - (Date.now() - started));
        setTimeout(() => {
          this.thinking.delete(id);
          if (!this.alive) return;
          const res = action ? this.apply(id, action) : { error: 'none' };
          if (res.error) {
            const list = this.game.getLegalActions(this.state, id);
            if (list.length) this.apply(id, list[0]);
          }
        }, wait);
      });
    }
  }
  apply(playerId, action) {
    const res = this.game.applyAction(this.state, playerId, action, { now: Date.now() });
    if (!res || res.error) return { error: res?.error ?? 'invalid' };
    this.state = res.state;
    this.emit(res.events ?? []);
    return { ok: true };
  }
  subscribe(fn) {
    this.subs.add(fn);
    fn(this.payload());
    return () => this.subs.delete(fn);
  }
  act(action) {
    return Promise.resolve(this.apply(this.viewer, action));
  }
  destroy() {
    this.alive = false;
    clearTimeout(this.tickTimer);
    this.subs.clear();
  }
}
