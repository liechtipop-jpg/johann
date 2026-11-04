import { describe, expect, it } from 'vitest';
import { heatLevel, heatmap, minutesPerPiece, minutesThisWeek, practiceStreak } from './practice';

const m = (date: string, minutes: number, pieceId?: string) => ({ date, seconds: minutes * 60, pieceId });

describe('Übungslog', () => {
  it('zählt die Streak bis heute oder gestern', () => {
    const logs = [m('2026-11-01', 10), m('2026-11-02', 5), m('2026-11-03', 20)];
    expect(practiceStreak(logs, '2026-11-03')).toBe(3);
    // Heute noch nicht geübt: Streak hält bis Mitternacht
    expect(practiceStreak(logs, '2026-11-04')).toBe(3);
    expect(practiceStreak(logs, '2026-11-05')).toBe(0);
    expect(practiceStreak([...logs, m('2026-10-30', 15)], '2026-11-03')).toBe(3);
    expect(practiceStreak([m('2026-11-03', 0)], '2026-11-03')).toBe(0);
  });

  it('summiert die Woche von Montag bis Sonntag', () => {
    // 2026-11-02 ist ein Montag
    const logs = [m('2026-11-01', 30), m('2026-11-02', 20), m('2026-11-04', 25), m('2026-11-08', 10), m('2026-11-09', 40)];
    expect(minutesThisWeek(logs, '2026-11-04')).toBe(55);
  });

  it('baut die Heatmap mit Wochen als Spalten', () => {
    const logs = [m('2026-11-04', 45), m('2026-11-04', 20), m('2026-10-27', 10)];
    const grid = heatmap(logs, '2026-11-04', 2);
    expect(grid).toHaveLength(2);
    expect(grid[0][0].date).toBe('2026-10-26');
    expect(grid[1][2]).toMatchObject({ date: '2026-11-04', minutes: 65, level: 4, future: false });
    expect(grid[0][1]).toMatchObject({ date: '2026-10-27', minutes: 10, level: 1 });
    expect(grid[1][3].future).toBe(true);
    expect([0, 5, 15, 30, 60].map(heatLevel)).toEqual([0, 1, 2, 3, 4]);
  });

  it('summiert die Zeit pro Stück', () => {
    const map = minutesPerPiece([m('2026-11-01', 10, 'a'), m('2026-11-02', 5, 'a'), m('2026-11-02', 7)]);
    expect(map.get('a')).toBe(15);
    expect(map.size).toBe(1);
  });
});
