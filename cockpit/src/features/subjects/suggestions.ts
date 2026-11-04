import type { SubjectColor } from '@/db/schemas';

/** Häufige Fächer an Gymnasien im Kanton Zürich – nur Vorschläge fürs Onboarding. */
export const SUBJECT_SUGGESTIONS: ReadonlyArray<{ name: string; color: SubjectColor }> = [
  { name: 'Deutsch', color: 'red' },
  { name: 'Französisch', color: 'violet' },
  { name: 'Englisch', color: 'sky' },
  { name: 'Mathematik', color: 'teal' },
  { name: 'Biologie', color: 'green' },
  { name: 'Chemie', color: 'orange' },
  { name: 'Physik', color: 'slate' },
  { name: 'Geschichte', color: 'brown' },
  { name: 'Geografie', color: 'olive' },
  { name: 'Wirtschaft und Recht', color: 'yellow' },
  { name: 'Informatik', color: 'cyan' },
  { name: 'Bildnerisches Gestalten', color: 'pink' },
  { name: 'Musik', color: 'pink' },
  { name: 'Latein', color: 'brown' },
  { name: 'Italienisch', color: 'green' },
  { name: 'Spanisch', color: 'orange' },
  { name: 'Philosophie', color: 'slate' },
  { name: 'Sport', color: 'cyan' },
];
