import type { Grade, Subject } from '@/db/schemas';
import { distanceToNextStep, roundGrade, weightedAverage } from './average';
import type { PromotionSubjectInput } from './promotion';

export interface SubjectSummary {
  subject: Subject;
  /** Noten des Semesters, chronologisch */
  grades: Grade[];
  average: number | null;
  /** Gerundete Zeugnisnote */
  grade: number | null;
  /** Bis zur nächsthöheren Zeugnisnote */
  toNext: number | null;
}

/** Schnitt und Zeugnisnote pro Fach in einem Semester (archivierte Fächer nur, wenn sie dort Noten haben). */
export function summarizeSubjects(
  subjects: readonly Subject[],
  grades: readonly Grade[],
  semesterId: string | undefined,
  step: number,
): SubjectSummary[] {
  const bySubject = new Map<string, Grade[]>();
  for (const grade of grades) {
    if (grade.semesterId !== semesterId) continue;
    const list = bySubject.get(grade.subjectId) ?? [];
    list.push(grade);
    bySubject.set(grade.subjectId, list);
  }
  return subjects
    .filter((s) => !s.archived || bySubject.has(s.id))
    .map((subject) => {
      const list = (bySubject.get(subject.id) ?? []).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
      const average = weightedAverage(list);
      return {
        subject,
        grades: list,
        average,
        grade: average === null ? null : roundGrade(average, step),
        toNext: average === null ? null : distanceToNextStep(average, step),
      };
    });
}

export function promotionInputs(summaries: readonly SubjectSummary[]): PromotionSubjectInput[] {
  return summaries.filter((s) => s.subject.isPromotion).map((s) => ({ subjectId: s.subject.id, name: s.subject.name, average: s.average }));
}
