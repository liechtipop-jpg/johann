import { describe, expect, it } from 'vitest';
import { createScheduler, formatInterval, newCardState, previewIntervals, reviewCard, stateId } from './scheduler';

const now = Date.UTC(2026, 10, 4, 9, 0);
const scheduler = createScheduler({ fuzz: false });
const MIN = 60_000;
const DAY = 86_400_000;

describe('Karteikarten-Planung (FSRS)', () => {
  it('legt neue Karten sofort fällig an', () => {
    const state = newCardState('c1', 'd1', 'fwd', now);
    expect(state).toMatchObject({ id: stateId('c1', 'fwd'), cardId: 'c1', deckId: 'd1', dir: 'fwd', due: now, state: 0, reps: 0 });
  });

  it('plant neue Karten über die Lernschritte 1 und 10 Minuten', () => {
    const state = newCardState('c1', 'd1', 'fwd', now);
    const preview = previewIntervals(state, now, scheduler);
    expect(preview[1]).toBe(1 * MIN);
    expect(preview[3]).toBe(10 * MIN);
    expect(preview[1]).toBeLessThan(preview[2]);
    expect(preview[2]).toBeLessThan(preview[3]);
    expect(preview[3]).toBeLessThan(preview[4]);
  });

  it('macht aus «Gut» nach dem Lernschritt eine Wiederholung in Tagen', () => {
    let state = newCardState('c1', 'd1', 'fwd', now);
    const first = reviewCard(state, 3, now, scheduler, 'flip', 'l1');
    state = first.state;
    expect(state.state).toBe(1);
    expect(first.log).toMatchObject({ id: 'l1', cardId: 'c1', rating: 3, state: 0, mode: 'flip', reviewedAt: now });
    const second = reviewCard(state, 3, state.due, scheduler, 'flip', 'l2');
    expect(second.state.state).toBe(2);
    expect(second.state.due - state.due).toBeGreaterThanOrEqual(DAY);
  });

  it('setzt eine vergessene Karte zurück in den Lernmodus', () => {
    let state = newCardState('c1', 'd1', 'fwd', now);
    state = reviewCard(state, 4, now, scheduler, 'flip', 'a').state;
    expect(state.state).toBe(2);
    const forgotten = reviewCard(state, 1, state.due, scheduler, 'type', 'b');
    expect(forgotten.state.state).toBe(3);
    expect(forgotten.state.lapses).toBe(1);
  });

  it('beschriftet Abstände kurz', () => {
    expect(formatInterval(30_000)).toBe('1 min');
    expect(formatInterval(10 * MIN)).toBe('10 min');
    expect(formatInterval(3 * 60 * MIN)).toBe('3 h');
    expect(formatInterval(2 * DAY)).toBe('2 T');
    expect(formatInterval(21 * DAY)).toBe('3 Wo');
    expect(formatInterval(120 * DAY)).toBe('4 Mt');
    expect(formatInterval(365 * DAY)).toBe('1 J');
  });
});
