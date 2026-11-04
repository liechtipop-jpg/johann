import { db } from '@/db/db';
import type { Card, CardState, Deck, ReviewLog } from '@/db/schemas';
import { endOfDay, startOfDay } from '@/lib/dates';
import { plural } from '@/lib/format';
import { newId } from '@/lib/ids';
import { toastUndo } from '@/ui/toast';
import type { CardDraft } from './logic/csv';
import { buildQueue } from './logic/queue';
import { newCardState, reviewCard, stateId, type Rating } from './logic/scheduler';
import type { FSRS } from 'ts-fsrs';
import { STARTER_DECKS } from './starter';

export function deckDirections(deck: Pick<Deck, 'directions'>): Array<CardState['dir']> {
  return deck.directions === 'both' ? ['fwd', 'rev'] : [deck.directions];
}

/** Legt fehlende Lernstände an (z. B. nach dem Umstellen auf «beide Richtungen»). */
export async function ensureStates(deck: Deck, now = Date.now()): Promise<void> {
  const [cards, states] = await Promise.all([
    db.cards.where('deckId').equals(deck.id).toArray(),
    db.cardStates.where('deckId').equals(deck.id).toArray(),
  ]);
  const existing = new Set(states.map((s) => s.id));
  const missing: CardState[] = [];
  for (const card of cards) {
    for (const dir of deckDirections(deck)) {
      if (!existing.has(stateId(card.id, dir))) missing.push(newCardState(card.id, deck.id, dir, now));
    }
  }
  if (missing.length) await db.cardStates.bulkPut(missing);
}

/** Karten hinzufügen (inkl. Lernstand für jede Richtung). */
export async function addCards(deck: Deck, drafts: readonly CardDraft[], tags?: string[]): Promise<string[]> {
  const now = Date.now();
  const cards: Card[] = drafts.map((d, i) => ({
    id: newId(),
    deckId: deck.id,
    front: d.front.trim(),
    back: d.back.trim(),
    example: d.example?.trim() || undefined,
    tags: tags?.length ? tags : undefined,
    createdAt: now + i,
  }));
  const states = cards.flatMap((c) => deckDirections(deck).map((dir) => newCardState(c.id, deck.id, dir, now)));
  await db.transaction('rw', db.cards, db.cardStates, async () => {
    await db.cards.bulkAdd(cards);
    await db.cardStates.bulkAdd(states);
  });
  return cards.map((c) => c.id);
}

async function snapshotCards(cardIds: string[]) {
  const [cards, states, logs] = await Promise.all([
    db.cards.bulkGet(cardIds),
    db.cardStates.where('cardId').anyOf(cardIds).toArray(),
    db.reviewLogs.where('cardId').anyOf(cardIds).toArray(),
  ]);
  return { cards: cards.filter((c): c is Card => c !== undefined), states, logs };
}

export async function deleteCardsWithUndo(cardIds: string[], message: string): Promise<void> {
  const snap = await snapshotCards(cardIds);
  await db.transaction('rw', db.cards, db.cardStates, db.reviewLogs, async () => {
    await db.cards.bulkDelete(cardIds);
    await db.cardStates.bulkDelete(snap.states.map((s) => s.id));
    await db.reviewLogs.bulkDelete(snap.logs.map((l) => l.id));
  });
  toastUndo(message, () =>
    db.transaction('rw', db.cards, db.cardStates, db.reviewLogs, async () => {
      await db.cards.bulkPut(snap.cards);
      await db.cardStates.bulkPut(snap.states);
      await db.reviewLogs.bulkPut(snap.logs);
    }),
  );
}

export async function deleteDeckWithUndo(deck: Deck): Promise<void> {
  const cardIds = (await db.cards.where('deckId').equals(deck.id).primaryKeys()) as string[];
  const snap = await snapshotCards(cardIds);
  await db.transaction('rw', db.decks, db.cards, db.cardStates, db.reviewLogs, async () => {
    await db.cards.bulkDelete(cardIds);
    await db.cardStates.where('deckId').equals(deck.id).delete();
    await db.reviewLogs.where('deckId').equals(deck.id).delete();
    await db.decks.delete(deck.id);
  });
  toastUndo(`Deck «${deck.name}» gelöscht`, () =>
    db.transaction('rw', db.decks, db.cards, db.cardStates, db.reviewLogs, async () => {
      await db.decks.put(deck);
      await db.cards.bulkPut(snap.cards);
      await db.cardStates.bulkPut(snap.states);
      await db.reviewLogs.bulkPut(snap.logs);
    }),
  );
}

