import { describe, expect, it } from 'vitest';
import { runningAverages } from './series';

describe('Notenverlauf', () => {
  it('sortiert nach Datum und berechnet den laufenden Schnitt', () => {
    const points = runningAverages([
      { id: 'b', date: '2026-10-01', value: 4, weight: 1, createdAt: 2 },
      { id: 'a', date: '2026-09-01', value: 6, weight: 1, createdAt: 1 },
      { id: 'c', date: '2026-10-01', value: 5, weight: 2, createdAt: 3 },
    ]);
    expect(points.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(points.map((p) => p.average)).toEqual([6, 5, 5]);
  });
});
