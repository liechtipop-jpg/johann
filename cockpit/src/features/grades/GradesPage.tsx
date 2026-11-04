import { useLiveQuery } from 'dexie-react-hooks';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { ui } from '@/app/uiStore';
import { db } from '@/db/db';
import { useSemesters, useSubjects } from '@/db/hooks';
import { deleteWithUndo } from '@/db/undo';
import { formatDate, semesterForDate } from '@/lib/dates';
import { formatAverage, formatGrade } from '@/lib/format';
import { useHashScroll } from '@/lib/useHashScroll';
import { useToday } from '@/lib/useNow';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Select } from '@/ui/Field';
import { PageHeader } from '@/ui/PageHeader';
import { SubjectChip } from '@/ui/Subject';

/** Noten pro Fach und Semester. (Schnitt, Zeugnisnote, Verlauf und Promotion folgen in Phase 2.) */
export default function GradesPage() {
  const subjects = useSubjects();
  const semesters = useSemesters();
  const grades = useLiveQuery(() => db.grades.orderBy('date').toArray(), []);
  const [params, setParams] = useSearchParams();
  const today = useToday();
  const ready = Boolean(subjects && semesters && grades);
  useHashScroll(ready);
  if (!subjects || !semesters || !grades) return null;

  const semester = semesters.find((s) => s.id === params.get('semester')) ?? semesterForDate(semesters, today);
  const inSemester = grades.filter((g) => g.semesterId === semester?.id);

  return (
    <>
      <PageHeader
        title="Noten"
        subtitle={semester?.name}
        actions={
          <Button variant="primary" icon={<Plus size={18} aria-hidden />} onClick={() => ui.openQuickAdd('grade')}>
            Note
          </Button>
        }
      />
      {semesters.length > 1 && (
        <div className="mb-5 max-w-xs">
          <Select aria-label="Semester" value={semester?.id} onChange={(e) => setParams({ semester: e.target.value }, { replace: true })}>
            {[...semesters].reverse().map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {inSemester.length === 0 ? (
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="Noch keine Noten in diesem Semester"
            action={
              <Button variant="primary" icon={<Plus size={18} aria-hidden />} onClick={() => ui.openQuickAdd('grade')}>
                Note erfassen
              </Button>
            }
          >
            Erfasse deine Noten mit Gewicht – Cockpit rechnet den Schnitt für dich.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {subjects.map((subject) => {
            const list = inSemester.filter((g) => g.subjectId === subject.id);
            if (list.length === 0) return null;
            const weightSum = list.reduce((s, g) => s + g.weight, 0);
            const average = list.reduce((s, g) => s + g.value * g.weight, 0) / weightSum;
            return (
              <Card
                key={subject.id}
                id={`fach-${subject.id}`}
                title={<SubjectChip name={subject.name} color={subject.color} className="text-[14px]" />}
                action={
                  <span className="text-sm text-ink-2">
                    Ø <span className="text-[17px] font-semibold text-ink tabular-nums">{formatAverage(average)}</span>
                  </span>
                }
              >
                <ul className="-my-1 divide-y divide-line">
                  {list.map((grade) => (
                    <li key={grade.id} className="flex items-center gap-3 py-2">
                      <span className="w-12 text-[20px] font-semibold tabular-nums">{formatGrade(grade.value)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px]">{grade.title || 'Note'}</p>
                        <p className="text-[13px] text-ink-2">
                          {formatDate(grade.date, 'medium')} · Gewicht {formatGrade(grade.weight)}
                        </p>
                      </div>
                      <IconButton
                        label={`Note ${formatGrade(grade.value)} löschen`}
                        onClick={() => void deleteWithUndo(db.grades, [grade.id], `Note ${formatGrade(grade.value)} gelöscht`)}
                        className="-mr-2"
                      >
                        <Trash2 size={18} aria-hidden />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
