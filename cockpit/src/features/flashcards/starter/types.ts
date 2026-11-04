import type { Deck } from '@/db/schemas';

/** [Vorderseite, Rückseite, Beispielsatz] */
export type StarterCard = readonly [string, string, string];

export interface StarterDeck {
  key: string;
  name: string;
  description: string;
  /** Wird dem gleichnamigen Fach zugeordnet, falls vorhanden */
  subjectName: string;
  frontLang: string;
  backLang: string;
  directions: Deck['directions'];
  groups: ReadonlyArray<{ tag: string; cards: readonly StarterCard[] }>;
}
