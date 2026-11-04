import { describe, expect, it } from 'vitest';
import type { CardState } from '@/db/schemas';
import { buildQueue, countDeck } from './queue';

const now = 1_000_000;
const endOfDay = now + 10_000;
const s = (cardId: string, state: number, due: number, dir: 'fwd' | 'rev' = 'fwd'): CardState => ({
  id: `${cardId}:${dir}`,
  cardId,
  deckId: 'd',
  dir,
  due,
  stability: 1,
  difficulty: 5,
  scheduledDays: 1,
  learningSteps: 0,
  reps: state === 0 ? 0 : 1,
  lapses: 0,
  state,
});

describe('Lernwarteschlange', () => {
  it('zeigt Lernschritte vor Wiederholungen und nur Fälliges', () => {
    const q = buildQueue([s('r1', 2, now - 5), s('l1', 1, now - 1), s('future', 2, endOfDay + 1), s('l2', 1, now + 5000)], {
      now,
      endOfDay,
      newAllowed: 0,
    });
    expect(q.map((x) => x.cardId)).toEqual(['l1', 'r1']);
  });

  it('nimmt Wiederholungen von heute mit, Lernschritte erst wenn fällig', () => {
    const q = buildQueue([s('r1', 2, now + 5000), s('l1', 1, now + 5000)], { now, endOfDay, newAllowed: 0 });
    expect(q.map((x) => x.cardId)).toEqual(['r1']);
  });

  it('begrenzt neue Karten pro Tag und hält die Reihenfolge ein', () => {
    const order = new Map([
      ['n2', 2],
      ['n1', 1],
      ['n3', 3],
    ]);
    const q = buildQueue([s('n3', 0, now), s('n1', 0, now), s('n2', 0, now)], { now, endOfDay, newAllowed: 2, newOrder: order });
    expect(q.map((x) => x.cardId)).toEqual(['n1', 'n2']);
  });

  it('zeigt pro Sitzung nur eine Richtung derselben Karte', () => {
    const q = buildQueue([s('c', 2, now - 1, 'fwd'), s('c', 2, now - 1, 'rev'), s('n', 0, now, 'fwd'), s('n', 0, now, 'rev')], {
      now,
      endOfDay,
      newAllowed: 5,
    });
    expect(q.map((x) => x.id)).toEqual(['c:fwd', 'n:fwd']);
  });

  it('mischt neue Karten zwischen die Wiederholungen', () => {
    const reviews = ['a', 'b', 'c', 'd'].map((id) => s(id, 2, now - 1));
    const q = buildQueue([...reviews, s('n1', 0, now), s('n2', 0, now)], { now, endOfDay, newAllowed: 10 });
    expect(q.map((x) => x.cardId)).toEqual(['a', 'b', 'n1', 'c', 'd', 'n2']);
  });

  it('zählt fällige und neue Karten pro Karte (nicht pro Richtung)', () => {
    const counts = countDeck([s('a', 2, now, 'fwd'), s('a', 0, now, 'rev'), s('b', 0, now), s('c', 0, now), s('d', 1, endOfDay + 5)], {
      endOfDay,
      newAllowed: 1,
    });
    expect(counts).toEqual({ due: 1, newToday: 1, newTotal: 2, learning: 1, review: 1 });
  });
});
