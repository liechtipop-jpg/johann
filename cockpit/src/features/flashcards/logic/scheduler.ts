import { createEmptyCard, fsrs, generatorParameters, type Card as FsrsCard, type FSRS, type Grade, type State } from 'ts-fsrs';
import type { CardState, ReviewLog } from '@/db/schemas';

/** 1 = Nochmal, 2 = Schwer, 3 = Gut, 4 = Leicht */
export type Rating = 1 | 2 | 3 | 4;
export const RATINGS: readonly Rating[] = [1, 2, 3, 4];
export const RATING_LABELS: Record<Rating, string> = { 1: 'Nochmal', 2: 'Schwer', 3: 'Gut', 4: 'Leicht' };

/** FSRS-Planer (Lernschritte 1 und 10 Minuten, maximal 1 Jahr Abstand). */
export function createScheduler({ retention = 0.9, fuzz = true }: { retention?: number; fuzz?: boolean } = {}): FSRS {
  return fsrs(generatorParameters({ request_retention: retention, maximum_interval: 365, enable_fuzz: fuzz, enable_short_term: true }));
}

type StateKey = Pick<CardState, 'id' | 'cardId' | 'deckId' | 'dir'>;

export function stateId(cardId: string, dir: CardState['dir']): string {
  return `${cardId}:${dir}`;
}

export function toFsrsCard(state: CardState): FsrsCard {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as State,
    last_review: state.lastReview !== undefined ? new Date(state.lastReview) : undefined,
  };
}

export function fromFsrsCard(card: FsrsCard, key: StateKey): CardState {
  return {
    ...key,
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? card.last_review.getTime() : undefined,
  };
}

/** Neuer Lernstand für eine Karte in einer Richtung (sofort fällig). */
export function newCardState(cardId: string, deckId: string, dir: CardState['dir'], now: number): CardState {
  return fromFsrsCard(createEmptyCard(new Date(now)), { id: stateId(cardId, dir), cardId, deckId, dir });
}

/** Bewertung anwenden: neuer Lernstand und Eintrag für den Lernverlauf. */
export function reviewCard(
  state: CardState,
  rating: Rating,
  now: number,
  scheduler: FSRS,
  mode: ReviewLog['mode'],
  logId: string,
): { state: CardState; log: ReviewLog } {
  const result = scheduler.next(toFsrsCard(state), new Date(now), rating as Grade);
  return {
    state: fromFsrsCard(result.card, state),
    log: {
      id: logId,
      cardId: state.cardId,
      deckId: state.deckId,
      dir: state.dir,
      rating,
      mode,
      reviewedAt: now,
      state: state.state,
      scheduledDays: result.card.scheduled_days,
    },
  };
}

/** Wann die Karte je nach Bewertung wieder drankommt (ms ab jetzt) – für die Knöpfe. */
export function previewIntervals(state: CardState, now: number, scheduler: FSRS): Record<Rating, number> {
  const preview = scheduler.repeat(toFsrsCard(state), new Date(now));
  const out = {} as Record<Rating, number>;
  for (const rating of RATINGS) out[rating] = preview[rating as Grade].card.due.getTime() - now;
  return out;
}

/** «1 min» · «10 min» · «3 h» · «2 T» · «3 Wo» · «4 Mt» · «1 J» */
export function formatInterval(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days} T`;
  if (days < 60) return `${Math.round(days / 7)} Wo`;
  if (days < 365) return `${Math.round(days / 30)} Mt`;
  return `${Math.round((days / 365) * 10) / 10} J`;
}
