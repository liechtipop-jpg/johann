/**
 * Kalenderdaten als lokale Strings «YYYY-MM-DD». Nie toISOString() verwenden –
 * das rechnet in UTC und verschiebt den Tag rund um Mitternacht.
 */
export type ISODate = string;

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now);
}

function parts(iso: ISODate): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = parts(iso);
  return new Date(y, m - 1, d);
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = parts(value);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Anzahl Kalendertage von a bis b (b − a), unabhängig von der Sommerzeit. */
export function diffDays(a: ISODate, b: ISODate): number {
  const [y1, m1, d1] = parts(a);
  const [y2, m2, d2] = parts(b);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DAY_MS);
}

/** 0 = Montag … 6 = Sonntag (Schweizer Woche). */
export function weekdayIndex(iso: ISODate): number {
  return (parseISODate(iso).getDay() + 6) % 7;
}

export function startOfWeek(iso: ISODate): ISODate {
  return addDays(iso, -weekdayIndex(iso));
}

/** Kalenderwoche nach ISO 8601 (Woche mit dem ersten Donnerstag ist KW 1). */
export function isoWeek(iso: ISODate): number {
  const thursday = addDays(iso, 3 - weekdayIndex(iso));
  const [year] = parts(thursday);
  return 1 + Math.round(diffDays(startOfWeek(`${year}-01-04`), startOfWeek(iso)) / 7);
}

const formats = {
  full: new Intl.DateTimeFormat('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  long: new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'long', year: 'numeric' }),
  medium: new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'short', year: 'numeric' }),
  short: new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  weekday: new Intl.DateTimeFormat('de-CH', { weekday: 'short', day: 'numeric', month: 'short' }),
  dayMonth: new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'short' }),
};

export type DateStyle = keyof typeof formats;

/**
 * full: Mittwoch, 4. November 2026 · long: 4. November 2026 · medium: 4. Nov. 2026
 * short: 04.11.2026 · weekday: Mi., 4. Nov. · dayMonth: 4. Nov.
 */
export function formatDate(iso: ISODate, style: DateStyle = 'medium'): string {
  return formats[style].format(parseISODate(iso));
}

export function formatTimestamp(ms: number, style: DateStyle = 'medium'): string {
  return formats[style].format(new Date(ms));
}

/** heute · morgen · übermorgen · in 5 Tagen · gestern · vor 3 Tagen */
export function relativeDays(days: number): string {
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  if (days === 2) return 'übermorgen';
  if (days === -1) return 'gestern';
  return days > 0 ? `in ${days} Tagen` : `vor ${-days} Tagen`;
}

export function greeting(hour: number): string {
  if (hour >= 5 && hour < 11) return 'Guten Morgen';
  if (hour >= 11 && hour < 18) return 'Guten Tag';
  if (hour >= 18) return 'Guten Abend';
  return 'Hallo';
}

export interface SemesterSuggestion {
  name: string;
  start: ISODate;
  end: ISODate;
}

/** Montag der ISO-Kalenderwoche `week` im Jahr `year`. */
function mondayOfWeek(year: number, week: number): ISODate {
  return addDays(startOfWeek(`${year}-01-04`), (week - 1) * 7);
}

/**
 * Vorschlag für das laufende Semester an Zürcher Mittelschulen:
 * Herbstsemester ab Schulbeginn (KW 34) bis Ende Januar, Frühlingssemester Februar bis Mitte Juli.
 */
export function suggestSemester(today: ISODate): SemesterSuggestion {
  const [year, month] = parts(today);
  if (month >= 8) {
    return { name: `HS ${year}/${String(year + 1).slice(2)}`, start: mondayOfWeek(year, 34), end: `${year + 1}-01-31` };
  }
  if (month === 1) {
    return { name: `HS ${year - 1}/${String(year).slice(2)}`, start: mondayOfWeek(year - 1, 34), end: `${year}-01-31` };
  }
  return { name: `FS ${year}`, start: `${year}-02-01`, end: `${year}-07-15` };
}

/** Das Semester nach `previous` (für «Semester hinzufügen»). */
export function nextSemesterAfter(previous: { start: ISODate; end: ISODate }): SemesterSuggestion {
  return suggestSemester(addDays(previous.end, 20));
}

/** Semester, das ein Datum enthält; sonst das zuletzt begonnene; sonst das erste. */
export function semesterForDate<T extends { start: ISODate; end: ISODate }>(semesters: T[], date: ISODate): T | undefined {
  const sorted = [...semesters].sort((a, b) => a.start.localeCompare(b.start));
  const containing = sorted.find((s) => s.start <= date && date <= s.end);
  if (containing) return containing;
  const started = sorted.filter((s) => s.start <= date);
  return started.at(-1) ?? sorted[0];
}
