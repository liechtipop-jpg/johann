import {
  barPattern,
  clickSeconds,
  isSilentBar,
  signatureByLabel,
  trainerBpm,
  type ClickKind,
  type GapOptions,
  type Subdivision,
  type TrainerOptions,
} from '../logic/metronome';

export interface MetronomeConfig {
  bpm: number;
  signature: string;
  subdivision: Subdivision;
  accent: boolean;
  volume: number;
  trainer: TrainerOptions;
  gap: GapOptions;
}

export interface ClickEvent {
  /** AudioContext-Zeit des Klicks */
  time: number;
  /** Position im Takt (inkl. Unterteilungen) */
  index: number;
  /** Schlag im Takt (ab 0) */
  beat: number;
  kind: ClickKind;
  /** Takt seit dem Start (ab 0) */
  bar: number;
  silent: boolean;
  bpm: number;
}

/** So weit im Voraus werden Klicks im Audio-Thread geplant (Sekunden). */
const SCHEDULE_AHEAD = 0.1;

const TONE: Record<ClickKind, { freq: number; gain: number }> = {
  accent: { freq: 1760, gain: 1 },
  group: { freq: 1320, gain: 0.75 },
  beat: { freq: 1100, gain: 0.65 },
  sub: { freq: 820, gain: 0.3 },
};

/**
 * Präzises Metronom nach dem Lookahead-Prinzip: Ein Worker weckt alle 25 ms den Planer,
 * der die Klicks der nächsten 100 ms sample-genau im AudioContext einplant.
 */
export class MetronomeEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private worker: Worker | null = null;
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;
  private config: MetronomeConfig;
  private pattern: ClickKind[];
  private nextTime = 0;
  private clickIndex = 0;
  private bar = 0;
  private queue: ClickEvent[] = [];
  private running = false;

  constructor(config: MetronomeConfig) {
    this.config = config;
    this.pattern = this.buildPattern();
  }

  get isRunning(): boolean {
    return this.running;
  }

  private buildPattern(): ClickKind[] {
    return barPattern(signatureByLabel(this.config.signature), this.config.subdivision, this.config.accent);
  }

  update(config: MetronomeConfig): void {
    const rhythmChanged =
      config.signature !== this.config.signature || config.subdivision !== this.config.subdivision || config.accent !== this.config.accent;
    this.config = config;
    if (rhythmChanged) {
      this.pattern = this.buildPattern();
      // Neuer Rhythmus: der nächste Klick wird wieder die Eins
      this.clickIndex = 0;
    }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(config.volume, this.ctx.currentTime, 0.01);
  }

  /** Aktuelles Tempo (mit Tempo-Trainer abhängig vom Takt). */
  bpmAt(bar: number): number {
    return this.config.trainer.enabled ? trainerBpm(bar, this.config.trainer) : this.config.bpm;
  }

  async start(): Promise<void> {
    if (this.running) return;
    if (!this.ctx) {
      // iOS: Klicks auch bei stummgeschaltetem Klingelton abspielen
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = 'playback';
      this.ctx = new AudioContext({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state !== 'running') await this.ctx.resume();
    this.master!.gain.value = this.config.volume;
    this.running = true;
    this.bar = 0;
    this.clickIndex = 0;
    this.queue = [];
    this.nextTime = this.ctx.currentTime + 0.05;
    this.schedule();
    this.startTicker();
  }

  stop(): void {
    this.running = false;
    this.queue = [];
    this.worker?.postMessage('stop');
    if (this.fallbackTimer !== null) clearInterval(this.fallbackTimer);
    this.fallbackTimer = null;
  }

  dispose(): void {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
    void this.ctx?.close();
    this.ctx = null;
  }

  private startTicker(): void {
    try {
      this.worker ??= new Worker(new URL('./ticker.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = () => this.schedule();
      this.worker.postMessage('start');
    } catch {
      this.fallbackTimer = setInterval(() => this.schedule(), 25);
    }
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!this.running || !ctx) return;
    // Nach einer Unterbrechung (z. B. Tab im Hintergrund) nicht alle verpassten Klicks nachholen
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + SCHEDULE_AHEAD) {
      const kind = this.pattern[this.clickIndex];
      const bpm = this.bpmAt(this.bar);
      const silent = isSilentBar(this.bar, this.config.gap);
      if (!silent) this.click(kind, this.nextTime);
      this.queue.push({
        time: this.nextTime,
        index: this.clickIndex,
        beat: Math.floor(this.clickIndex / this.config.subdivision),
        kind,
        bar: this.bar,
        silent,
        bpm,
      });
      this.nextTime += clickSeconds(bpm, this.config.subdivision);
      this.clickIndex++;
      if (this.clickIndex >= this.pattern.length) {
        this.clickIndex = 0;
        this.bar++;
      }
    }
  }

  private click(kind: ClickKind, time: number): void {
    const ctx = this.ctx!;
    const { freq, gain } = TONE[kind];
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(gain, time + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, time + (kind === 'sub' ? 0.035 : 0.06));
    osc.connect(env).connect(this.master!);
    osc.start(time);
    osc.stop(time + 0.08);
  }

  /** Für die Anzeige: der zuletzt hörbare Klick (synchron zur Audio-Ausgabe). */
  poll(): ClickEvent | null {
    const ctx = this.ctx;
    if (!ctx || this.queue.length === 0) return null;
    const stamp = typeof ctx.getOutputTimestamp === 'function' ? ctx.getOutputTimestamp().contextTime : undefined;
    const audible = stamp && stamp > 0 ? stamp : ctx.currentTime;
    let latest: ClickEvent | null = null;
    while (this.queue.length && this.queue[0].time <= audible) latest = this.queue.shift()!;
    return latest;
  }
}
