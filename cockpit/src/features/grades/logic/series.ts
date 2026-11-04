import { weightedAverage } from './average';

export interface DatedGrade {
  id: string;
  date: string;
  value: number;
  weight: number;
  createdAt: number;
  title?: string;
}

export interface GradePoint extends DatedGrade {
  /** Schnitt aller Noten bis und mit dieser */
  average: number;
}

/** Chronologischer Verlauf mit laufendem gewichtetem Schnitt (für das Diagramm). */
export function runningAverages(grades: readonly DatedGrade[]): GradePoint[] {
  const sorted = [...grades].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  return sorted.map((grade, i) => ({ ...grade, average: weightedAverage(sorted.slice(0, i + 1)) ?? grade.value }));
}
