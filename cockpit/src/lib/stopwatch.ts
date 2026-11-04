/**
 * Stoppuhr aus Zeitstempeln: Die verstrichene Zeit wird immer aus Start, Pause und
 * aufsummierter Pausendauer berechnet – sie stimmt also auch nach einem App-Wechsel.
 */
export interface StopwatchFields {
  status: 'idle' | 'running' | 'paused';
  startedAt: number | null;
  pausedAt: number | null;
  pausedMs: number;
}

export function elapsedMs(s: StopwatchFields, now: number): number {
  if (s.startedAt === null || s.status === 'idle') return 0;
  return Math.max(0, (s.status === 'paused' && s.pausedAt !== null ? s.pausedAt : now) - s.startedAt - s.pausedMs);
}

export function startWatch<T extends StopwatchFields>(s: T, now: number): T {
  if (s.status === 'running') return s;
  if (s.status === 'paused') return resumeWatch(s, now);
  return { ...s, status: 'running', startedAt: now, pausedAt: null, pausedMs: 0 };
}

export function pauseWatch<T extends StopwatchFields>(s: T, now: number): T {
  return s.status === 'running' ? { ...s, status: 'paused', pausedAt: now } : s;
}

export function resumeWatch<T extends StopwatchFields>(s: T, now: number): T {
  if (s.status !== 'paused' || s.pausedAt === null) return s;
  return { ...s, status: 'running', pausedMs: s.pausedMs + Math.max(0, now - s.pausedAt), pausedAt: null };
}

export function resetWatch<T extends StopwatchFields>(s: T): T {
  return { ...s, status: 'idle', startedAt: null, pausedAt: null, pausedMs: 0 };
}

/** mm:ss bzw. h:mm:ss (aufgerundet auf ganze Sekunden, für Countdowns). */
export function formatClock(ms: number, round: 'ceil' | 'floor' = 'ceil'): string {
  const total = Math.max(0, round === 'ceil' ? Math.ceil(ms / 1000) : Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
