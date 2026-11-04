import type { Effort, StudySession } from '@/db/schemas';
import { addDays, weekdayIndex, type ISODate } from '@/lib/dates';

/** Einstellungen des Lernplans (Standard: 90 min pro Tag, Wiederholungen nach 1, 3 und 7 Tagen). */
export interface PlanPrefs {
  maxMinutesPerDay: number;
  /** 0 = Montag … 6 = Sonntag */
  blockedWeekdays: number[];
  blockedDates: ISODate[];
  effortMinutes: Record<Effort, number>;
  reviewOffsets: number[];
  repetitionDay: boolean;
}

export const DEFAULT_PLAN_PREFS: PlanPrefs = {
  maxMinutesPerDay: 90,
  blockedWeekdays: [],
  blockedDates: [],
  effortMinutes: { S: 30, M: 60, L: 90 },
  reviewOffsets: [1, 3, 7],
  repetitionDay: true,
};

export type SessionKind = StudySession['kind'];
export interface PlannedSession {
  date: ISODate;
  topicId?: string;
  minutes: number;
  kind: SessionKind;
}

export interface PlanTopic {
  id: string;
  effort: Effort;
  /** Noch zu lernende Minuten (z. B. wenn ein Teil schon erledigt ist); sonst aus dem Aufwand. */
  minutes?: number;
}

export interface PlanInput {
  examDate: ISODate;
  today: ISODate;
  topics: readonly PlanTopic[];
  prefs: PlanPrefs;
  /** Bereits belegte Minuten pro Tag (andere Prüfungen) */
  load?: Readonly<Record<ISODate, number>>;
}

export interface PlanResult {
  sessions: PlannedSession[];
  /** Lernminuten, die nicht mehr in den Plan passen */
  overflowMinutes: number;
  /** Anzahl verfügbarer Tage vor der Prüfung */
  availableDays: number;
}

const MIN_PIECE = 15;
const KIND_ORDER: Record<SessionKind, number> = { learn: 0, review: 1, repetition: 2 };
const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/** Dauer einer Wiederholung: ein Viertel der Lernzeit, mindestens 10 Minuten. */
export function reviewMinutes(topicMinutes: number): number {
  return Math.max(10, round5(topicMinutes * 0.25));
}

/** Lerntage von `from` bis zum Tag vor der Prüfung, ohne gesperrte Wochentage und Daten. */
export function availableDays(from: ISODate, examDate: ISODate, prefs: Pick<PlanPrefs, 'blockedWeekdays' | 'blockedDates'>): ISODate[] {
  const blocked = new Set(prefs.blockedDates);
  const days: ISODate[] = [];
  for (let day = from; day < examDate; day = addDays(day, 1)) {
    if (prefs.blockedWeekdays.includes(weekdayIndex(day)) || blocked.has(day)) continue;
    days.push(day);
  }
  return days;
}

