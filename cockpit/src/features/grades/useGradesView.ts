import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'react-router';
import { db } from '@/db/db';
import { useSemesters, useSubjects } from '@/db/hooks';
import { useSettings } from '@/db/settingsContext';
import { semesterForDate } from '@/lib/dates';
import { useToday } from '@/lib/useNow';
import { evaluatePromotion } from './logic/promotion';
import { promotionInputs, summarizeSubjects } from './logic/summary';

/** Gemeinsame Daten für Noten-, Fach- und Promotionsseite (Semester über ?semester=…). */
export function useGradesView() {
  const [params, setParams] = useSearchParams();
  const subjects = useSubjects(true);
  const semesters = useSemesters();
  const grades = useLiveQuery(() => db.grades.toArray(), []);
  const today = useToday();
  const { promotionRules } = useSettings();
  if (!subjects || !semesters || !grades) return null;

  const semester = semesters.find((s) => s.id === params.get('semester')) ?? semesterForDate(semesters, today);
  const summaries = summarizeSubjects(subjects, grades, semester?.id, promotionRules.roundingStep);
  const promotion = evaluatePromotion(promotionInputs(summaries), promotionRules);
  const semesterQuery = params.get('semester') ? `?semester=${params.get('semester')}` : '';

  return {
    today,
    semester,
    semesters,
    subjects,
    grades,
    summaries,
    promotion,
    rules: promotionRules,
    semesterQuery,
    setSemester: (id: string) => setParams({ semester: id }, { replace: true }),
  };
}
