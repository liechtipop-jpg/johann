import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarClock, ListTodo, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { ui } from '@/app/uiStore';
import { db } from '@/db/db';
import { useSubjectMap } from '@/db/hooks';
import type { Task } from '@/db/schemas';
import { deleteWithUndo } from '@/db/undo';
import { cn } from '@/lib/cn';
import { addDays, diffDays, formatDate, parseISODate, relativeDays, startOfWeek, type ISODate } from '@/lib/dates';
import { plural } from '@/lib/format';
import { useToday } from '@/lib/useNow';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { CheckCircle } from '@/ui/CheckCircle';
import { EmptyState } from '@/ui/EmptyState';
import { PageHeader } from '@/ui/PageHeader';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { SubjectChip } from '@/ui/Subject';
import { subjectColorValue, subjectStyle } from '@/ui/subject';

type Tab = 'pruefungen' | 'aufgaben';
const TABS = [
  { value: 'pruefungen' as const, label: 'Prüfungen' },
  { value: 'aufgaben' as const, label: 'Aufgaben' },
];

export default function PlannerPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'aufgaben' ? 'aufgaben' : 'pruefungen';
  return (
    <>
      <PageHeader
        title="Planer"
        actions={
          <Button
            variant="primary"
            icon={<Plus size={18} aria-hidden />}
            onClick={() => ui.openQuickAdd(tab === 'aufgaben' ? 'task' : 'exam')}
          >
            {tab === 'aufgaben' ? 'Aufgabe' : 'Prüfung'}
          </Button>
        }
      />
      <SegmentedControl
        label="Ansicht"
        options={TABS}
        value={tab}
        onChange={(v) => setParams({ tab: v }, { replace: true })}
        className="mb-5 max-w-sm"
      />
      {tab === 'pruefungen' ? <ExamList /> : <TaskList />}
    </>
  );
}

function ExamList() {
  const exams = useLiveQuery(() => db.exams.orderBy('date').toArray(), []);
  const subjects = useSubjectMap();
  const today = useToday();
  if (!exams) return null;
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
          Trage Datum und Themen ein – im nächsten Schritt erstellt Cockpit daraus deinen Lernplan.
        </EmptyState>
      </Card>
    );
  }
  const upcoming = exams.filter((e) => e.date >= today);
  const past = exams.filter((e) => e.date < today).reverse();

  const row = (exam: (typeof exams)[number]) => {
    const subject = subjects.get(exam.subjectId);
    const days = diffDays(today, exam.date);
    const date = parseISODate(exam.date);
    return (
      <li key={exam.id} className="flex items-center gap-3 py-3">
        <div
          className="subject grid w-12 shrink-0 place-items-center rounded-[10px] bg-(--sc-soft) py-1.5 text-(--sc-text)"
          style={subject ? subjectStyle(subject.color) : undefined}
        >
          <span className="text-[11px] font-semibold uppercase">{formatDate(exam.date, 'weekday').split(',')[0]}</span>
          <span className="text-[19px] leading-tight font-semibold tabular-nums">{date.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{exam.title}</p>
          <p className="truncate text-[13px] text-ink-2">
            {subject?.name ?? 'Ohne Fach'} · {formatDate(exam.date, 'medium')}
            {exam.time ? `, ${exam.time}` : ''}
            {exam.topics.length > 0 && ` · ${plural(exam.topics.length, 'Thema', 'Themen')}`}
          </p>
        </div>
        {days >= 0 && (
          <span className={cn('shrink-0 text-sm font-medium tabular-nums', days <= 3 ? 'text-warning' : 'text-ink-2')}>
            {relativeDays(days)}
          </span>
        )}
        <IconButton
          label={`Prüfung «${exam.title}» löschen`}
          onClick={() => void deleteWithUndo(db.exams, [exam.id], `Prüfung «${exam.title}» gelöscht`)}
          className="-mr-2"
        >
          <Trash2 size={18} aria-hidden />
        </IconButton>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <Card title="Anstehend" description={upcoming.length ? plural(upcoming.length, 'Prüfung', 'Prüfungen') : 'Nichts geplant'}>
        {upcoming.length > 0 && <ul className="-my-2 divide-y divide-line">{upcoming.map(row)}</ul>}
      </Card>
      {past.length > 0 && (
        <details className="rounded-[14px] border border-line bg-surface">
          <summary className="flex h-12 cursor-pointer items-center px-4 text-[15px] font-medium lg:px-5">
            Vergangene Prüfungen ({past.length})
          </summary>
          <ul className="divide-y divide-line border-t border-line px-4 lg:px-5">{past.map(row)}</ul>
        </details>
      )}
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

function toggleTask(task: Task, done: boolean) {
  return db.tasks.update(task.id, { done, doneAt: done ? Date.now() : undefined });
}

function TaskList() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);
  const subjects = useSubjectMap();
  const today = useToday();
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
                      onChange={(done) => void toggleTask(task, done)}
                      label={`${task.title} erledigt`}
                      color={subject ? subjectColorValue(subject.color) : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-[15px]', task.done && 'text-ink-2 line-through decoration-ink-3')}>{task.title}</p>
                      {(subject || task.due) && (
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2">
                          {subject && <SubjectChip name={subject.name} color={subject.color} />}
                          {task.due && (
                            <span>
                              {relativeDays(diffDays(today, task.due))}, {formatDate(task.due, 'weekday')}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
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
    </div>
  );
}
