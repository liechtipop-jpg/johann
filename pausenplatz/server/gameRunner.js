// Verbindet einen Raum mit einem Spielmodul: Zustand, Views, Zeit (tick), Bots und Ersatzzüge.
import { getGame } from '../shared/games/index.js';
import { hasAi } from '../shared/ai/index.js';
import { randomAction } from '../shared/util/actions.js';
import { config } from './config.js';
import { secureRng } from './random.js';

export class GameSession {
  constructor(room, { send, onEnd, botPool, rng = secureRng() }) {
    this.room = room;
    this.game = getGame(room.gameId);
    this.send = send;
    this.onEnd = onEnd;
    this.botPool = botPool;
    this.rng = rng;
    this.pending = new Map();
    this.fallback = new Map();
    this.stopped = false;
    this.version = 0;
  }

  players() {
    return this.room.seats
      .map((s, seat) => ({ seat, s }))
      .filter(({ s }) => s.playerId)
      .map(({ seat, s }) => {
        const p = this.room.players.get(s.playerId);
        return { id: p.id, name: p.name, team: s.team, seat, isBot: p.isBot };
      });
  }

  start() {
    const options = { ...this.room.options, mode: this.room.mode, firstTeam: this.room.firstTeam, customCards: this.room.customCards };
    this.state = this.game.setup(this.players(), options, this.rng);
    this.update([]);
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.tickTimer);
    for (const t of [...this.pending.values(), ...this.fallback.values()]) clearTimeout(t);
    this.pending.clear();
    this.fallback.clear();
  }

  act(playerId, action) {
    if (this.stopped || this.over) return { error: 'game_over' };
    if (!action || typeof action !== 'object' || typeof action.type !== 'string') return { error: 'invalid' };
    let res;
    try {
      res = this.game.applyAction(this.state, playerId, action, { now: Date.now() });
    } catch (err) {
      console.error(`[${this.game.id}] applyAction`, err);
      return { error: 'invalid' };
    }
    if (!res || res.error) return { error: res?.error ?? 'invalid' };
    this.state = res.state;
    this.update(res.events ?? []);
    return { ok: true };
  }

  viewFor(playerId) {
    const view = this.game.getView(this.state, playerId);
    const legal = playerId ? this.game.getLegalActions(this.state, playerId) : [];
    return { gameId: this.game.id, view, legal, result: this.result, now: Date.now() };
  }

  broadcast(events) {
    for (const p of this.room.players.values()) {
      if (p.isBot || !p.connected) continue;
      const seated = this.room.seats.some((s) => s.playerId === p.id);
      const payload = this.viewFor(seated ? p.id : null);
      payload.events = events.filter((e) => !e.to || e.to.includes(p.id));
      this.send(p, payload);
    }
  }

  update(events) {
    this.version++;
    this.result = this.game.getResult(this.state);
    this.broadcast(events);
    if (this.result.over) {
      this.over = true;
      this.stop();
      this.onEnd(this.result);
      return;
    }
    this.scheduleTick();
    this.scheduleAutomatic();
  }

  scheduleTick() {
    clearTimeout(this.tickTimer);
    const at = this.game.nextTick?.(this.state);
    if (at == null) return;
    this.tickTimer = setTimeout(() => {
      if (this.stopped) return;
      const res = this.game.tick(this.state, Date.now());
      if (res && !res.error) {
        this.state = res.state;
        this.update(res.events ?? []);
      } else this.scheduleTick();
    }, Math.min(2 ** 31 - 1, Math.max(0, at - Date.now()) + 5));
  }

  /** Bots ziehen nach kurzer Pause; getrennte Spieler bekommen nach einer Wartezeit einen Ersatzzug. */
  scheduleAutomatic() {
    for (const { id } of this.players()) {
      const player = this.room.players.get(id);
      const legal = this.game.getLegalActions(this.state, id);
      if (!legal.length) continue;
      const auto = player.isBot || player.gone;
      if (auto && !this.pending.has(id)) {
        this.pending.set(id, setTimeout(() => this.autoMove(id, player.botLevel ?? 'mittel'), config.botDelayMs));
      } else if (!auto && !player.connected && !this.fallback.has(id)) {
        this.fallback.set(id, setTimeout(() => {
          this.fallback.delete(id);
          if (!player.connected) this.autoMove(id, 'mittel');
        }, config.disconnectedTurnMs));
      }
    }
  }

  async autoMove(playerId, level) {
    this.pending.delete(playerId);
    if (this.stopped) return;
    const legal = this.game.getLegalActions(this.state, playerId);
    if (!legal.length) return;
    const version = this.version;
    let action = null;
    if (hasAi(this.game.id) && this.botPool) {
      action = await this.botPool.choose(this.game.id, { view: this.game.getView(this.state, playerId), legal, level, playerId });
    }
    if (this.stopped) return;
    if (version !== this.version) {
      // Inzwischen hat sich etwas geändert – neu planen.
      this.scheduleAutomatic();
      return;
    }
    const res = action ? this.act(playerId, action) : { error: 'none' };
    if (res.error) {
      const fallback = randomAction(this.game.getLegalActions(this.state, playerId), this.rng);
      if (fallback) this.act(playerId, fallback);
    }
  }
}
