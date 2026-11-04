import { describe, expect, it } from 'vitest';
import {
  addDays,
  diffDays,
  formatDate,
  greeting,
  isISODate,
  isoWeek,
  nextSemesterAfter,
  relativeDays,
  semesterForDate,
  startOfWeek,
  suggestSemester,
  toISODate,
  weekdayIndex,
} from './dates';

describe('Kalenderdaten', () => {
  it('formatiert lokal statt in UTC (kurz nach Mitternacht)', () => {
    expect(toISODate(new Date(2026, 10, 4, 0, 30))).toBe('2026-11-04');
  });

  it('rechnet über den Wechsel auf die Sommer- und Winterzeit korrekt', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2026-11-10', '2026-11-04')).toBe(-6);
  });

  it('prüft Datumsangaben', () => {
    expect(isISODate('2026-02-28')).toBe(true);
    expect(isISODate('2026-02-29')).toBe(false);
    expect(isISODate('2028-02-29')).toBe(true);
    expect(isISODate('4.11.2026')).toBe(false);
  });

  it('beginnt die Woche am Montag', () => {
    expect(weekdayIndex('2026-11-02')).toBe(0); // Montag
    expect(weekdayIndex('2026-11-08')).toBe(6); // Sonntag
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02');
    expect(startOfWeek('2026-11-02')).toBe('2026-11-02');
  });

  it('berechnet ISO-Kalenderwochen', () => {
    expect(isoWeek('2026-11-04')).toBe(45);
    expect(isoWeek('2026-01-01')).toBe(1);
    expect(isoWeek('2026-12-31')).toBe(53);
    expect(isoWeek('2027-01-01')).toBe(53);
    expect(isoWeek('2027-01-04')).toBe(1);
  });

  it('formatiert im Schweizer Format', () => {
    expect(formatDate('2026-11-04', 'full')).toBe('Mittwoch, 4. November 2026');
    expect(formatDate('2026-11-04', 'short')).toBe('04.11.2026');
    expect(formatDate('2026-11-04', 'long')).toBe('4. November 2026');
  });

  it('beschreibt Abstände in Worten', () => {
    expect(relativeDays(0)).toBe('heute');
    expect(relativeDays(1)).toBe('morgen');
    expect(relativeDays(2)).toBe('übermorgen');
    expect(relativeDays(5)).toBe('in 5 Tagen');
    expect(relativeDays(-1)).toBe('gestern');
    expect(relativeDays(-3)).toBe('vor 3 Tagen');
  });

  it('grüsst passend zur Tageszeit', () => {
    expect(greeting(7)).toBe('Guten Morgen');
    expect(greeting(14)).toBe('Guten Tag');
    expect(greeting(20)).toBe('Guten Abend');
    expect(greeting(2)).toBe('Hallo');
  });
});

describe('Semester', () => {
  it('schlägt im Herbst das Herbstsemester vor', () => {
    expect(suggestSemester('2026-11-04')).toEqual({ name: 'HS 2026/27', start: '2026-08-17', end: '2027-01-31' });
  });

  it('zählt den Januar zum Herbstsemester des Vorjahres', () => {
    expect(suggestSemester('2027-01-15')).toEqual({ name: 'HS 2026/27', start: '2026-08-17', end: '2027-01-31' });
  });

  it('schlägt im Frühling das Frühlingssemester vor', () => {
    expect(suggestSemester('2027-03-10')).toEqual({ name: 'FS 2027', start: '2027-02-01', end: '2027-07-15' });
    expect(nextSemesterAfter({ start: '2026-08-17', end: '2027-01-31' }).name).toBe('FS 2027');
    expect(nextSemesterAfter({ start: '2027-02-01', end: '2027-07-15' }).name).toBe('HS 2027/28');
  });

  it('findet das Semester zu einem Datum', () => {
    const list = [
      { id: 'fs', start: '2026-02-01', end: '2026-07-15' },
      { id: 'hs', start: '2026-08-17', end: '2027-01-31' },
    ];
    expect(semesterForDate(list, '2026-11-04')?.id).toBe('hs');
    expect(semesterForDate(list, '2026-07-30')?.id).toBe('fs'); // Sommerferien → zuletzt begonnenes
    expect(semesterForDate(list, '2025-12-01')?.id).toBe('fs'); // vor allem → erstes
    expect(semesterForDate([], '2026-11-04')).toBeUndefined();
  });
});
