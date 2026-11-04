import { describe, expect, it } from 'vitest';
import type { StudySession } from '@/db/schemas';
import { addDays, weekdayIndex } from '@/lib/dates';
import { DEFAULT_PLAN_PREFS, availableDays, generatePlan, planProgress, redistributeMissed, reviewMinutes, type PlanPrefs } from './studyplan';

const today = '2026-11-02'; // Montag
const prefs: PlanPrefs = { ...DEFAULT_PLAN_PREFS };
const topics = [
  { id: 'a', effort: 'M' as const },
  { id: 'b', effort: 'S' as const },
  { id: 'c', effort: 'L' as const },
];

function minutesPerDay(sessions: { date: string; minutes: number }[]) {
  const map = new Map<string, number>();
  for (const s of sessions) map.set(s.date, (map.get(s.date) ?? 0) + s.minutes);
  return map;
}

describe('Lernplan-Generator', () => {
  const examDate = addDays(today, 14);
  const plan = generatePlan({ examDate, today, topics, prefs });

  it('plant alle Themen vollständig ein, nur vor der Prüfung', () => {
    expect(plan.overflowMinutes).toBe(0);
    for (const t of topics) {
      const learned = plan.sessions.filter((s) => s.kind === 'learn' && s.topicId === t.id).reduce((n, s) => n + s.minutes, 0);
      expect(learned).toBe(prefs.effortMinutes[t.effort]);
    }
    for (const s of plan.sessions) {
      expect(s.date >= today).toBe(true);
      expect(s.date < examDate).toBe(true);
    }
  });

  it('verteilt die Themen auf verschiedene Tage statt alles am ersten Tag', () => {
    const learnDates = new Set(plan.sessions.filter((s) => s.kind === 'learn').map((s) => s.date));
    expect(learnDates.size).toBe(3);
  });

  it('plant Wiederholungen nach 1, 3 und 7 Tagen', () => {
    const learnA = plan.sessions.find((s) => s.kind === 'learn' && s.topicId === 'a')!;
    const reviews = plan.sessions.filter((s) => s.kind === 'review' && s.topicId === 'a').map((s) => s.date);
    expect(reviews).toEqual([addDays(learnA.date, 1), addDays(learnA.date, 3), addDays(learnA.date, 7)]);
    expect(plan.sessions.find((s) => s.kind === 'review')?.minutes).toBe(reviewMinutes(60));
  });

  it('legt den Repetitionstag auf den letzten Tag vor der Prüfung', () => {
    const repetition = plan.sessions.filter((s) => s.kind === 'repetition');
    expect(repetition).toHaveLength(1);
    expect(repetition[0].date).toBe(addDays(examDate, -1));
    expect(plan.sessions.filter((s) => s.date === repetition[0].date && s.kind !== 'repetition')).toHaveLength(0);
  });

  it('hält die maximale Lernzeit pro Tag ein – auch mit anderen Prüfungen', () => {
    const load = { [today]: 60, [addDays(today, 1)]: 90 };
    const busy = generatePlan({ examDate: addDays(today, 6), today, topics, prefs, load });
    const perDay = minutesPerDay(busy.sessions);
    for (const [day, minutes] of perDay) expect(minutes + (load[day] ?? 0)).toBeLessThanOrEqual(prefs.maxMinutesPerDay);
    expect(perDay.has(addDays(today, 1))).toBe(false);
  });

  it('lässt gesperrte Wochentage und Daten aus', () => {
    const blocked: PlanPrefs = { ...prefs, blockedWeekdays: [5, 6], blockedDates: ['2026-11-04'] };
    const p = generatePlan({ examDate: addDays(today, 14), today, topics, prefs: blocked });
    for (const s of p.sessions) {
      expect([5, 6]).not.toContain(weekdayIndex(s.date));
      expect(s.date).not.toBe('2026-11-04');
    }
    expect(availableDays(today, '2026-11-09', blocked)).toEqual(['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06']);
  });

  it('teilt grosse Themen auf mehrere Tage auf', () => {
    const small: PlanPrefs = { ...prefs, maxMinutesPerDay: 45 };
    const p = generatePlan({ examDate: addDays(today, 10), today, topics: [{ id: 'big', effort: 'L' }], prefs: small });
    const learn = p.sessions.filter((s) => s.kind === 'learn');
    expect(learn.length).toBeGreaterThanOrEqual(2);
    expect(learn.reduce((n, s) => n + s.minutes, 0)).toBe(90);
    for (const minutes of minutesPerDay(p.sessions).values()) expect(minutes).toBeLessThanOrEqual(45);
  });

  it('meldet einen Überlauf, wenn die Zeit nicht reicht', () => {
    const p = generatePlan({ examDate: addDays(today, 2), today, topics, prefs: { ...prefs, maxMinutesPerDay: 60 } });
    // 2 Tage: 1 Lerntag + Repetitionstag → 60 min Lernzeit für 180 min Stoff
    expect(p.overflowMinutes).toBe(120);
  });

  it('plant ohne Repetitionstag, wenn er ausgeschaltet ist', () => {
    const p = generatePlan({ examDate: addDays(today, 7), today, topics, prefs: { ...prefs, repetitionDay: false } });
    expect(p.sessions.some((s) => s.kind === 'repetition')).toBe(false);
  });

  it('kann nicht planen, wenn die Prüfung heute ist', () => {
    expect(generatePlan({ examDate: today, today, topics, prefs })).toEqual({ sessions: [], overflowMinutes: 180, availableDays: 0 });
  });

  it('plant nur noch die Restminuten bereits angefangener Themen', () => {
    const p = generatePlan({ examDate: addDays(today, 10), today, topics: [{ id: 'a', effort: 'L', minutes: 30 }], prefs });
    expect(p.sessions.filter((s) => s.kind === 'learn').reduce((n, s) => n + s.minutes, 0)).toBe(30);
  });
});

