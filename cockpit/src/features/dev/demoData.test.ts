import { describe, expect, it } from 'vitest';
import { TABLE_SCHEMAS } from '@/db/schemas';
import { buildDemoData } from './demoData';

describe('Demo-Daten', () => {
  for (const today of ['2026-08-20', '2026-11-04', '2027-03-15']) {
    it(`passen zum Schema (heute = ${today})`, () => {
      const data = buildDemoData(today, Date.UTC(2026, 10, 4));
      for (const [table, rows] of Object.entries(data)) {
        const schema = TABLE_SCHEMAS[table as keyof typeof TABLE_SCHEMAS];
        for (const row of rows) expect(schema.safeParse(row).success, `${table}: ${JSON.stringify(row)}`).toBe(true);
      }
    });

    it(`legen im laufenden Semester keine Noten in die Zukunft (heute = ${today})`, () => {
      const data = buildDemoData(today, 0);
      const current = data.semesters[1];
      for (const grade of data.grades.filter((g) => g.semesterId === current.id)) {
        expect(grade.date <= today).toBe(true);
        expect(grade.date >= current.start).toBe(true);
      }
    });
  }
});
