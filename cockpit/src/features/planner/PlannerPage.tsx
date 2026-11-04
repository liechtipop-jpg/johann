import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarCheck, CalendarClock, CalendarPlus, ChevronRight, ListTodo, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ui } from '@/app/uiStore';
import { db } from '@/db/db';
import { useSubjectMap } from '@/db/hooks';
import type { Task } from '@/db/schemas';
import { useSettings } from '@/db/settingsContext';
import { deleteWithUndo } from '@/db/undo';
import { cn } from '@/lib/cn';
import { addDays, diffDays, formatDate, parseISODate, relativeDays, startOfWeek, type ISODate } from '@/lib/dates';
import { formatMinutes, plural } from '@/lib/format';
import { useToday } from '@/lib/useNow';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { CheckCircle } from '@/ui/CheckCircle';
import { EmptyState } from '@/ui/EmptyState';
import { PageHeader } from '@/ui/PageHeader';
import { ProgressRing } from '@/ui/ProgressRing';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Sheet } from '@/ui/Sheet';
import { SubjectChip } from '@/ui/Subject';
import { subjectColorValue, subjectStyle } from '@/ui/subject';
import { redistributeAll, setTaskDone } from './actions';
import { exportExamsIcs } from './exportIcs';
import { planProgress } from './logic/studyplan';
import { SessionRow } from './SessionRow';
import { TaskForm } from './TaskForm';
import { usePlanData } from './usePlanData';

type Tab = 'pruefungen' | 'aufgaben' | 'lernplan';
const TABS = [
  { value: 'pruefungen' as const, label: 'Prüfungen' },
  { value: 'aufgaben' as const, label: 'Aufgaben' },
  { value: 'lernplan' as const, label: 'Lernplan' },
];

export default function PlannerPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = raw === 'aufgaben' || raw === 'lernplan' ? raw : 'pruefungen';
  return (
    <>
      <PageHeader
        title="Planer"
        actions={
          tab !== 'lernplan' && (
            <Button variant="primary" icon={<Plus size={18} aria-hidden />} onClick={() => ui.openQuickAdd(tab === 'aufgaben' ? 'task' : 'exam')}>
              {tab === 'aufgaben' ? 'Aufgabe' : 'Prüfung'}
            </Button>
          )
        }
      />
      <SegmentedControl label="Ansicht" options={TABS} value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} className="mb-5 max-w-md" />
      {tab === 'pruefungen' && <ExamList />}
      {tab === 'aufgaben' && <TaskList />}
      {tab === 'lernplan' && <StudyPlanView />}
    </>
  );
}

