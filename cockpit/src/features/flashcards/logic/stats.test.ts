import { describe, expect, it } from 'vitest';
import type { CardState, ReviewLog } from '@/db/schemas';
import { forecast, retention, reviewStreak, reviewsPerDay, stateCounts } from './stats';

const at = (date: string, hour = 12) => new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime();
const log = (date: string, rating: number, state = 2): ReviewLog => ({
  id: `${date}-${rating}-${Math.random()}`,
  cardId: 'c',
  deckId: 'd',
  dir: 'fwd',
  rating,
  mode: 'flip',
  reviewedAt: at(date),
  state,
});
const card = (state: number, due: string): CardState => ({
  id: Math.random().toString(),
  cardId: 'c',
  deckId: 'd',
  dir: 'fwd',
  due: at(due, 8),
  stability: 1,
  difficulty: 5,
  scheduledDays: 1,
  learningSteps: 0,
  reps: 1,
  lapses: 0,
  state,
});

describe('Karteikarten-Statistik', () => {
  const logs = [log('2026-11-04', 3), log('2026-11-04', 1), log('2026-11-03', 4, 0), log('2026-11-02', 3)];

  it('zählt Wiederholungen pro Tag', () => {
    const days = reviewsPerDay(logs, '2026-11-04', 3);
    expect(days).toEqual([
      { date: '2026-11-02', count: 1, again: 0 },
      { date: '2026-11-03', count: 1, again: 0 },
      { date: '2026-11-04', count: 2, again: 1 },
    ]);
  });

  it('berechnet die Trefferquote ohne neue Karten', () => {
    expect(retention(logs, 0)).toBeCloseTo(2 / 3, 10);
    expect(retention([], 0)).toBeNull();
  });

  it('zählt Kartenstatus und Prognose', () => {
    const states = [card(0, '2026-11-04'), card(1, '2026-11-04'), card(2, '2026-11-01'), card(2, '2026-11-06')];
    expect(stateCounts(states)).toEqual({ new: 1, learning: 1, review: 2 });
    const f = forecast(states, '2026-11-04', 3);
    expect(f).toEqual([
      { date: '2026-11-04', count: 2 },
      { date: '2026-11-05', count: 0 },
      { date: '2026-11-06', count: 1 },
    ]);
  });

  it('zählt Lerntage in Folge', () => {
    expect(reviewStreak(logs, '2026-11-04')).toBe(3);
    expect(reviewStreak(logs, '2026-11-05')).toBe(3);
    expect(reviewStreak(logs, '2026-11-06')).toBe(0);
  });
});
