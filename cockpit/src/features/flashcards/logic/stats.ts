import type { CardState, ReviewLog } from '@/db/schemas';
import { addDays, toISODate, type ISODate } from '@/lib/dates';
import { STATE_LEARNING, STATE_NEW, STATE_RELEARNING, STATE_REVIEW } from './queue';

export interface DayCount {
  date: ISODate;
  count: number;
}

/** Wiederholungen pro Tag der letzten `days` Tage (heute eingeschlossen). */
export function reviewsPerDay(logs: readonly ReviewLog[], today: ISODate, days = 30): Array<DayCount & { again: number }> {
  const start = addDays(today, -(days - 1));
  const map = new Map<ISODate, { count: number; again: number }>();
  for (let i = 0; i < days; i++) map.set(addDays(start, i), { count: 0, again: 0 });
  for (const log of logs) {
    const entry = map.get(toISODate(new Date(log.reviewedAt)));
    if (!entry) continue;
    entry.count++;
    if (log.rating === 1) entry.again++;
  }
  return [...map.entries()].map(([date, v]) => ({ date, ...v }));
}

/** Anteil gewusster Wiederholungen (ohne neue Karten): nicht «Nochmal». */
export function retention(logs: readonly ReviewLog[], since: number): number | null {
  const relevant = logs.filter((l) => l.reviewedAt >= since && l.state === STATE_REVIEW);
  if (relevant.length === 0) return null;
  return relevant.filter((l) => l.rating > 1).length / relevant.length;
}

export function stateCounts(states: readonly CardState[]): { new: number; learning: number; review: number } {
  return {
    new: states.filter((s) => s.state === STATE_NEW).length,
    learning: states.filter((s) => s.state === STATE_LEARNING || s.state === STATE_RELEARNING).length,
    review: states.filter((s) => s.state === STATE_REVIEW).length,
  };
}

/** Wie viele Karten in den nächsten Tagen fällig werden (heute inkl. Überfälliges). */
export function forecast(states: readonly CardState[], today: ISODate, days = 7): DayCount[] {
  const out: DayCount[] = Array.from({ length: days }, (_, i) => ({ date: addDays(today, i), count: 0 }));
  for (const s of states) {
    if (s.state === STATE_NEW) continue;
    const date = toISODate(new Date(s.due));
    const index = date <= today ? 0 : out.findIndex((d) => d.date === date);
    if (index >= 0) out[index].count++;
  }
  return out;
}

/** Tage in Folge mit mindestens einer Wiederholung (bis heute oder gestern). */
export function reviewStreak(logs: readonly ReviewLog[], today: ISODate): number {
  const days = new Set(logs.map((l) => toISODate(new Date(l.reviewedAt))));
  let day = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}
