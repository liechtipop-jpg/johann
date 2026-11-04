import { BookOpen, ChevronRight, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { ui } from '@/app/uiStore';
import { formatAverage, formatGrade, plural } from '@/lib/format';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { PageHeader } from '@/ui/PageHeader';
import { SubjectDot } from '@/ui/Subject';
import { GradeBadge } from './GradeBadge';
import { PromotionCard } from './PromotionCard';
import { SemesterSelect } from './SemesterSelect';
import { useGradesView } from './useGradesView';

/** Semesterübersicht: alle Fächer mit Schnitt und gerundeter Zeugnisnote, dazu die Promotions-Ampel. */
export default function GradesPage() {
  const view = useGradesView();
  if (!view) return null;
  const { semester, semesters, summaries, promotion, rules, semesterQuery, setSemester } = view;
  const count = summaries.reduce((n, s) => n + s.grades.length, 0);
  const step = rules.roundingStep;

  return (
    <>
      <PageHeader
        title="Noten"
        subtitle={semester ? `${semester.name} · ${plural(count, 'Note', 'Noten')}` : undefined}
        actions={
          <>
            <SemesterSelect semesters={semesters} value={semester?.id} onChange={setSemester} />
            <Button variant="primary" icon={<Plus size={18} aria-hidden />} onClick={() => ui.openQuickAdd('grade')}>
              Note
            </Button>
          </>
        }
      />
      {summaries.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="Noch keine Fächer"
            action={
              <Link
                to="/einstellungen#faecher"
                className="inline-flex h-11 items-center rounded-[10px] bg-accent px-4 font-medium text-on-accent"
              >
                Fächer anlegen
              </Link>
            }
          >
            Lege deine Fächer an, dann kannst du Noten erfassen.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <PromotionCard promotion={promotion} rules={rules} to={`/noten/promotion${semesterQuery}`} className="lg:order-2" />
          <Card
            title="Fächer"
            description={count === 0 ? 'Tippe auf ein Fach oder erfasse die erste Note.' : undefined}
            bodyClassName="px-2 pt-2 pb-2 lg:px-3 lg:pb-3"
            className="lg:order-1"
          >
            <ul className="divide-y divide-line">
              {summaries.map(({ subject, grades, average, grade, toNext }) => {
                const hint =
                  toNext !== null && grade !== null && toNext > 0 && toNext <= 0.15
                    ? `noch ${formatAverage(toNext)} bis zur ${formatGrade(grade + step)}`
                    : null;
                return (
                  <li key={subject.id}>
                    <Link
                      to={`/noten/fach/${subject.id}${semesterQuery}`}
                      className="flex min-h-16 items-center gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-surface-2"
                    >
                      <SubjectDot color={subject.color} size={12} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium">{subject.name}</p>
                        <p className="truncate text-[13px] text-ink-2">
                          {grades.length === 0
                            ? 'Noch keine Note'
                            : `${plural(grades.length, 'Note', 'Noten')} · Ø ${formatAverage(average ?? 0)}`}
                          {!subject.isPromotion && ' · zählt nicht'}
                          {hint && ` · ${hint}`}
                        </p>
                      </div>
                      <GradeBadge grade={grade} passMark={rules.passMark} />
                      <ChevronRight size={18} aria-hidden className="shrink-0 text-ink-3" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
