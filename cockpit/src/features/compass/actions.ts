import { db } from '@/db/db';
import type { Criterion, StudyOption, TimelineEvent } from '@/db/schemas';
import { newId } from '@/lib/ids';
import { toast, toastUndo } from '@/ui/toast';
import { CRITERION_SUGGESTIONS, OPTION_SUGGESTIONS, timelineSuggestions, type OptionKey } from './suggestions';

export const DEFAULT_WEIGHT = 5;

export function newOption(name: string, order: number, links: StudyOption['links'] = []): StudyOption {
  return { id: newId(), name: name.trim(), pros: [], cons: [], notes: '', links, order, createdAt: Date.now() };
}

export function newCriterion(name: string, order: number, weight = DEFAULT_WEIGHT): Criterion {
  return { id: newId(), name: name.trim(), weight, order, createdAt: Date.now() };
}

async function nextOrder(table: typeof db.studyOptions | typeof db.criteria): Promise<number> {
  const last = await table.orderBy('order').last();
  return (last?.order ?? -1) + 1;
}

export async function addOption(name: string): Promise<StudyOption> {
  const option = newOption(name, await nextOrder(db.studyOptions));
  await db.studyOptions.add(option);
  return option;
}

export async function addCriterion(name: string, weight = DEFAULT_WEIGHT): Promise<Criterion> {
  const criterion = newCriterion(name, await nextOrder(db.criteria), weight);
  await db.criteria.add(criterion);
  return criterion;
}

/** Übernimmt Vorschläge (ohne Doppelte): Optionen, Kriterien und Termine mit offizieller Quelle. */
export async function addCompassSuggestions(
  today: string,
  parts: { options?: boolean; criteria?: boolean } = { options: true, criteria: true },
) {
  const result = await db.transaction('rw', db.studyOptions, db.criteria, db.timeline, async () => {
    const counts = { options: 0, criteria: 0, events: 0 };
    const keyToId = new Map<OptionKey, string>();
    if (parts.options) {
      const existing = new Map((await db.studyOptions.toArray()).map((o) => [o.name.toLowerCase(), o.id]));
      let order = await nextOrder(db.studyOptions);
      for (const s of OPTION_SUGGESTIONS) {
        const found = existing.get(s.name.toLowerCase());
        if (found) {
          keyToId.set(s.key, found);
          continue;
        }
        const option = newOption(s.name, order++, s.links);
        await db.studyOptions.add(option);
        keyToId.set(s.key, option.id);
        counts.options++;
      }
      const titles = new Set((await db.timeline.toArray()).map((e) => e.title.toLowerCase()));
      for (const { optionKey, ...event } of timelineSuggestions(today)) {
        if (titles.has(event.title.toLowerCase())) continue;
        await db.timeline.add({ ...event, id: newId(), optionId: optionKey ? keyToId.get(optionKey) : undefined });
        counts.events++;
      }
    }
    if (parts.criteria) {
      const existing = new Set((await db.criteria.toArray()).map((c) => c.name.toLowerCase()));
      let order = await nextOrder(db.criteria);
      for (const name of CRITERION_SUGGESTIONS) {
        if (existing.has(name.toLowerCase())) continue;
        await db.criteria.add(newCriterion(name, order++));
        counts.criteria++;
      }
    }
    return counts;
  });
  const parts2 = [
    result.options && `${result.options} ${result.options === 1 ? 'Option' : 'Optionen'}`,
    result.criteria && `${result.criteria} Kriterien`,
    result.events && `${result.events} Termine`,
  ].filter(Boolean);
  toast(parts2.length ? `${parts2.join(', ')} übernommen` : 'Alle Vorschläge sind schon da');
}

export async function setRating(optionId: string, criterionId: string, score: number | null): Promise<void> {
  if (score === null) await db.ratings.delete([optionId, criterionId]);
  else await db.ratings.put({ optionId, criterionId, score });
}

export async function saveOption(next: StudyOption): Promise<void> {
  await db.studyOptions.put(next);
}

export async function saveCriterion(next: Criterion): Promise<void> {
  await db.criteria.put(next);
}

/** Option löschen – samt Bewertungen und eigenen Terminen, mit «Rückgängig». */
export async function deleteOption(option: StudyOption): Promise<void> {
  const { ratings, events } = await db.transaction('rw', db.studyOptions, db.ratings, db.timeline, async () => {
    const ratings = await db.ratings.where('optionId').equals(option.id).toArray();
    const events = await db.timeline.where('optionId').equals(option.id).toArray();
    await db.ratings.where('optionId').equals(option.id).delete();
    await db.timeline.bulkDelete(events.map((e) => e.id));
    await db.studyOptions.delete(option.id);
    return { ratings, events };
  });
  toastUndo(`«${option.name}» gelöscht`, () =>
    db.transaction('rw', db.studyOptions, db.ratings, db.timeline, async () => {
      await db.studyOptions.put(option);
      await db.ratings.bulkPut(ratings);
      await db.timeline.bulkPut(events);
    }),
  );
}

export async function deleteCriterion(criterion: Criterion): Promise<void> {
  const ratings = await db.transaction('rw', db.criteria, db.ratings, async () => {
    const ratings = await db.ratings.where('criterionId').equals(criterion.id).toArray();
    await db.ratings.where('criterionId').equals(criterion.id).delete();
    await db.criteria.delete(criterion.id);
    return ratings;
  });
  toastUndo(`Kriterium «${criterion.name}» gelöscht`, () =>
    db.transaction('rw', db.criteria, db.ratings, async () => {
      await db.criteria.put(criterion);
      await db.ratings.bulkPut(ratings);
    }),
  );
}

export async function saveEvent(event: TimelineEvent): Promise<void> {
  await db.timeline.put(event);
}

export async function deleteEvent(event: TimelineEvent): Promise<void> {
  await db.timeline.delete(event.id);
  toastUndo('Termin gelöscht', () => db.timeline.put(event));
}