/** Startdeck hinzufügen; das Fach wird über den Namen zugeordnet (z. B. «Französisch»). */
export async function addStarterDeck(key: string, { silent = false } = {}): Promise<Deck | null> {
  const meta = STARTER_DECKS.find((d) => d.key === key);
  if (!meta) return null;
  const starter = await meta.load();
  // Alles in einer Transaktion: entweder das ganze Deck oder gar nichts.
  const deck = await db.transaction('rw', db.subjects, db.decks, db.cards, db.cardStates, async () => {
    const subjects = await db.subjects.toArray();
    const subject = subjects.find((s) => !s.archived && s.name.toLowerCase() === starter.subjectName.toLowerCase());
    const created: Deck = {
      id: newId(),
      name: starter.name,
      subjectId: subject?.id,
      frontLang: starter.frontLang,
      backLang: starter.backLang,
      directions: starter.directions,
      source: starter.key,
      createdAt: Date.now(),
    };
    await db.decks.add(created);
    for (const group of starter.groups) {
      await addCards(
        created,
        group.cards.map(([front, back, example]) => ({ front, back, example })),
        [group.tag],
      );
    }
    return created;
  });
  const count = starter.groups.reduce((n, g) => n + g.cards.length, 0);
  if (!silent) toastUndo(`«${deck.name}» mit ${plural(count, 'Karte', 'Karten')} hinzugefügt`, () => deleteDeckQuietly(deck.id));
  return deck;
}

async function deleteDeckQuietly(deckId: string) {
  await db.transaction('rw', db.decks, db.cards, db.cardStates, db.reviewLogs, async () => {
    await db.cards.where('deckId').equals(deckId).delete();
    await db.cardStates.where('deckId').equals(deckId).delete();
    await db.reviewLogs.where('deckId').equals(deckId).delete();
    await db.decks.delete(deckId);
  });
}

/** Wie viele neue Karten pro Deck heute schon dran waren. */
export function introducedToday(logs: readonly ReviewLog[], now: number): Map<string, number> {
  const start = startOfDay(now);
  const seen = new Map<string, Set<string>>();
  for (const log of logs) {
    if (log.reviewedAt < start || log.state !== 0) continue;
    const set = seen.get(log.deckId) ?? new Set<string>();
    set.add(log.cardId);
    seen.set(log.deckId, set);
  }
  return new Map([...seen.entries()].map(([deck, set]) => [deck, set.size]));
}

export interface SessionItem {
  state: CardState;
  card: Card;
  deck: Deck;
}

/** Lernsitzung für ein Deck oder alle Decks («alle»). */
export async function buildSession(deckId: string, newPerDay: number, now = Date.now()): Promise<SessionItem[]> {
  const decks =
    deckId === 'alle' ? await db.decks.orderBy('id').toArray() : [await db.decks.get(deckId)].filter((d): d is Deck => d !== undefined);
  const todayLogs = await db.reviewLogs.where('reviewedAt').aboveOrEqual(startOfDay(now)).toArray();
  const introduced = introducedToday(todayLogs, now);
  const items: SessionItem[] = [];
  for (const deck of decks.sort((a, b) => a.createdAt - b.createdAt)) {
    await ensureStates(deck, now);
    const [cards, states] = await Promise.all([
      db.cards.where('deckId').equals(deck.id).toArray(),
      db.cardStates.where('deckId').equals(deck.id).toArray(),
    ]);
    const byId = new Map(cards.map((c) => [c.id, c]));
    const dirs = deckDirections(deck);
    const queue = buildQueue(
      states.filter((s) => dirs.includes(s.dir) && byId.has(s.cardId)),
      {
        now,
        endOfDay: endOfDay(now),
        newAllowed: newPerDay - (introduced.get(deck.id) ?? 0),
        newOrder: new Map(cards.map((c) => [c.id, c.createdAt])),
      },
    );
    for (const state of queue) items.push({ state, card: byId.get(state.cardId)!, deck });
  }
  return items;
}

/** Bewertung speichern (Lernstand + Lernverlauf). */
export async function recordReview(item: SessionItem, rating: Rating, mode: ReviewLog['mode'], scheduler: FSRS, now = Date.now()) {
  const result = reviewCard(item.state, rating, now, scheduler, mode, newId());
  await db.transaction('rw', db.cardStates, db.reviewLogs, async () => {
    await db.cardStates.put(result.state);
    await db.reviewLogs.add(result.log);
  });
  return result;
}

/** Letzte Bewertung zurücknehmen. */
export async function undoReview(previous: CardState, logId: string): Promise<void> {
  await db.transaction('rw', db.cardStates, db.reviewLogs, async () => {
    await db.cardStates.put(previous);
    await db.reviewLogs.delete(logId);
  });
}
