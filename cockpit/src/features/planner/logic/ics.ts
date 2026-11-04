import type { Exam } from '@/db/schemas';
import { addDays } from '@/lib/dates';

/**
 * Kalenderdatei (RFC 5545) für Prüfungen – mit Erinnerung am Vortag:
 * ganztägige Termine um 18 Uhr am Vortag, Termine mit Uhrzeit 24 Stunden vorher.
 */

export interface IcsExam {
  exam: Pick<Exam, 'id' | 'title' | 'date' | 'time' | 'topics' | 'notes'>;
  subjectName: string;
}

const VTIMEZONE_ZURICH = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Zurich',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

/** Sonderzeichen in Textfeldern maskieren. */
export function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Zeilen nach 75 Bytes falten (UTF-8, ohne Zeichen zu zerschneiden). */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // Folgezeilen beginnen mit einem Leerzeichen
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const compactDate = (iso: string) => iso.replace(/-/g, '');

function utcStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const end = Math.min(23 * 60 + 59, h * 60 + m + 60);
  return `${String(Math.floor(end / 60)).padStart(2, '0')}${String(end % 60).padStart(2, '0')}00`;
}

export function buildIcs(items: readonly IcsExam[], now: Date = new Date()): string {
  const timed = items.some((i) => i.exam.time);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cockpit//Lern-App//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Prüfungen (Cockpit)',
  ];
  if (timed) lines.push(...VTIMEZONE_ZURICH);
  for (const { exam, subjectName } of items) {
    const summary = `${subjectName}: ${exam.title}`;
    const description = [exam.topics.length ? `Themen: ${exam.topics.map((t) => t.title).join(', ')}` : '', exam.notes?.trim() ?? '']
      .filter(Boolean)
      .join('\n');
    lines.push('BEGIN:VEVENT', `UID:${exam.id}@cockpit.app`, `DTSTAMP:${utcStamp(now)}`);
    if (exam.time) {
      const start = `${compactDate(exam.date)}T${exam.time.replace(':', '')}00`;
      lines.push(`DTSTART;TZID=Europe/Zurich:${start}`, `DTEND;TZID=Europe/Zurich:${compactDate(exam.date)}T${addHour(exam.time)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(exam.date)}`, `DTEND;VALUE=DATE:${compactDate(addDays(exam.date, 1))}`);
    }
    lines.push(`SUMMARY:${escapeText(summary)}`);
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(`Morgen: ${summary}`)}`,
      exam.time ? 'TRIGGER:-P1D' : 'TRIGGER:-PT6H',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/** Dateiname ohne Sonderzeichen, z. B. «pruefung-mathematik-funktionen.ics». */
export function icsFileName(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'pruefungen'}.ics`;
}
