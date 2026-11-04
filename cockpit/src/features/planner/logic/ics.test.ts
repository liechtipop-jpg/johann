import { describe, expect, it } from 'vitest';
import { buildIcs, escapeText, foldLine, icsFileName } from './ics';

const now = new Date('2026-11-04T09:30:00Z');
const exam = {
  id: 'e1',
  title: 'Prüfung Unité 4',
  date: '2026-11-20',
  topics: [
    { id: 't1', title: 'Passé composé', effort: 'M' as const },
    { id: 't2', title: 'Vocabulaire; famille', effort: 'S' as const },
  ],
  notes: 'Wörterbuch mitnehmen',
};

describe('.ics-Export', () => {
  it('erstellt einen ganztägigen Termin mit Erinnerung um 18 Uhr am Vortag', () => {
    const ics = buildIcs([{ exam, subjectName: 'Französisch' }], now);
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(lines).toContain('DTSTART;VALUE=DATE:20261120');
    expect(lines).toContain('DTEND;VALUE=DATE:20261121');
    expect(lines).toContain('DTSTAMP:20261104T093000Z');
    expect(lines).toContain('UID:e1@cockpit.app');
    expect(lines).toContain('SUMMARY:Französisch: Prüfung Unité 4');
    expect(lines).toContain('TRIGGER:-PT6H');
    expect(ics).not.toContain('VTIMEZONE');
  });

  it('nutzt bei einer Uhrzeit die Zürcher Zeitzone und erinnert 24 Stunden vorher', () => {
    const ics = buildIcs([{ exam: { ...exam, time: '08:15' }, subjectName: 'Französisch' }], now);
    expect(ics).toContain('BEGIN:VTIMEZONE\r\nTZID:Europe/Zurich');
    expect(ics).toContain('DTSTART;TZID=Europe/Zurich:20261120T081500');
    expect(ics).toContain('DTEND;TZID=Europe/Zurich:20261120T091500');
    expect(ics).toContain('TRIGGER:-P1D');
  });

  it('maskiert Sonderzeichen und listet die Themen', () => {
    expect(escapeText('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne');
    const ics = buildIcs([{ exam, subjectName: 'Französisch' }], now).replace(/\r\n /g, '');
    expect(ics).toContain('DESCRIPTION:Themen: Passé composé\\, Vocabulaire\\; famille\\nWörterbuch mitnehmen');
  });

  it('faltet lange Zeilen nach 75 Bytes, ohne Umlaute zu zerschneiden', () => {
    const long = `SUMMARY:${'Prüfung '.repeat(20)}`;
    const folded = foldLine(long);
    const encoder = new TextEncoder();
    for (const part of folded.split('\r\n')) expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe(long);
  });

  it('exportiert mehrere Prüfungen in eine Datei', () => {
    const ics = buildIcs(
      [
        { exam, subjectName: 'Französisch' },
        { exam: { ...exam, id: 'e2', title: 'Funktionen', topics: [], notes: undefined }, subjectName: 'Mathematik' },
      ],
      now,
    );
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
  });

  it('erzeugt lesbare Dateinamen', () => {
    expect(icsFileName('Französisch – Prüfung Unité 4')).toBe('franzoesisch-pruefung-unite-4.ics');
    expect(icsFileName('')).toBe('pruefungen.ics');
  });
});
