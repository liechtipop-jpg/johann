import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, ChevronRight, LineChart, Plus } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { useParams } from 'react-router';
import { ui } from '@/app/uiStore';
import { db } from '@/db/db';
import type { Grade } from '@/db/schemas';
import { formatDate } from '@/lib/dates';
import { formatAverage, formatGrade, plural } from '@/lib/format';
import { BackLink } from '@/ui/BackLink';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { PageHeader } from '@/ui/PageHeader';
import { Sheet } from '@/ui/Sheet';
import { SubjectDot } from '@/ui/Subject';
import { GradeBadge } from './GradeBadge';
import { GradeForm } from './GradeForm';
import { roundingPhrase } from './logic/rules';
import { runningAverages } from './logic/series';
import { summarizeSubjects } from './logic/summary';
import { SemesterSelect } from './SemesterSelect';
import { useGradesView } from './useGradesView';
import { WishCalculator } from './WishCalculator';

const GradeChart = lazy(() => import('./GradeChart'));

/** Fach-Detail: Zeugnisnote, Verlauf, Wunschnoten-Rechner und alle Noten des Semesters. */
export default function SubjectGradesPage() {
  const { subjectId } = useParams();
  const view = useGradesView();
  const exams = useLiveQuery(() => (subjectId ? db.exams.where('subjectId').equals(subjectId).toArray() : []), [subjectId]);
  const [editing, setEditing] = useState<Grade | null>(null);
  if (!view || !exams) return null;

  const { semester, semesters, summaries, rules, semesterQuery, setSemester, today, grades: allGrades } = view;
  const subject = view.subjects.find((s) => s.id === subjectId);
  if (!subject) {
    return (
      <>
        <BackLink to="/noten" label="Noten" />
        <EmptyState icon={BookOpen} title="Fach nicht gefunden">
          Vielleicht wurde es gelöscht.
        </EmptyState>
      </>
    );
  }

  const summary = summaries.find((s) => s.subject.id === subject.id);
  const grades = summary?.grades ?? [];
  const nextExam = exams.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const rounding = roundingPhrase(rules.roundingStep);
  const earlier = semesters
    .filter((s) => s.id !== semester?.id)
    .map((s) => ({ semester: s, summary: summarizeSubjects([subject], allGrades, s.id, rules.roundingStep)[0] }))
    .filter((e) => e.summary.grades.length > 0)
    .reverse();

  return (
    <>
      <BackLink to={`/noten${semesterQuery}`} label="Noten" />
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            <SubjectDot color={subject.color} size={14} />
            {subject.name}
          </span>
        }
        subtitle={`${semester?.name ?? ''} · ${subject.isPromotion ? 'Promotionsfach' : 'zählt nicht für die Promotion'}`}
        actions={
          <>
            <SemesterSelect semesters={semesters} value={semester?.id} onChange={setSemester} />
            <Button
              variant="primary"
              icon={<Plus size={18} aria-hidden />}
              onClick={() => ui.openQuickAdd('grade', { subjectId: subject.id })}
            >
              Note
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card title="Zeugnisnote" description={rules.roundingStep > 0 ? `Gewichteter Schnitt, gerundet auf ${rounding}` : 'Gewichteter Schnitt, nicht gerundet'}>
          <div className="flex items-end gap-6">
            <GradeBadge grade={summary?.grade ?? null} passMark={rules.passMark} size="lg" />
            <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 pb-1 text-sm">
              <dt className="text-ink-2">Schnitt</dt>
              <dd className="font-medium tabular-nums">{summary?.average != null ? formatAverage(summary.average) : '–'}</dd>
              <dt className="text-ink-2">Noten</dt>
              <dd className="font-medium tabular-nums">{grades.length}</dd>
            </dl>
          </div>
          {summary?.toNext != null && summary.grade !== null && summary.toNext > 0 && (
            <p className="mt-3 text-[13px] text-ink-2">
              Noch {formatAverage(summary.toNext)} im Schnitt bis zur {formatGrade(summary.grade + rules.roundingStep)}.
            </p>
          )}
        </Card>

        <Card title="Wunschnote" description="Was brauchst du an der nächsten Prüfung?">
          <WishCalculator
            key={subject.id + (semester?.id ?? '')}
            grades={grades}
            rules={rules}
            current={summary?.grade ?? null}
            nextExam={nextExam}
          />
        </Card>

        <Card title="Verlauf" className="lg:col-span-2">
          {grades.length === 0 ? (
            <EmptyState icon={LineChart} title="Noch kein Verlauf" className="py-6">
              Nach der ersten Note siehst du hier deine Noten und den Schnitt im Zeitverlauf.
            </EmptyState>
          ) : (
            <Suspense fallback={<div className="h-[248px]" />}>
              <GradeChart points={runningAverages(grades)} color={subject.color} passMark={rules.passMark} subjectName={subject.name} />
            </Suspense>
          )}
        </Card>

        <Card
          title="Noten"
          description={grades.length ? `${plural(grades.length, 'Note', 'Noten')} · tippen zum Bearbeiten` : undefined}
          bodyClassName="px-2 pt-2 pb-2 lg:px-3"
        >
          {grades.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="Noch keine Note"
              className="py-6"
              action={
                <Button variant="primary" onClick={() => ui.openQuickAdd('grade', { subjectId: subject.id })}>
                  Note erfassen
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {[...grades].reverse().map((grade) => (
                <li key={grade.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(grade)}
                    className="flex min-h-14 w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left transition-colors hover:bg-surface-2"
                  >
                    <span className="w-12 text-[20px] font-semibold tabular-nums">{formatGrade(grade.value)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px]">{grade.title || 'Note'}</span>
                      <span className="block text-[13px] text-ink-2">
                        {formatDate(grade.date, 'medium')} · Gewicht {formatGrade(grade.weight)}
                      </span>
                    </span>
                    <ChevronRight size={18} aria-hidden className="text-ink-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {earlier.length > 0 && (
          <Card title="Frühere Semester">
            <ul className="-my-1 divide-y divide-line">
              {earlier.map(({ semester: s, summary: e }) => (
                <li key={s.id} className="flex items-center gap-3 py-2">
                  <span className="flex-1">
                    <span className="block text-[15px]">{s.name}</span>
                    <span className="block text-[13px] text-ink-2">
                      {plural(e.grades.length, 'Note', 'Noten')} · Ø {formatAverage(e.average ?? 0)}
                    </span>
                  </span>
                  <GradeBadge grade={e.grade} passMark={rules.passMark} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Note bearbeiten">
        {editing && <GradeForm initial={editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </>
  );
}
