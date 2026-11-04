// Computergegner auf dem Server in einem worker_thread – blockiert den Server nie, mit Zeitlimit.
import { Worker } from 'node:worker_threads';

const TIME = { leicht: 300, mittel: 900, schwer: 2000 };

export class BotPool {
  constructor() {
    this.seq = 0;
    this.waiting = new Map();
    this.spawn();
  }

  spawn() {
    this.worker = new Worker(new URL('./botWorker.js', import.meta.url));
    this.worker.unref();
    this.worker.on('message', ({ id, action }) => {
      const entry = this.waiting.get(id);
      if (!entry) return;
      clearTimeout(entry.timer);
      this.waiting.delete(id);
      entry.resolve(action ?? null);
    });
    this.worker.on('error', (err) => {
      console.error('[bots]', err);
      this.restart();
    });
  }

  restart() {
    for (const entry of this.waiting.values()) {
      clearTimeout(entry.timer);
      entry.resolve(null);
    }
    this.waiting.clear();
    this.worker.terminate().catch(() => {});
    this.spawn();
  }

  choose(gameId, input) {
    const id = ++this.seq;
    const timeLimitMs = TIME[input.level] ?? TIME.mittel;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.waiting.delete(id);
        resolve(null);
        this.restart();
      }, timeLimitMs + 4000);
      this.waiting.set(id, { resolve, timer });
      this.worker.postMessage({ id, gameId, input: { ...input, timeLimitMs } });
    });
  }

  close() {
    return this.worker.terminate();
  }
}
