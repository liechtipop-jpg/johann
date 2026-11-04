import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Flame, Gauge, Play, Square, Timer } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { db } from '@/db/db';
import { useSubjectMap } from '@/db/hooks';
import { useSettings } from '@/db/settingsContext';
import { startFocus } from '@/features/focus/actions';
import { weekFocus } from '@/features/focus/logic/stats';
import { phaseLabel, remainingMs } from '@/features/focus/logic/timer';
import { stopPractice } from '@/features/piano/actions';
import { minutesThisWeek, practiceStreak } from '@/features/piano/logic/practice';
import { primeAudio } from '@/lib/chime';
import { addDays, startOfWeek, type ISODate } from '@/lib/dates';
import { formatMinutes, plural } from '@/lib/format';
import { elapsedMs, formatClock } from '@/lib/stopwatch';
import { useNow } from '@/lib/useNow';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ProgressRing } from '@/ui/ProgressRing';
import { SubjectChip } from '@/ui/Subject';

const actionLink =
  'inline-flex h-9 items-center gap-0.5 rounded-[8px] px-2 text-sm font-medium text-accent-ink hover:bg-surface-2 pointer-coarse:h-11';
const linkButton =
  'inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-medium transition-colors duration-150';

/** Klavier-Streak mit Wochenziel und direkten Knöpfen zum Üben und zum Metronom. */
export function PianoWidget({ today }: { today: ISODate }) {
  const { piano, practiceTimer } = useSettings();
  const logs = useLiveQuery(() => db.practiceLogs.where('date').aboveOrEqual(addDays(today, -400)).toArray(), [today]);
  const pieceTitle = useLiveQuery(
    () => (practiceTimer.pieceId ? db.pieces.get(practiceTimer.pieceId).then((p) => p?.title ?? '') : ''),
    [practiceTimer.pieceId],
  );
  const now = useNow(practiceTimer.status === 'running' ? 1000 : 60_000);
  if (!logs) return null;
  const streak = practiceStreak(logs, today);
  const week = minutesThisWeek(logs, today);
  const goal = piano.weeklyGoalMinutes;
  const running = practiceTimer.status !== 'idle';
  return (
    <Card
      title="Klavier"
      action={
        <Link to="/klavier" className={actionLink}>
          Übungslog
          <ChevronRight size={16} aria-hidden />
        </Link>
      }
    >
      <div className="flex items-center gap-4">
        <ProgressRing value={goal ? week / goal : 0} size={48} stroke={5} label={`${week} von ${goal} Minuten Wochenziel`}>
          <Flame size={18} aria-hidden className={streak > 0 ? 'text-warning' : 'text-ink-3'} />
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] leading-tight font-semibold">
            {streak > 0 ? `${plural(streak, 'Tag', 'Tage')} in Folge` : 'Keine Serie'}
          </p>
          <p className="text-[13px] text-ink-2 tabular-nums">
            {formatMinutes(week)} von {formatMinutes(goal)} diese Woche
          </p>
        </div>
      </div>
      {running ? (
        <div className="mt-3 flex items-center gap-3 rounded-[12px] bg-accent-soft p-3">
          <div className="min-w-0 flex-1">
            <p className="text-[20px] leading-tight font-semibold tabular-nums">{formatClock(elapsedMs(practiceTimer, now), 'floor')}</p>
            <p className="truncate text-[13px] text-ink-2">
              {practiceTimer.status === 'paused' ? 'Pausiert' : 'Läuft'}
              {pieceTitle ? ` · ${pieceTitle}` : ''}
            </p>
          </div>
          <Button size="sm" variant="primary" icon={<Square size={14} aria-hidden />} onClick={() => void stopPractice()}>
            Fertig
          </Button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link to="/klavier?tab=ueben" className={`${linkButton} bg-accent text-on-accent hover:bg-accent-hover`}>
            <Play size={16} aria-hidden />
            Üben
          </Link>
          <Link
            to="/klavier?tab=metronom"
            className={`${linkButton} border border-line bg-surface hover:border-line-strong hover:bg-surface-2`}
          >
            <Gauge size={16} aria-hidden />
            Metronom
          </Link>
        </div>
      )}
    </Card>
  );
}

/** Fokuszeit der Woche, mit Start-Knopf (oder der laufenden Runde). */
export function FocusWidget({ today }: { today: ISODate }) {
  const { focusTimer, focus } = useSettings();
  const navigate = useNavigate();
  const subjects = useSubjectMap();
  const monday = startOfWeek(today);
  const sessions = useLiveQuery(() => db.focusSessions.where('date').aboveOrEqual(monday).toArray(), [monday]);
  const now = useNow(focusTimer.status === 'running' ? 1000 : 60_000);
  if (!sessions) return null;
  const week = weekFocus(sessions, today);
  const top = week.subjects.filter((s) => s.subjectId && subjects.has(s.subjectId)).slice(0, 3);
  const active = focusTimer.status !== 'idle';
  return (
    <Card
      title="Fokuszeit"
      action={
        <Link to="/fokus" className={actionLink}>
          Timer
          <ChevronRight size={16} aria-hidden />
        </Link>
      }
    >
      <div className="flex items-center gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-accent-soft text-accent-ink">
          <Timer size={22} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          {active ? (
            <>
              <p className="text-[22px] leading-tight font-semibold tabular-nums">{formatClock(remainingMs(focusTimer, focus, now))}</p>
              <p className="truncate text-[13px] text-ink-2">
                {phaseLabel(focusTimer)} · {focusTimer.status === 'paused' ? 'pausiert' : 'läuft'}
              </p>
            </>
          ) : (
            <>
              <p className="text-[22px] leading-tight font-semibold tabular-nums">{formatMinutes(week.total)}</p>
              <p className="text-[13px] text-ink-2">diese Woche</p>
            </>
          )}
        </div>
        {active ? (
          <Link to="/fokus" className={`${linkButton} shrink-0 border border-line bg-surface hover:bg-surface-2`}>
            Öffnen
          </Link>
        ) : (
          <Button
            variant="primary"
            className="shrink-0"
            icon={<Play size={16} aria-hidden />}
            onClick={async () => {
              primeAudio();
              await startFocus();
              navigate('/fokus');
            }}
          >
            Fokus
          </Button>
        )}
      </div>
      {top.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Fokuszeit pro Fach">
          {top.map((row) => {
            const subject = subjects.get(row.subjectId!)!;
            return (
              <li key={row.subjectId}>
                <SubjectChip name={`${subject.name} ${formatMinutes(row.minutes)}`} color={subject.color} />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