function ExamList() {
  const data = usePlanData();
  const today = useToday();
  if (!data) return null;
  const { exams, sessions, subjects } = data;
  if (exams.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={CalendarClock}
          title="Keine Prüfungen geplant"
          action={
            <Button variant="primary" icon={<Plus size={18} aria-hidden />} onClick={() => ui.openQuickAdd('exam')}>
              Prüfung erfassen
            </Button>
          }
        >
          Trage Datum und Themen ein – Cockpit verteilt sie automatisch als Lernplan auf die Tage davor.
        </EmptyState>
      </Card>
    );
  }
  const upcoming = exams.filter((e) => e.date >= today);
  const past = exams.filter((e) => e.date < today).reverse();

  const row = (exam: (typeof exams)[number]) => {
    const subject = subjects.get(exam.subjectId);
    const days = diffDays(today, exam.date);
    const progress = planProgress(sessions.filter((s) => s.examId === exam.id));
    return (
      <li key={exam.id}>
        <Link to={`/planer/pruefung/${exam.id}`} className="flex items-center gap-3 rounded-[10px] px-2 py-2.5 transition-colors hover:bg-surface-2">
          <div
            className="subject grid w-12 shrink-0 place-items-center rounded-[10px] bg-(--sc-soft) py-1.5 text-(--sc-text)"
            style={subject ? subjectStyle(subject.color) : undefined}
          >
            <span className="text-[11px] font-semibold uppercase">{formatDate(exam.date, 'weekday').split(',')[0]}</span>
            <span className="text-[19px] leading-tight font-semibold tabular-nums">{parseISODate(exam.date).getDate()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{exam.title}</p>
            <p className="truncate text-[13px] text-ink-2">
              {subject?.name ?? 'Ohne Fach'} · {formatDate(exam.date, 'medium')}
              {exam.time ? `, ${exam.time}` : ''}
            </p>
          </div>
          {days >= 0 && (
            <span className={cn('hidden shrink-0 text-sm font-medium tabular-nums sm:block', days <= 3 ? 'text-warning' : 'text-ink-2')}>{relativeDays(days)}</span>
          )}
          {progress.total > 0 && (
            <ProgressRing
              value={progress.ratio}
              size={36}
              stroke={4}
              color={subject ? subjectColorValue(subject.color) : undefined}
              label={`${Math.round(progress.ratio * 100)} Prozent gelernt`}
            >
              <span className="text-[10px]">{Math.round(progress.ratio * 100)}</span>
            </ProgressRing>
          )}
          <ChevronRight size={18} aria-hidden className="shrink-0 text-ink-3" />
        </Link>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <Card
        title="Anstehend"
        description={upcoming.length ? plural(upcoming.length, 'Prüfung', 'Prüfungen') : 'Nichts geplant'}
        action={
          upcoming.length > 0 && (
            <Button size="sm" variant="ghost" icon={<CalendarPlus size={16} aria-hidden />} onClick={() => void exportExamsIcs(upcoming, 'Prüfungen')}>
              Alle in den Kalender
            </Button>
          )
        }
        bodyClassName="px-2 pt-2 pb-2 lg:px-3"
      >
        {upcoming.length > 0 && <ul className="divide-y divide-line">{upcoming.map(row)}</ul>}
      </Card>
      {past.length > 0 && (
        <details className="rounded-[14px] border border-line bg-surface">
          <summary className="flex h-12 cursor-pointer items-center px-4 text-[15px] font-medium lg:px-5">Vergangene Prüfungen ({past.length})</summary>
          <ul className="divide-y divide-line border-t border-line px-2 lg:px-3">{past.map(row)}</ul>
        </details>
      )}
    </div>
  );
}

function dayTitle(date: ISODate, today: ISODate): string {
  const days = diffDays(today, date);
  if (days === 0) return 'Heute';
  if (days === 1) return 'Morgen';
  return formatDate(date, 'weekday');
}

function StudyPlanView() {
  const data = usePlanData();
  const today = useToday();
  const { studyPlan } = useSettings();
  if (!data) return null;
  const { sessions, examMap, subjects } = data;
  if (sessions.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={CalendarCheck}
          title="Noch kein Lernplan"
          action={
            <Button variant="primary" icon={<Plus size={18} aria-hidden />} onClick={() => ui.openQuickAdd('exam')}>
              Prüfung mit Themen erfassen
            </Button>
          }
        >
          Erfasse eine Prüfung mit Themen – Cockpit verteilt sie auf die Tage davor und plant Wiederholungen ein.
        </EmptyState>
      </Card>
    );
  }

  const missed = sessions.filter((s) => !s.done && s.date < today);
  const byDate = new Map<ISODate, typeof sessions>();
  for (const s of sessions) if (s.date >= today) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);

  return (
    <div className="space-y-4">
      {missed.length > 0 && (
        <section aria-label="Verpasste Einheiten" className="flex flex-wrap items-center gap-3 rounded-[14px] border border-warning/25 bg-warning-soft p-4">
          <div className="min-w-48 flex-1">
            <p className="font-semibold">{plural(missed.length, 'Einheit', 'Einheiten')} verpasst</p>
            <p className="text-sm text-ink-2">{formatMinutes(missed.reduce((n, s) => n + s.minutes, 0))} – Cockpit verteilt sie auf deine freien Tage.</p>
          </div>
          <Button size="sm" variant="primary" onClick={() => void redistributeAll(today)}>
            Neu verteilen
          </Button>
        </section>
      )}
      {[...byDate.entries()].map(([date, list]) => {
        const minutes = list.reduce((n, s) => n + s.minutes, 0);
        const done = list.filter((s) => s.done).reduce((n, s) => n + s.minutes, 0);
        return (
          <Card
            key={date}
            title={dayTitle(date, today)}
            description={`${date === today || diffDays(today, date) === 1 ? `${formatDate(date, 'weekday')} · ` : ''}${done > 0 ? `${done} von ` : ''}${minutes} min${minutes > studyPlan.maxMinutesPerDay ? ' · mehr als geplant' : ''}`}
          >
            <ul className="-my-1 divide-y divide-line">
              {list.map((s) => (
                <SessionRow key={s.id} session={s} exam={examMap.get(s.examId)} subject={subjects.get(examMap.get(s.examId)?.subjectId ?? '')} />
              ))}
            </ul>
          </Card>
        );
      })}
      {byDate.size === 0 && <p className="text-[15px] text-ink-2">Ab heute ist nichts mehr geplant.</p>}
      <p className="text-[13px] text-ink-2">
        Lernzeit pro Tag ({studyPlan.maxMinutesPerDay} min), gesperrte Tage und Wiederholungen änderst du in den{' '}
        <Link to="/einstellungen#lernplan" className="font-medium text-accent-ink underline underline-offset-2">
          Einstellungen
        </Link>
        .
      </p>
    </div>
  );
}

