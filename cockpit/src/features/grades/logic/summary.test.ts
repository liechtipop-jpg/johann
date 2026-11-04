import { describe, expect, it } from 'vitest';
import type { Grade, Subject } from '@/db/schemas';
import { promotionInputs, summarizeSubjects } from './summary';

const subject = (id: string, extra: Partial<Subject> = {}): Subject => ({
  id,
  name: id,
  color: 'teal',
  isPromotion: true,
  order: 0,
  archived: false,
  createdAt: 0,
  ...extra,
});
const grade = (id: string, subjectId: string, value: number, semesterId = 'hs', weight = 1, date = '2026-10-01'): Grade => ({
  id,
  subjectId,
  semesterId,
  value,
  weight,
  date,
  createdAt: 0,
});

describe('Semesterübersicht', () => {
  it('berechnet Schnitt, Zeugnisnote und Abstand zur nächsten Stufe pro Fach', () => {
    const [math, french] = summarizeSubjects(
      [subject('math'), subject('french')],
      [grade('1', 'math', 5), grade('2', 'math', 4.5, 'hs', 1, '2026-09-01'), grade('3', 'math', 6, 'fs')],
      'hs',
      0.5,
    );
    expect(math.grades.map((g) => g.id)).toEqual(['2', '1']);
    expect(math.average).toBe(4.75);
    expect(math.grade).toBe(5);
    expect(math.toNext).toBeCloseTo(0.5, 10);
    expect(french).toMatchObject({ average: null, grade: null, toNext: null });
  });

  it('zeigt archivierte Fächer nur mit Noten im Semester', () => {
    const list = summarizeSubjects(
      [subject('old', { archived: true }), subject('gone', { archived: true })],
      [grade('1', 'old', 4)],
      'hs',
      0.5,
    );
    expect(list.map((s) => s.subject.id)).toEqual(['old']);
  });

  it('gibt nur Promotionsfächer an den Promotionsrechner', () => {
    const list = summarizeSubjects([subject('math'), subject('sport', { isPromotion: false })], [grade('1', 'sport', 6)], 'hs', 0.5);
    expect(promotionInputs(list)).toEqual([{ subjectId: 'math', name: 'math', average: null }]);
  });
});
