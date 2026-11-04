import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from './db';
import type { Semester, Subject } from './schemas';

/** Fächer in der gewählten Reihenfolge (archivierte nur auf Wunsch). */
export function useSubjects(includeArchived = false): Subject[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.subjects.orderBy('order').toArray();
    return includeArchived ? all : all.filter((s) => !s.archived);
  }, [includeArchived]);
}

export function useSubjectMap(): Map<string, Subject> {
  const subjects = useSubjects(true);
  return useMemo(() => new Map((subjects ?? []).map((s) => [s.id, s])), [subjects]);
}

/** Semester, ältestes zuerst. */
export function useSemesters(): Semester[] | undefined {
  return useLiveQuery(() => db.semesters.orderBy('start').toArray(), []);
}
