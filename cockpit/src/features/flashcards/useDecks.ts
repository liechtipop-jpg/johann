import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '@/db/db';
import { useSettings } from '@/db/settingsContext';
import { endOfDay, startOfDay } from '@/lib/dates';
import { useNow } from '@/lib/useNow';
import { deckDirections, introducedToday } from './actions';
import { countDeck, type DeckCounts } from './logic/queue';

/** Decks mit fälligen und neuen Karten (live) – für Kartenübersicht und «Heute». */
export function useDecks() {
  const { flashcards } = useSettings();
  const now = useNow();
  const data = useLiveQuery(async () => {
    const [decks, states, logs, cards] = await Promise.all([
      db.decks.toArray(),
      db.cardStates.toArray(),
      db.reviewLogs.where('reviewedAt').aboveOrEqual(startOfDay(Date.now())).toArray(),
      db.cards.toArray(),
    ]);
    const cardCount = new Map<string, number>();
    for (const c of cards) cardCount.set(c.deckId, (cardCount.get(c.deckId) ?? 0) + 1);
    return { decks, states, logs, cardCount };
  }, []);

  return useMemo(() => {
    if (!data) return null;
    const introduced = introducedToday(data.logs, now);
    const rows = data.decks
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((deck) => {
        const dirs = deckDirections(deck);
        const counts: DeckCounts = countDeck(
          data.states.filter((s) => s.deckId === deck.id && dirs.includes(s.dir)),
          { endOfDay: endOfDay(now), newAllowed: flashcards.newPerDay - (introduced.get(deck.id) ?? 0) },
        );
        return { deck, counts, cards: data.cardCount.get(deck.id) ?? 0 };
      });
    const totalDue = rows.reduce((n, r) => n + r.counts.due + r.counts.newToday, 0);
    const reviewedToday = data.logs.length;
    return { rows, totalDue, reviewedToday };
  }, [data, flashcards.newPerDay, now]);
}
