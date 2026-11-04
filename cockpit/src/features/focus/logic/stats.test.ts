import { describe, expect, it } from 'vitest';
import { weekFocus } from './stats';

describe('Fokus-Wochenstatistik', () => {
  it('summiert pro Tag und Fach', () => {
    const s = (date: string, minutes: number, subjectId?: string) => ({ date, focusSeconds: minutes * 60, subjectId });
    const week = weekFocus(
      [
        s('2026-11-02', 25, 'math'),
        s('2026-11-02', 25, 'eng'),
        s('2026-11-04', 50, 'math'),
        s('2026-11-04', 10),
        s('2026-11-09', 99, 'math'),
      ],
      '2026-11-04',
    );
    expect(week.total).toBe(110);
    expect(week.days.map((d) => d.minutes)).toEqual([50, 0, 60, 0, 0, 0, 0]);
    expect(week.subjects).toEqual([
      { subjectId: 'math', minutes: 75 },
      { subjectId: 'eng', minutes: 25 },
      { subjectId: undefined, minutes: 10 },
    ]);
  });
});
