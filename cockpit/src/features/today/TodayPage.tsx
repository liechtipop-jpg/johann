import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarCheck, CalendarClock, ChevronRight, Layers, ListTodo, Plus, X } from 'lucide-react';
import { Link } from 'react-router';
import { InstallHint } from '@/app/InstallHint';
import { ui } from '@/app/uiStore';
import { db } from '@/db/db';
import { patchSetting } from '@/db/settings';
import { useSettings } from '@/db/settingsContext';
import { BackupReminder } from '@/features/backup/BackupReminder';
import { useDecks } from '@/features/flashcards/useDecks';
import { redistributeAll, setTaskDone } from '@/features/planner/actions';
import { planProgress } from '@/features/planner/logic/studyplan';
import { SessionRow } from '@/features/planner/SessionRow';
import { usePlanData } from '@/features/planner/usePlanData';
import { cn } from '@/lib/cn';
import { addDays, diffDays, formatDate, greeting, isoWeek, relativeDays, toISODate, type ISODate } from '@/lib/dates';
import { formatMinutes, plural } from '@/lib/format';
import { useInstallState } from '@/lib/platform';
import { useNow } from '@/lib/useNow';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { CheckCircle } from '@/ui/CheckCircle';
import { PageHeader } from '@/ui/PageHeader';
import { ProgressRing } from '@/ui/ProgressRing';
import { SubjectChip } from '@/ui/Subject';
import { subjectColorValue } from '@/ui/subject';
import { Countdowns } from './Countdowns';
import { FirstSteps } from './FirstSteps';

const actionLink = 'inline-flex h-9 items-center gap-0.5 rounded-[8px] px-2 text-sm font-medium text-accent-ink hover:bg-surface-2 pointer-coarse:h-11';

