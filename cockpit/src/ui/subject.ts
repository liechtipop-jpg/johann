import type { CSSProperties } from 'react';
import { SUBJECT_COLORS, type SubjectColor } from '@/db/schemas';

export const SUBJECT_COLOR_LABELS: Record<SubjectColor, string> = {
  red: 'Rot',
  orange: 'Orange',
  yellow: 'Gelb',
  olive: 'Oliv',
  green: 'Grün',
  teal: 'Petrol',
  cyan: 'Cyan',
  sky: 'Himmel',
  violet: 'Violett',
  pink: 'Pink',
  brown: 'Braun',
  slate: 'Schiefer',
};

/** Setzt --sc für Elemente mit Klasse «subject» (siehe index.css). */
export function subjectStyle(color: SubjectColor): CSSProperties {
  return { '--sc': `var(--subject-${color})` } as CSSProperties;
}

export function subjectColorValue(color: SubjectColor): string {
  return `var(--subject-${color})`;
}

/** Wunschfarbe, falls frei – sonst die erste noch unbenutzte Farbe. */
export function pickColor(used: readonly SubjectColor[], preferred?: SubjectColor): SubjectColor {
  if (preferred && !used.includes(preferred)) return preferred;
  return SUBJECT_COLORS.find((c) => !used.includes(c)) ?? preferred ?? SUBJECT_COLORS[used.length % SUBJECT_COLORS.length];
}
