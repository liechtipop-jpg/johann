import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '@/db/db';
import { useSubjectMap } from '@/db/hooks';
import type { Exam, StudySession } from '@/db/schemas';

export const KIND_LABEL: Record<StudySession['kind'], string> = { learn: 'Lernen', review: 'Wiederholen', repetition: 'Repetition' };

/** Was in einer Lerneinheit dran ist (Thema oder «Repetition»). */
export function sessionLabel(session: StudySession, exam: Exam | undefined): string {
  if (session.kind === 'repetition') return exam ? `Repetition: ${exam.title}` : 'Repetition';
  return exam?.topics.find((t) => t.id === session.topicId)?.title ?? exam?.title ?? 'Lerneinheit';
}

/** Alle Lerneinheiten mit zugehörigen Prüfungen und Fächern (live). */
export function usePlanData() {
  const sessions = useLiveQuery(() => db.studySessions.orderBy('date').toArray(), []);
  const exams = useLiveQuery(() => db.exams.orderBy('date').toArray(), []);
  const subjects = useSubjectMap();
  return useMemo(() => {
    if (!sessions || !exams) return null;
    return { sessions, exams, examMap: new Map(exams.map((e) => [e.id, e])), subjects };
  }, [sessions, exams, subjects]);
}
