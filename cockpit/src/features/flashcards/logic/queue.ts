import type { CardState } from '@/db/schemas';

/** 0 = neu, 1 = lernen, 2 = wiederholen, 3 = neu lernen (FSRS-Zustände) */
export const STATE_NEW = 0;
export const STATE_LEARNING = 1;
export const STATE_REVIEW = 2;
export const STATE_RELEARNING = 3;

export interface QueueOptions {
  now: number;
  /** Ende des heutigen Tages (Wiederholungen von heute zählen mit) */
  endOfDay: number;
  /** Wie viele neue Karten heute noch drankommen dürfen */
  newAllowed: number;
  /** Reihenfolge der neuen Karten (z. B. Erstelldatum der Karte) */
  newOrder?: ReadonlyMap<string, number>;
}

/**
 * Lernwarteschlange: zuerst fällige Lernschritte, dann Wiederholungen, dazwischen verteilt
 * neue Karten (Tageslimit). Von einer Karte kommt pro Sitzung nur eine Richtung dran.
 */
export function buildQueue(states: readonly CardState[], { now, endOfDay, newAllowed, newOrder }: QueueOptions): CardState[] {
  const learning = states
    .filter((s) => (s.state === STATE_LEARNING || s.state === STATE_RELEARNING) && s.due <= now)
    .sort((a, b) => a.due - b.due);
  const reviews = states.filter((s) => s.state === STATE_REVIEW && s.due <= endOfDay).sort((a, b) => a.due - b.due);
  const fresh = states
    .filter((s) => s.state === STATE_NEW)
    .sort((a, b) => (newOrder?.get(a.cardId) ?? 0) - (newOrder?.get(b.cardId) ?? 0) || (a.dir === b.dir ? 0 : a.dir === 'fwd' ? -1 : 1));

  const seen = new Set<string>();
  const take = (list: CardState[], limit = Infinity) => {
    const out: CardState[] = [];
    for (const s of list) {
      if (out.length >= limit) break;
      if (seen.has(s.cardId)) continue; // Geschwister (andere Richtung) heute nicht
      seen.add(s.cardId);
      out.push(s);
    }
    return out;
  };

  const due = [...take(learning), ...take(reviews)];
  const news = take(fresh, Math.max(0, newAllowed));
  if (news.length === 0) return due;
  if (due.length === 0) return news;
  // Neue Karten gleichmässig zwischen die Wiederholungen mischen.
  const result: CardState[] = [];
  const every = Math.max(1, Math.floor(due.length / news.length));
  let n = 0;
  due.forEach((s, i) => {
    result.push(s);
    if ((i + 1) % every === 0 && n < news.length) result.push(news[n++]);
  });
  while (n < news.length) result.push(news[n++]);
  return result;
}

export interface DeckCounts {
  /** Heute fällig (Lernen + Wiederholen) */
  due: number;
  /** Neue Karten, die heute noch drankommen */
  newToday: number;
  /** Alle neuen Karten */
  newTotal: number;
  learning: number;
  review: number;
}

/** Zahlen für Deckliste und «Heute». */
export function countDeck(
  states: readonly CardState[],
  { endOfDay, newAllowed }: Pick<QueueOptions, 'endOfDay' | 'newAllowed'>,
): DeckCounts {
  const cards = new Map<string, CardState[]>();
  for (const s of states) cards.set(s.cardId, [...(cards.get(s.cardId) ?? []), s]);
  let due = 0;
  let newTotal = 0;
  let learning = 0;
  let review = 0;
  for (const list of cards.values()) {
    if (list.some((s) => s.state !== STATE_NEW && s.due <= endOfDay)) due++;
    else if (list.some((s) => s.state === STATE_NEW)) newTotal++;
  }
  for (const s of states) {
    if (s.state === STATE_LEARNING || s.state === STATE_RELEARNING) learning++;
    if (s.state === STATE_REVIEW) review++;
  }
  return { due, newToday: Math.min(newTotal, Math.max(0, newAllowed)), newTotal, learning, review };
}