function sortSessions<T extends PlannedSession>(sessions: T[]): T[] {
  return sessions.sort((a, b) => a.date.localeCompare(b.date) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}

/**
 * Lernplan-Generator:
 * 1. Verfügbare Tage bis zur Prüfung (gesperrte Tage fallen weg, Kapazität = Maximum − Belegung).
 * 2. Der letzte freie Tag wird als Repetitionstag reserviert.
 * 3. Themen werden gleichmässig auf die ersten zwei Drittel der Lerntage verteilt (grosse Themen geteilt).
 * 4. Wiederholungen nach den gewählten Abständen, immer vor dem Repetitionstag.
 * 5. Was nicht passt, wird als Überlauf gemeldet.
 */
export function generatePlan({ examDate, today, topics, prefs, load = {} }: PlanInput): PlanResult {
  const days = availableDays(today, examDate, prefs);
  const free = new Map(days.map((d) => [d, Math.max(0, prefs.maxMinutesPerDay - (load[d] ?? 0))]));
  const items = topics
    .map((t) => ({ id: t.id, minutes: Math.max(0, Math.round(t.minutes ?? prefs.effortMinutes[t.effort])) }))
    .filter((t) => t.minutes > 0);
  const totalMinutes = items.reduce((s, t) => s + t.minutes, 0);
  if (items.length === 0) return { sessions: [], overflowMinutes: 0, availableDays: days.length };
  if (days.length === 0) return { sessions: [], overflowMinutes: totalMinutes, availableDays: 0 };

  const sessions: PlannedSession[] = [];
  const place = (date: ISODate, minutes: number, kind: SessionKind, topicId?: string) => {
    sessions.push({ date, minutes, kind, topicId });
    free.set(date, (free.get(date) ?? 0) - minutes);
  };

  const repetition =
    prefs.repetitionDay && days.length >= 2 ? ([...days].reverse().find((d) => (free.get(d) ?? 0) >= MIN_PIECE) ?? null) : null;
  const learnDays = days.filter((d) => d !== repetition);
  const windowSize = Math.max(1, Math.ceil((learnDays.length * 2) / 3));

  // Themen in Stücke von höchstens einem Tag teilen.
  const chunks: Array<{ topicId: string; minutes: number }> = [];
  for (const item of items) {
    const parts = Math.max(1, Math.ceil(item.minutes / Math.max(MIN_PIECE, prefs.maxMinutesPerDay)));
    const base = parts === 1 ? item.minutes : round5(item.minutes / parts);
    for (let i = 0; i < parts; i++) {
      chunks.push({ topicId: item.id, minutes: i < parts - 1 ? base : item.minutes - base * (parts - 1) });
    }
  }

  let overflowMinutes = 0;
  const lastLearned = new Map<string, ISODate>();
  chunks.forEach((chunk, index) => {
    if (learnDays.length === 0) {
      overflowMinutes += chunk.minutes;
      return;
    }
    const target = Math.min(windowSize - 1, Math.floor((index * windowSize) / chunks.length));
    const order = [...learnDays.slice(target), ...learnDays.slice(0, target).reverse()];
    let remaining = chunk.minutes;
    const whole = order.find((d) => (free.get(d) ?? 0) >= remaining);
    if (whole) {
      place(whole, remaining, 'learn', chunk.topicId);
      remaining = 0;
    } else {
      // Kein Tag hat genug Platz: auf mehrere Tage aufteilen.
      for (const day of order) {
        if (remaining <= 0) break;
        const room = free.get(day) ?? 0;
        if (room < MIN_PIECE) continue;
        const minutes = Math.min(room, remaining);
        place(day, minutes, 'learn', chunk.topicId);
        remaining -= minutes;
      }
    }
    overflowMinutes += remaining;
    for (const s of sessions) {
      if (s.topicId === chunk.topicId && s.kind === 'learn' && s.date > (lastLearned.get(chunk.topicId) ?? ''))
        lastLearned.set(chunk.topicId, s.date);
    }
  });

  // Wiederholungen nach 1, 3, 7 … Tagen – vor dem Repetitionstag (sonst übernimmt ihn der Repetitionstag).
  const limit = repetition ?? examDate;
  const offsets = [...new Set(prefs.reviewOffsets)].filter((o) => o > 0).sort((a, b) => a - b);
  for (const item of items) {
    const learned = lastLearned.get(item.id);
    if (!learned) continue;
    const minutes = reviewMinutes(item.minutes);
    let previous = learned;
    for (const offset of offsets) {
      let target = addDays(learned, offset);
      if (target <= previous) target = addDays(previous, 1);
      const day = learnDays.find((d) => d >= target && d < limit && (free.get(d) ?? 0) >= minutes);
      if (!day) break;
      place(day, minutes, 'review', item.id);
      previous = day;
    }
  }

  if (repetition) {
    place(repetition, Math.min(free.get(repetition) ?? 0, Math.max(20, round5(totalMinutes * 0.25))), 'repetition');
  }

  // Gleiche Einheiten am selben Tag zusammenfassen.
  const merged = new Map<string, PlannedSession>();
  for (const s of sessions) {
    const key = `${s.date}|${s.kind}|${s.topicId ?? ''}`;
    const existing = merged.get(key);
    if (existing) existing.minutes += s.minutes;
    else merged.set(key, { ...s });
  }
  return { sessions: sortSessions([...merged.values()]), overflowMinutes, availableDays: days.length };
}

export interface RedistributeInput {
  sessions: readonly StudySession[];
  /** Prüfungsdatum je examId */
  examDates: ReadonlyMap<string, ISODate>;
  today: ISODate;
  prefs: PlanPrefs;
}

export interface RedistributeResult {
  /** Neue Daten für verschobene Einheiten */
  moved: Array<{ id: string; date: ISODate }>;
  /** Einheiten von Prüfungen, die schon vorbei sind */
  obsolete: string[];
  /** Einheiten, für die kein Platz mehr ist */
  unplaced: string[];
}

/** «Verpasstes neu verteilen»: offene Einheiten vor heute auf freie Tage bis zur Prüfung verschieben. */
export function redistributeMissed({ sessions, examDates, today, prefs }: RedistributeInput): RedistributeResult {
  const missed = sortSessions(sessions.filter((s) => !s.done && s.date < today).map((s) => ({ ...s })));
  const load = new Map<ISODate, number>();
  for (const s of sessions) {
    if (s.date >= today) load.set(s.date, (load.get(s.date) ?? 0) + s.minutes);
  }
  const result: RedistributeResult = { moved: [], obsolete: [], unplaced: [] };
  for (const session of missed) {
    const examDate = examDates.get(session.examId);
    if (!examDate || examDate <= today) {
      result.obsolete.push(session.id);
      continue;
    }
    const days = availableDays(today, examDate, prefs);
    const fits = (d: ISODate) => prefs.maxMinutesPerDay - (load.get(d) ?? 0) >= session.minutes;
    const day = session.kind === 'repetition' ? [...days].reverse().find(fits) : days.find(fits);
    if (!day) {
      result.unplaced.push(session.id);
      continue;
    }
    load.set(day, (load.get(day) ?? 0) + session.minutes);
    result.moved.push({ id: session.id, date: day });
  }
  return result;
}

/** Lernfortschritt einer Prüfung: erledigte von geplanten Minuten. */
export function planProgress(sessions: readonly Pick<StudySession, 'minutes' | 'done'>[]): { done: number; total: number; ratio: number } {
  const total = sessions.reduce((s, x) => s + x.minutes, 0);
  const done = sessions.filter((x) => x.done).reduce((s, x) => s + x.minutes, 0);
  return { done, total, ratio: total > 0 ? done / total : 0 };
}
