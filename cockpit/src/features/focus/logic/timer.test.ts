import { describe, expect, it } from 'vitest';
import {
  catchUp,
  configure,
  DEFAULT_FOCUS_PREFS,
  endsAt,
  FCE_SEGMENTS,
  finishEarly,
  idleTimer,
  pause,
  plannedMs,
  progress,
  remainingMs,
  resume,
  start,
  stop,
  tick,
} from './timer';

const MIN = 60_000;
const prefs = DEFAULT_FOCUS_PREFS;
const T0 = 1_700_000_000_000;

describe('Fokus-Timer', () => {
  it('nimmt im Leerlauf die aktuellen Einstellungen', () => {
    const s = idleTimer();
    expect(plannedMs(s, prefs)).toBe(25 * MIN);
    expect(plannedMs(s, { ...prefs, focusMinutes: 50 })).toBe(50 * MIN);
    expect(remainingMs(s, prefs, T0)).toBe(25 * MIN);
  });

  it('berechnet die Restzeit aus Zeitstempeln, auch mit Pausen', () => {
    let s = start(idleTimer(), prefs, T0);
    expect(remainingMs(s, prefs, T0 + 10 * MIN)).toBe(15 * MIN);
    s = pause(s, T0 + 10 * MIN);
    // Pausiert vergeht keine Zeit – auch nicht nach einer Stunde
    expect(remainingMs(s, prefs, T0 + 70 * MIN)).toBe(15 * MIN);
    s = resume(s, T0 + 70 * MIN);
    expect(remainingMs(s, prefs, T0 + 75 * MIN)).toBe(10 * MIN);
    expect(endsAt(s)).toBe(T0 + 85 * MIN);
    expect(progress(s, prefs, T0 + 75 * MIN)).toBeCloseTo(0.6);
  });

  it('wechselt nach der Fokusrunde in die Pause und speichert den echten Endzeitpunkt', () => {
    const s = start(idleTimer('pomodoro', { subjectId: 'math' }), prefs, T0);
    expect(tick(s, prefs, T0 + 24 * MIN)).toBeNull();
    const t = tick(s, prefs, T0 + 30 * MIN)!;
    expect(t.record).toMatchObject({ kind: 'pomodoro', focusSeconds: 25 * 60, startedAt: T0, endedAt: T0 + 25 * MIN, subjectId: 'math' });
    expect(t.next).toMatchObject({ phase: 'short', status: 'running', startedAt: T0 + 25 * MIN, completedFocus: 1 });
    expect(remainingMs(t.next, prefs, T0 + 27 * MIN)).toBe(3 * MIN);
  });

  it('holt nach einem App-Wechsel alle Wechsel nach', () => {
    const s = start(idleTimer(), prefs, T0);
    const { next, records, finished } = catchUp(s, prefs, T0 + 2 * 60 * MIN);
    expect(records).toHaveLength(1);
    expect(finished).toEqual(['focus', 'short']);
    expect(next).toMatchObject({ phase: 'focus', status: 'idle', completedFocus: 1 });
  });

  it('macht nach jeder vierten Runde eine lange Pause und beginnt dann neu', () => {
    let s = idleTimer();
    let now = T0;
    const phases: string[] = [];
    for (let round = 0; round < 4; round++) {
      s = start(s, prefs, now);
      now += 25 * MIN;
      s = tick(s, prefs, now)!.next;
      phases.push(s.phase);
      now += plannedMs(s, prefs);
      s = tick(s, prefs, now)!.next;
    }
    expect(phases).toEqual(['short', 'short', 'short', 'long']);
    expect(s).toMatchObject({ phase: 'focus', completedFocus: 0 });
  });

  it('startet die Pause nicht automatisch, wenn das ausgeschaltet ist', () => {
    const manual = { ...prefs, autoStartBreaks: false };
    const t = tick(start(idleTimer(), manual, T0), manual, T0 + 25 * MIN)!;
    expect(t.next).toMatchObject({ phase: 'short', status: 'idle' });
  });

  it('speichert beim vorzeitigen Beenden nur Fokuszeit ab einer Minute', () => {
    const s = start(idleTimer(), prefs, T0);
    expect(stop(s, T0 + 30_000).record).toBeUndefined();
    const t = stop(s, T0 + 12 * MIN);
    expect(t.record?.focusSeconds).toBe(12 * 60);
    expect(t.next).toMatchObject({ status: 'idle', phase: 'focus' });
    // Pause überspringen speichert nichts
    const brk = tick(s, prefs, T0 + 25 * MIN)!.next;
    const skipped = finishEarly(brk, prefs, T0 + 26 * MIN);
    expect(skipped.record).toBeUndefined();
    expect(skipped.next).toMatchObject({ phase: 'focus', status: 'idle' });
  });

  it('zählt beim Stoppen einer pausierten Runde die Pause nicht mit', () => {
    let s = start(idleTimer(), prefs, T0);
    s = pause(s, T0 + 10 * MIN);
    const t = stop(s, T0 + 60 * MIN);
    expect(t.record).toMatchObject({ focusSeconds: 10 * 60, endedAt: T0 + 10 * MIN });
  });

  it('führt durch die FCE-Simulation', () => {
    expect(FCE_SEGMENTS.map((x) => x.minutes)).toEqual([75, 80, 40, 14]);
    let s = idleTimer('fce', { examId: 'fce' });
    expect(plannedMs(s, prefs)).toBe(75 * MIN);
    s = start(s, prefs, T0);
    const t = tick(s, prefs, T0 + 75 * MIN)!;
    expect(t.record).toMatchObject({ kind: 'fce', label: 'B2 First – Reading & Use of English', examId: 'fce' });
    expect(t.next).toMatchObject({ phase: 'segment', segmentIndex: 1, status: 'idle' });
    // Teil früher abgeben: Zeit zählt, weiter zum nächsten Teil
    const early = finishEarly(start(t.next, prefs, T0 + 80 * MIN), prefs, T0 + 140 * MIN);
    expect(early.record?.focusSeconds).toBe(60 * 60);
    expect(early.next.segmentIndex).toBe(2);
    // Nach dem letzten Teil beginnt die Vorlage von vorn
    const last = { ...early.next, segmentIndex: 3 };
    const done = tick(start(last, prefs, T0), prefs, T0 + 14 * MIN)!;
    expect(done.next).toMatchObject({ template: 'fce', segmentIndex: 0, status: 'idle', examId: 'fce' });
  });

  it('ändert die Vorlage nur im Leerlauf, die Verknüpfung jederzeit', () => {
    const running = start(idleTimer(), prefs, T0);
    expect(configure(running, { template: 'fce' }).template).toBe('pomodoro');
    expect(configure(running, { subjectId: 'eng' }).subjectId).toBe('eng');
    expect(configure(running, { subjectId: null }).subjectId).toBeUndefined();
    expect(configure(idleTimer(), { template: 'fce' })).toMatchObject({ template: 'fce', phase: 'segment' });
  });
});