const session = (id: string, date: string, extra: Partial<StudySession> = {}): StudySession => ({
  id,
  examId: 'e1',
  date,
  minutes: 30,
  kind: 'learn',
  done: false,
  ...extra,
});

describe('Verpasstes neu verteilen', () => {
  const examDates = new Map([
    ['e1', addDays(today, 5)],
    ['old', addDays(today, -1)],
  ]);

  it('verschiebt verpasste Einheiten auf freie Tage ab heute', () => {
    const r = redistributeMissed({
      sessions: [session('m1', addDays(today, -2)), session('m2', addDays(today, -1)), session('f1', today, { minutes: 60 }), session('d1', addDays(today, -3), { done: true })],
      examDates,
      today,
      prefs,
    });
    // heute: 60 belegt + 30 = 90 → m1 heute; m2 passt nicht mehr → morgen
    expect(r.moved).toEqual([
      { id: 'm1', date: today },
      { id: 'm2', date: addDays(today, 1) },
    ]);
    expect(r.unplaced).toEqual([]);
  });

  it('räumt Einheiten vergangener Prüfungen weg und meldet, was nicht mehr passt', () => {
    const r = redistributeMissed({
      sessions: [session('x', addDays(today, -3), { examId: 'old' }), session('big', addDays(today, -1), { minutes: 120 })],
      examDates,
      today,
      prefs,
    });
    expect(r.obsolete).toEqual(['x']);
    expect(r.unplaced).toEqual(['big']);
  });

  it('legt eine verpasste Repetition auf den letzten freien Tag', () => {
    const r = redistributeMissed({ sessions: [session('r', addDays(today, -1), { kind: 'repetition' })], examDates, today, prefs });
    expect(r.moved).toEqual([{ id: 'r', date: addDays(today, 4) }]);
  });
});

describe('Lernfortschritt', () => {
  it('rechnet mit erledigten Minuten', () => {
    expect(planProgress([{ minutes: 30, done: true }, { minutes: 90, done: false }])).toEqual({ done: 30, total: 120, ratio: 0.25 });
    expect(planProgress([])).toEqual({ done: 0, total: 0, ratio: 0 });
  });
});
