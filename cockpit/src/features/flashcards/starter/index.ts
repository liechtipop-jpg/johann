import type { StarterDeck } from './types';

/** Startdecks werden erst beim Hinzufügen geladen (eigene Dateien, offline im Cache). */
export const STARTER_DECKS: ReadonlyArray<{
  key: string;
  name: string;
  description: string;
  count: number;
  load: () => Promise<StarterDeck>;
}> = [
  {
    key: 'fr-montpellier',
    name: 'Französisch – Montpellier (A2–B1)',
    description: 'Smalltalk, Gastfamilie, Essen, Unterwegs, Einkaufen, Sprachschule, Notfall',
    count: 120,
    load: () => import('./frMontpellier').then((m) => m.deck),
  },
  {
    key: 'fce-phrasal-verbs',
    name: 'FCE – Phrasal Verbs',
    description: 'Häufige Phrasal Verbs mit Beispielsatz',
    count: 80,
    load: () => import('./fcePhrasalVerbs').then((m) => m.deck),
  },
  {
    key: 'fce-word-formation',
    name: 'FCE – Word Formation',
    description: 'Wortfamilien für Use of English, Teil 3',
    count: 50,
    load: () => import('./fceWordFormation').then((m) => m.deck),
  },
  {
    key: 'fce-collocations',
    name: 'FCE – Collocations',
    description: 'Feste Wortverbindungen (make, do, take …)',
    count: 40,
    load: () => import('./fceCollocations').then((m) => m.deck),
  },
];
