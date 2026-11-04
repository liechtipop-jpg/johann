import { describe, expect, it } from 'vitest';
import { elapsedMs, formatClock, pauseWatch, resetWatch, resumeWatch, startWatch, type StopwatchFields } from './stopwatch';

const idle: StopwatchFields = { status: 'idle', startedAt: null, pausedAt: null, pausedMs: 0 };

describe('Stoppuhr', () => {
  it('rechnet mit Zeitstempeln und Pausen', () => {
    let s = startWatch(idle, 1000);
    expect(elapsedMs(s, 6000)).toBe(5000);
    s = pauseWatch(s, 6000);
    expect(elapsedMs(s, 60_000)).toBe(5000);
    s = resumeWatch(s, 10_000);
    expect(elapsedMs(s, 12_000)).toBe(7000);
    expect(startWatch(s, 99_999)).toBe(s);
    expect(elapsedMs(resetWatch(s), 20_000)).toBe(0);
  });

  it('formatiert Zeiten', () => {
    expect(formatClock(25 * 60_000)).toBe('25:00');
    expect(formatClock(59_001)).toBe('01:00');
    expect(formatClock(59_001, 'floor')).toBe('00:59');
    expect(formatClock(75 * 60_000 + 5000)).toBe('1:15:05');
    expect(formatClock(-5)).toBe('00:00');
  });
});