function groupTasks(tasks: Task[], today: ISODate) {
  const endOfWeek = addDays(startOfWeek(today), 6);
  const open = tasks.filter((t) => !t.done).sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'));
  return [
    { key: 'overdue', title: 'Überfällig', items: open.filter((t) => t.due && t.due < today) },
    { key: 'today', title: 'Heute', items: open.filter((t) => t.due === today) },
    { key: 'week', title: 'Diese Woche', items: open.filter((t) => t.due && t.due > today && t.due <= endOfWeek) },
    { key: 'later', title: 'Später', items: open.filter((t) => !t.due || t.due > endOfWeek) },
    {
      key: 'done',
      title: 'Erledigt',
      items: tasks
        .filter((t) => t.done)
        .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
        .slice(0, 20),
    },
  ];
}

function TaskList() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);
  const subjects = useSubjectMap();
  const today = useToday();
  const [editing, setEditing] = useState<Task | null>(null);
  if (!tasks) return null;
  if (tasks.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={ListTodo}
          title="Keine Aufgaben"
          action={
            <Button variant="primary" icon={<Plus size={18} aria-hidden />} onClick={() => ui.openQuickAdd('task')}>
              Aufgabe erfassen
            </Button>
          }
        >
          Hausaufgaben und Abgaben mit Fälligkeit – abhaken mit einem Tap.
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groupTasks(tasks, today)
        .filter((g) => g.items.length > 0)
        .map((group) => (
          <Card
            key={group.key}
            title={<span className={group.key === 'overdue' ? 'text-danger' : undefined}>{group.title}</span>}
            description={plural(group.items.length, 'Aufgabe', 'Aufgaben')}
          >
            <ul className="-my-1 divide-y divide-line">
              {group.items.map((task) => {
                const subject = task.subjectId ? subjects.get(task.subjectId) : undefined;
                return (
                  <li key={task.id} className="flex items-center gap-3 py-2">
                    <CheckCircle
                      checked={task.done}
                      onChange={(done) => void setTaskDone(task, done)}
                      label={`${task.title} erledigt`}
                      color={subject ? subjectColorValue(subject.color) : undefined}
                    />
                    <button type="button" onClick={() => setEditing(task)} className="min-w-0 flex-1 rounded-[8px] py-1 text-left" aria-label={`${task.title} bearbeiten`}>
                      <span className={cn('block truncate text-[15px]', task.done && 'text-ink-2 line-through decoration-ink-3')}>{task.title}</span>
                      {(subject || task.due) && (
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2">
                          {subject && <SubjectChip name={subject.name} color={subject.color} />}
                          {task.due && (
                            <span>
                              {relativeDays(diffDays(today, task.due))}, {formatDate(task.due, 'weekday')}
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                    <IconButton
                      label={`Aufgabe «${task.title}» löschen`}
                      onClick={() => void deleteWithUndo(db.tasks, [task.id], `Aufgabe «${task.title}» gelöscht`)}
                      className="-mr-2"
                    >
                      <Trash2 size={18} aria-hidden />
                    </IconButton>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Aufgabe bearbeiten">
        {editing && <TaskForm initial={editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </div>
  );
}
