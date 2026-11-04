import { describe, expect, it } from 'vitest';
import { cardSchema } from '@/db/schemas';
import { STARTER_DECKS } from './index';

describe('Startdecks', () => {
  for (const meta of STARTER_DECKS) {
    it(`${meta.name}: ${meta.count} vollständige Karten mit Beispielsatz, ohne Doppelte`, async () => {
      const deck = await meta.load();
      expect(deck.key).toBe(meta.key);
      const cards = deck.groups.flatMap((g) => g.cards);
      expect(cards).toHaveLength(meta.count);
      const fronts = new Set<string>();
      for (const [front, back, example] of cards) {
        expect(cardSchema.safeParse({ id: 'x', deckId: 'd', front, back, example, createdAt: 0 }).success).toBe(true);
        expect(example.length).toBeGreaterThan(8);
        expect(front.includes('ß') || back.includes('ß')).toBe(false); // Schweizer Rechtschreibung
        expect(fronts.has(front)).toBe(false);
        fronts.add(front);
      }
    });
  }
});
