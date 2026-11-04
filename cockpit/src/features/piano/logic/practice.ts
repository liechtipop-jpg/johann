import { addDays, diffDays, startOfWeek, type ISODate } from '@/lib/dates';

export interface PracticeEntry {
  date: ISODate;
  seconds: number;
  pieceId?: string;
}

function minutesByDay(logs: readonly PracticeEntry[]): Map<ISODate, number> {
  const map = new Map<ISODate, number>();
  for (const l of logs) map.set(l.date, (map.get(l.date) ?? 0) + l.seconds / 60);
  return map;
}

/** Tage in Folge mit Üben (zählt bis heute oder – falls heute noch nicht geübt – bis gestern). */
export function practiceStreak(logs: readonly PracticeEntry[], today: ISODate): number {
  const days = minutesByDay(logs);
  let day = (days.get(today) ?? 0) > 0 ? today : addDays(today, -1);
  let streak = 0;
  while ((days.get(day) ?? 0) > 0) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

/** Übungsminuten in der Woche von `today` (Montag bis Sonntag). */
export function minutesThisWeek(logs: readonly PracticeEntry[], today: ISODate): number {
  const monday = startOfWeek(today);
  const sunday = addDays(monday, 6);
  return Math.round(logs.filter((l) => l.date >= monday && l.date <= sunday).reduce((n, l) => n + l.seconds / 60, 0));
}

export interface HeatCell {
  date: ISODate;
  minutes: number;
  /** 0 = nichts, 1 = < 15 min, 2 = < 30 min, 3 = < 60 min, 4 = ab 60 min */
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

export function heatLevel(minutes: number): HeatCell['level'] {
  if (minutes <= 0) return 0;
  if (minutes < 15) return 1;
  if (minutes < 30) return 2;
  if (minutes < 60) return 3;
  return 4;
}

/** Kalender-Heatmap: Spalten = Wochen (Montag zuerst), die letzte Spalte ist die aktuelle Woche. */
export function heatmap(logs: readonly PracticeEntry[], today: ISODate, weeks = 18): HeatCell[][] {
  const days = minutesByDay(logs);
  const first = addDays(startOfWeek(today), -7 * (weeks - 1));
  const columns: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(first, w * 7 + d);
      const minutes = Math.round(days.get(date) ?? 0);
      column.push({ date, minutes, level: heatLevel(minutes), future: diffDays(today, date) > 0 });
    }
    columns.push(column);
  }
  return columns;
}

/** Übungsminuten pro Stück. */
export function minutesPerPiece(logs: readonly PracticeEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const l of logs) if (l.pieceId) map.set(l.pieceId, (map.get(l.pieceId) ?? 0) + l.seconds / 60);
  return map;
}
