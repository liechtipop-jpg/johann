import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarPlus, CircleCheck, GraduationCap, ListPlus, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { db } from '@/db/db';
import { useSubjectMap } from '@/db/hooks';
import { useSettings } from '@/db/settingsContext';
import { GradeForm } from '@/features/grades/GradeForm';
import { diffDays, formatDate, relativeDays } from '@/lib/dates';
import { formatGrade, formatMinutes } from '@/lib/format';
import { useToday } from '@/lib/useNow';
import { BackLink } from '@/ui/BackLink';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Textarea } from '@/ui/Field';
import { PageHeader } from '@/ui/PageHeader';
import { ProgressRing } from '@/ui/ProgressRing';
import { Sheet } from '@/ui/Sheet';
import { Badge } from '@/ui/StatusPill';
import { SubjectChip } from '@/ui/Subject';
import { subjectColorValue } from '@/ui/subject';
import { deleteExamWithUndo, rebuildPlan, redistributeAll, reportPlan } from './actions';
import { EFFORT_LABELS } from './effort';
import { ExamForm } from './ExamForm';
import { exportExamsIcs } from './exportIcs';
import { planProgress } from './logic/studyplan';
import { SessionRow } from './SessionRow';

/** Prüfung im Detail: Lernfortschritt, Themen, Lernplan, Notizen und Note. */
export default function ExamDetailPage() {
  const { examId = '' } = useParams();
  const navigate = useNavigate();
  const exam = useLiveQuery(() => db.exams.get(examId).then((e) => e ?? null), [examId]);
  const sessions = useLiveQuery(() => db.studySessions.where('examId').equals(examId).sortBy('date'), [examId]);
  const grade = useLiveQuery(() => (exam?.gradeId ? db.grades.get(exam.gradeId).then((g) => g ?? null) : null), [exam?.gradeId]);
  const subjects = useSubjectMap();
  const { studyPlan } = useSettings();
  const today = useToday();
  const [editing, setEditing] = useState(false);
  const [grading, setGrading] = useState(false);
  const [busy, setBusy] = useState(false);

  if (exam === undefined || sessions === undefined) return null;
  if (exam === null) {
    return (
      <>
        <BackLink to="/planer" label="Planer" />
        <EmptyState icon={CalendarPlus} title="Prüfung nicht gefunden">
          Vielleicht wurde sie gelöscht.
        </EmptyState>
      </>
    );
  }

  const subject = subjects.get(exam.subjectId);
  const progress = planProgress(sessions);
  const days = diffDays(today, exam.date);
  const missed = sessions.filter((s) => !s.done && s.date < today);
  const byDate = new Map<string, typeof sessions>();
  for (const s of sessions) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);
  const topicDone = (topicId: string) => {
    const learn = sessions.filter((s) => s.kind === 'learn' && s.topicId === topicId);
    return learn.length > 0 && learn.every((s) => s.done);
  };

  async function replan() {
    if (!exam) return;
    setBusy(true);
    try {
      reportPlan(await rebuildPlan(exam.id, today), exam.title);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <BackLink to="/planer" label="Planer" />
      <PageHeader
        title={exam.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {subject && <SubjectChip name={subject.name} color={subject.color} />}
            <span>
              {formatDate(exam.date, 'full')}
              {exam.time ? `, ${exam.time} Uhr` : ''}
            </span>
          </span>
        }
        actions={
          <>
            <IconButton label="Prüfung bearbeiten" onClick={() => setEditing(true)} className="border border-line">
              <Pencil size={18} aria-hidden />
            </IconButton>
            <Button icon={<CalendarPlus size={18} aria-hidden />} onClick={() => void exportExamsIcs([exam], `Prüfung ${subject?.name ?? ''} ${exam.title}`)}>
              Kalender
            </Button>
            {!exam.gradeId && (
              <Button variant={days <= 0 ? 'primary' : 'secondary'} icon={<GraduationCap size={18} aria-hidden />} onClick={() => setGrading(true)}>
                Note eintragen
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card title="Lernfortschritt">
          <div className="flex items-center gap-5">
            <ProgressRing
              value={progress.ratio}
              size={76}
              stroke={7}
              color={subject ? subjectColorValue(subject.color) : undefined}
              label={`${Math.round(progress.ratio * 100)} Prozent gelernt`}
            >
              <span className="text-[15px]">{Math.round(progress.ratio * 100)}%</span>
            </ProgressRing>
            <div className="min-w-0">
              <p className="text-[22px] leading-tight font-semibold tabular-nums">{days >= 0 ? relativeDays(days) : 'vorbei'}</p>
              <p className="text-sm text-ink-2">
                {progress.total > 0 ? `${formatMinutes(progress.done)} von ${formatMinutes(progress.total)} gelernt` : 'Noch kein Lernplan'}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {days > 0 && exam.topics.length > 0 && (
              <Button size="sm" icon={<RefreshCw size={16} aria-hidden />} disabled={busy} onClick={() => void replan()}>
                {sessions.length ? 'Lernplan neu berechnen' : 'Lernplan erstellen'}
              </Button>
            )}
            {missed.length > 0 && days > 0 && (
              <Button size="sm" variant="primary" onClick={() => void redistributeAll(today)}>
                {missed.length} verpasste neu verteilen
              </Button>
            )}
          </div>
        </Card>

        <Card title="Themen" description={exam.topics.length ? `Aufwand: S ${studyPlan.effortMinutes.S} · M ${studyPlan.effortMinutes.M} · L ${studyPlan.effortMinutes.L} min` : undefined}>
          {exam.topics.length === 0 ? (
            <EmptyState
              icon={ListPlus}
              title="Noch keine Themen"
              className="py-6"
              action={
                <Button variant="primary" onClick={() => setEditing(true)}>
                  Themen hinzufügen
                </Button>
              }
            >
              Mit Themen erstellt Cockpit einen Lernplan bis zur Prüfung.
            </EmptyState>
          ) : (
            <ul className="-my-1 divide-y divide-line">
              {exam.topics.map((topic) => (
                <li key={topic.id} className="flex items-center gap-3 py-2.5">
                  {topicDone(topic.id) ? (
                    <CircleCheck size={18} aria-label="gelernt" className="shrink-0 text-success" />
                  ) : (
                    <span aria-hidden className="size-[18px] shrink-0 rounded-full border-2 border-line-strong" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{topic.title}</span>
                  <Badge>
                    {topic.effort} · {EFFORT_LABELS[topic.effort]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Lernplan" className="lg:row-span-2">
          {sessions.length === 0 ? (
            <p className="text-[15px] text-ink-2">
              {exam.topics.length === 0 ? 'Füge Themen hinzu, dann plant Cockpit die Lerneinheiten.' : days <= 0 ? 'Die Prüfung ist vorbei.' : 'Noch kein Lernplan erstellt.'}
            </p>
          ) : (
            <div className="space-y-4">
              {[...byDate.entries()].map(([date, list]) => (
                <section key={date} aria-label={formatDate(date, 'full')}>
                  <h3 className="text-sm font-semibold text-ink-2">
                    {date === today ? 'Heute' : formatDate(date, 'weekday')}
                    {date < today && list.some((s) => !s.done) && <span className="font-normal text-warning"> · verpasst</span>}
                  </h3>
                  <ul className="divide-y divide-line">
                    {list.map((s) => (
                      <SessionRow key={s.id} session={s} exam={exam} subject={subject} showExam={false} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Card>

        <Card title="Notizen">
          <NotesField key={exam.id} examId={exam.id} initial={exam.notes ?? ''} />
        </Card>

        <Card title="Note">
          {grade ? (
            <div className="flex items-center justify-between gap-3">
              <p>
                <span className="text-[28px] font-semibold tabular-nums">{formatGrade(grade.value)}</span>
                <span className="ml-2 text-sm text-ink-2">Gewicht {formatGrade(grade.weight)}</span>
              </p>
              <Link to={`/noten/fach/${exam.subjectId}`} className="text-sm font-medium text-accent-ink underline underline-offset-2">
                Zu den Noten
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[15px] text-ink-2">Nach der Prüfung trägst du hier die Note ein.</p>
              <Button size="sm" icon={<GraduationCap size={16} aria-hidden />} onClick={() => setGrading(true)}>
                Note eintragen
              </Button>
            </div>
          )}
          <div className="mt-5 border-t border-line pt-4">
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              icon={<Trash2 size={16} aria-hidden />}
              onClick={() => {
                void deleteExamWithUndo(exam);
                navigate('/planer');
              }}
            >
              Prüfung löschen
            </Button>
          </div>
        </Card>
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Prüfung bearbeiten">
        {editing && <ExamForm initial={exam} onDone={() => setEditing(false)} />}
      </Sheet>
      <Sheet open={grading} onClose={() => setGrading(false)} title="Note eintragen">
        {grading && (
          <GradeForm
            preset={{ subjectId: exam.subjectId, title: exam.title, weight: exam.weight, date: exam.date <= today ? exam.date : today, examId: exam.id }}
            onDone={() => setGrading(false)}
          />
        )}
      </Sheet>
    </>
  );
}

function NotesField({ examId, initial }: { examId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <Textarea
      aria-label="Notizen zur Prüfung"
      placeholder="Hilfsmittel, Seiten im Buch, Hinweise der Lehrperson …"
      value={value}
      maxLength={5000}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initial) void db.exams.update(examId, { notes: value.trim() || undefined });
      }}
    />
  );
}
