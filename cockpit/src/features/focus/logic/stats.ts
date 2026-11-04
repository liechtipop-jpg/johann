import { addDays, startOfWeek, type ISODate } from '@/lib/dates';

export interface FocusEntry {
  date: ISODate;
  focusSeconds: number;
  subjectId?: string;
}

/** Fokusminuten der Woche (Montag bis Sonntag): gesamt, pro Tag und pro Fach. */
export function weekFocus(sessions: readonly FocusEntry[], today: ISODate) {
  const monday = startOfWeek(today);
  const days = Array.from({ length: 7 }, (_, i) => ({ date: addDays(monday, i), minutes: 0 }));
  const bySubject = new Map<string, number>();
  let total = 0;
  for (const s of sessions) {
    const index = days.findIndex((d) => d.date === s.date);
    if (index < 0) continue;
    const minutes = s.focusSeconds / 60;
    days[index].minutes += minutes;
    total += minutes;
    const key = s.subjectId ?? '';
    bySubject.set(key, (bySubject.get(key) ?? 0) + minutes);
  }
  return {
    total: Math.round(total),
    days: days.map((d) => ({ ...d, minutes: Math.round(d.minutes) })),
    subjects: [...bySubject.entries()]
      .map(([subjectId, minutes]) => ({ subjectId: subjectId || undefined, minutes: Math.round(minutes) }))
      .sort((a, b) => b.minutes - a.minutes),
  };
}