export default function TodayPage() {
  const { profile, install } = useSettings();
  const installState = useInstallState();
  const now = useNow();
  const date = new Date(now);
  const today = toISODate(date);
  const name = profile.name.trim();

  return (
    <>
      <PageHeader title={`${greeting(date.getHours())}${name ? `, ${name}` : ''}`} subtitle={`${formatDate(today, 'full')} · KW ${isoWeek(today)}`} />
      <div className="space-y-4">
        <BackupReminder />
        <MissedBanner today={today} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <div className="min-w-0 space-y-4">
            <TodaySessions today={today} />
            <DueTasks today={today} />
          </div>
          <div className="min-w-0 space-y-4">
            <NextExams today={today} />
            <FlashcardsWidget />
            <Countdowns today={today} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <FirstSteps />
          {!install.hintDismissed && !installState.standalone && (
            <Card
              title="Als App installieren"
              action={
                <IconButton label="Hinweis ausblenden" onClick={() => void patchSetting('install', { hintDismissed: true })} className="-mr-2">
                  <X size={18} aria-hidden />
                </IconButton>
              }
            >
              <InstallHint compact />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function MissedBanner({ today }: { today: ISODate }) {
  const data = usePlanData();
  if (!data) return null;
  const missed = data.sessions.filter((s) => !s.done && s.date < today && (data.examMap.get(s.examId)?.date ?? '') > today);
  if (missed.length === 0) return null;
  return (
    <section aria-label="Verpasste Lerneinheiten" className="flex flex-wrap items-center gap-3 rounded-[14px] border border-warning/25 bg-warning-soft p-4">
      <CalendarClock size={22} aria-hidden className="shrink-0 text-warning" />
      <div className="min-w-48 flex-1">
        <p className="font-semibold">{plural(missed.length, 'Lerneinheit', 'Lerneinheiten')} verpasst</p>
        <p className="text-sm text-ink-2">Mit einem Tap verteilt Cockpit sie auf deine nächsten freien Tage.</p>
      </div>
      <Button size="sm" variant="primary" onClick={() => void redistributeAll(today)}>
        Neu verteilen
      </Button>
    </section>
  );
}

function TodaySessions({ today }: { today: ISODate }) {
  const data = usePlanData();
  if (!data) return null;
  const list = data.sessions.filter((s) => s.date === today);
  const minutes = list.reduce((n, s) => n + s.minutes, 0);
  const done = list.filter((s) => s.done).reduce((n, s) => n + s.minutes, 0);
  return (
    <Card
      title="Heute lernen"
      description={list.length ? `${formatMinutes(done)} von ${formatMinutes(minutes)} erledigt` : undefined}
      action={
        <Link to="/planer?tab=lernplan" className={actionLink}>
          Lernplan
          <ChevronRight size={16} aria-hidden />
        </Link>
      }
    >
      {list.length === 0 ? (
        <div className="flex items-center gap-3 py-1 text-[15px] text-ink-2">
          <CalendarCheck size={20} aria-hidden className="shrink-0 text-ink-3" />
          {data.exams.some((e) => e.date > today) ? (
            <span>Heute ist nichts geplant – geniess die freie Zeit.</span>
          ) : (
            <span>
              Kein Lernplan.{' '}
              <button type="button" className="font-medium text-accent-ink underline underline-offset-2" onClick={() => ui.openQuickAdd('exam')}>
                Prüfung mit Themen erfassen
              </button>
            </span>
          )}
        </div>
      ) : (
        <ul className="-my-1 divide-y divide-line">
          {list.map((s) => {
            const exam = data.examMap.get(s.examId);
            return <SessionRow key={s.id} session={s} exam={exam} subject={exam ? data.subjects.get(exam.subjectId) : undefined} />;
          })}
        </ul>
      )}
    </Card>
  );
}

function NextExams({ today }: { today: ISODate }) {
  const data = usePlanData();
  if (!data) return null;
  const upcoming = data.exams.filter((e) => e.date >= today).slice(0, 3);
  return (
    <Card
      title="Nächste Prüfungen"
      action={
        <Link to="/planer" className={actionLink}>
          Alle
          <ChevronRight size={16} aria-hidden />
        </Link>
      }
      bodyClassName="px-2 pt-2 pb-2 lg:px-3"
    >
      {upcoming.length === 0 ? (
        <div className="flex items-center justify-between gap-3 px-2 py-1">
          <span className="text-[15px] text-ink-2">Keine Prüfung in Sicht.</span>
          <Button size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => ui.openQuickAdd('exam')}>
            Prüfung
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {upcoming.map((exam) => {
            const subject = data.subjects.get(exam.subjectId);
            const progress = planProgress(data.sessions.filter((s) => s.examId === exam.id));
            const days = diffDays(today, exam.date);
            return (
              <li key={exam.id}>
                <Link to={`/planer/pruefung/${exam.id}`} className="flex items-center gap-3 rounded-[10px] px-2 py-2.5 transition-colors hover:bg-surface-2">
                  <div className="w-16 shrink-0 text-center">
                    <p className={cn('text-[22px] leading-none font-semibold tabular-nums', days <= 3 && 'text-warning')}>{days}</p>
                    <p className="mt-1 text-[12px] text-ink-2">{days === 1 ? 'Tag' : 'Tage'}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{exam.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2">
                      {subject && <SubjectChip name={subject.name} color={subject.color} />}
                      <span>
                        {relativeDays(days)}, {formatDate(exam.date, 'weekday')}
                      </span>
                    </p>
                  </div>
                  {progress.total > 0 && (
                    <ProgressRing
                      value={progress.ratio}
                      size={40}
                      stroke={4}
                      color={subject ? subjectColorValue(subject.color) : undefined}
                      label={`${Math.round(progress.ratio * 100)} Prozent gelernt`}
                    >
                      <span className="text-[10px]">{Math.round(progress.ratio * 100)}</span>
                    </ProgressRing>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function FlashcardsWidget() {
  const overview = useDecks();
  if (!overview) return null;
  const { totalDue, reviewedToday, rows } = overview;
  return (
    <Card
      title="Karteikarten"
      action={
        <Link to="/karten" className={actionLink}>
          Decks
          <ChevronRight size={16} aria-hidden />
        </Link>
      }
    >
      {rows.length === 0 ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] text-ink-2">Noch keine Decks – fertige Startdecks warten.</span>
          <Link to="/karten" className="inline-flex h-9 shrink-0 items-center rounded-[10px] border border-line px-3 text-sm font-medium hover:bg-surface-2 pointer-coarse:h-11">
            Ansehen
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-accent-soft text-accent-ink">
            <Layers size={22} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[22px] leading-tight font-semibold tabular-nums">{totalDue}</p>
            <p className="text-[13px] text-ink-2">
              {totalDue === 1 ? 'Karte fällig' : 'Karten fällig'}
              {reviewedToday > 0 && ` · heute schon ${reviewedToday} wiederholt`}
            </p>
          </div>
          {totalDue > 0 ? (
            <Link to="/karten/lernen/alle" className="inline-flex h-11 shrink-0 items-center rounded-[10px] bg-accent px-4 font-medium text-on-accent hover:bg-accent-hover">
              Lernen
            </Link>
          ) : (
            <span className="text-sm text-success">Erledigt</span>
          )}
        </div>
      )}
    </Card>
  );
}

function DueTasks({ today }: { today: ISODate }) {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);
  const data = usePlanData();
  if (!tasks || !data) return null;
  const tomorrow = addDays(today, 1);
  const open = tasks
    .filter((t) => !t.done && t.due && t.due <= tomorrow)
    .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''))
    .slice(0, 6);
  const doneToday = tasks.filter((t) => t.done && t.doneAt && toISODate(new Date(t.doneAt)) === today).length;
  return (
    <Card
      title="Aufgaben"
      description={open.length ? 'Überfällig, heute und morgen' : undefined}
      action={
        <Link to="/planer?tab=aufgaben" className={actionLink}>
          Alle
          <ChevronRight size={16} aria-hidden />
        </Link>
      }
    >
      {open.length === 0 ? (
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-3 text-[15px] text-ink-2">
            <ListTodo size={20} aria-hidden className="shrink-0 text-ink-3" />
            {doneToday > 0 ? `Alles erledigt – heute ${plural(doneToday, 'Aufgabe', 'Aufgaben')} abgehakt.` : 'Nichts fällig bis morgen.'}
          </span>
          <Button size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => ui.openQuickAdd('task')}>
            Aufgabe
          </Button>
        </div>
      ) : (
        <ul className="-my-1 divide-y divide-line">
          {open.map((task) => {
            const subject = task.subjectId ? data.subjects.get(task.subjectId) : undefined;
            const days = diffDays(today, task.due ?? today);
            return (
              <li key={task.id} className="flex items-center gap-3 py-2">
                <CheckCircle
                  checked={task.done}
                  onChange={(done) => void setTaskDone(task, done)}
                  label={`${task.title} erledigt`}
                  color={subject ? subjectColorValue(subject.color) : undefined}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">{task.title}</p>
                  <p className={cn('text-[13px]', days < 0 ? 'font-medium text-danger' : 'text-ink-2')}>
                    {days < 0 ? `überfällig (${relativeDays(days)})` : relativeDays(days)}
                    {subject && ` · ${subject.name}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
