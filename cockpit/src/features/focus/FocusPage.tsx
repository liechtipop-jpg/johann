import { useLiveQuery } from 'dexie-react-hooks';
import { ExternalLink, Pause, Play, SkipForward, Square, Trash2 } from 'lucide-react';
import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { db } from '@/db/db';
import { useSubjectMap, useSubjects } from '@/db/hooks';
import type { Exam } from '@/db/schemas';
import { patchSetting } from '@/db/settings';
import { useSettings } from '@/db/settingsContext';
import { deleteWithUndo } from '@/db/undo';
import { primeAudio } from '@/lib/chime';
import { cn } from '@/lib/cn';
import { diffDays, formatDate, relativeDays, startOfWeek } from '@/lib/dates';
import { formatMinutes } from '@/lib/format';
import { formatClock } from '@/lib/stopwatch';
import { useNow, useToday } from '@/lib/useNow';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Select } from '@/ui/Field';
import { PageHeader } from '@/ui/PageHeader';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Stepper } from '@/ui/Stepper';
import { SubjectChip } from '@/ui/Subject';
import { subjectColorValue } from '@/ui/subject';
import { Switch } from '@/ui/Switch';
import { toastUndo } from '@/ui/toast';
import { configureFocus, finishFocusEarly, pauseFocus, resumeFocus, startFocus, stopFocus, type FocusUpdate } from './actions';
import { endsAt, FCE_SEGMENTS, FCE_SOURCE, isFocusPhase, phaseLabel, progress, remainingMs, type Template } from './logic/timer';
import { WeekStats } from './WeekStats';

const TEMPLATES = [
  { value: 'pomodoro' as const, label: 'Pomodoro' },
  { value: 'fce' as const, label: 'FCE-Simulation' },
];
const clock = new Intl.DateTimeFormat('de-CH', { hour: '2-digit', minute: '2-digit' });

function undoStop(result: FocusUpdate) {
  const saved = result.sessions[result.sessions.length - 1];
  if (saved) toastUndo(`${formatMinutes(saved.focusSeconds / 60)} Fokuszeit gespeichert`, () => db.focusSessions.delete(saved.id));
}

export default function FocusPage() {
  const { focusTimer: timer } = useSettings();
  const subjects = useSubjects();
  const subjectMap = useSubjectMap();
  const today = useToday();
  const monday = startOfWeek(today);
  const exams = useLiveQuery(() => db.exams.orderBy('date').toArray(), []);
  const sessions = useLiveQuery(() => db.focusSessions.where('date').aboveOrEqual(monday).toArray(), [monday]);
  const recent = useLiveQuery(() => db.focusSessions.orderBy('date').reverse().limit(40).toArray(), []);
  const [params, setParams] = useSearchParams();

  // Verknüpfung aus der URL (z. B. «Fokus-Timer» auf einer Prüfung): /fokus?pruefung=…&vorlage=fce
  const examParam = params.get('pruefung');
  const templateParam = params.get('vorlage');
  useEffect(() => {
    if (!examParam && !templateParam) return;
    void (async () => {
      const exam = examParam ? await db.exams.get(examParam) : undefined;
      const template: Template | undefined = templateParam === 'fce' ? 'fce' : templateParam === 'pomodoro' ? 'pomodoro' : undefined;
      await configureFocus({ template, ...(exam ? { examId: exam.id, subjectId: exam.subjectId } : {}) });
      setParams({}, { replace: true });
    })();
  }, [examParam, templateParam, setParams]);

  const linkedExam = timer.examId ? exams?.find((e) => e.id === timer.examId) : undefined;
  const subject = timer.subjectId ? subjectMap.get(timer.subjectId) : undefined;
  const upcoming = (exams ?? []).filter((e) => e.date >= today || e.id === timer.examId);

  function selectExam(id: string) {
    const exam = exams?.find((e) => e.id === id);
    void configureFocus(exam ? { examId: exam.id, subjectId: exam.subjectId } : { examId: null });
  }

  return (
    <>
      <PageHeader title="Fokus" subtitle="Konzentriert arbeiten, Pausen nicht vergessen." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 space-y-4">
          <Card>
            <div className="space-y-5">
              <SegmentedControl<Template>
                label="Vorlage"
                options={TEMPLATES}
                value={timer.template}
                onChange={(template) => void configureFocus({ template })}
              />
              {timer.status !== 'idle' && timer.template === 'pomodoro' && (
                <span className="sr-only">Die Vorlage lässt sich nach dem Stoppen wechseln.</span>
              )}
              <TimerFace
                color={isFocusPhase(timer.phase) ? (subject ? subjectColorValue(subject.color) : 'var(--accent)') : 'var(--ink-3)'}
              />
              <Controls />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="focus-subject" className="text-sm font-medium">
                    Fach
                  </label>
                  <Select
                    id="focus-subject"
                    value={timer.subjectId ?? ''}
                    onChange={(e) => void configureFocus({ subjectId: e.target.value || null })}
                  >
                    <option value="">Ohne Fach</option>
                    {(subjects ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="focus-exam" className="text-sm font-medium">
                    Prüfung
                  </label>
                  <Select id="focus-exam" value={timer.examId ?? ''} onChange={(e) => selectExam(e.target.value)}>
                    <option value="">Keine</option>
                    {upcoming.map((exam: Exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.title} · {formatDate(exam.date, 'dayMonth')}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              {linkedExam && (
                <p className="text-[13px] text-ink-2">
                  Fokuszeit zählt für «{linkedExam.title}» ({relativeDays(diffDays(today, linkedExam.date)).toLowerCase()}).
                </p>
              )}
            </div>
          </Card>
          {timer.template === 'fce' ? <FceCard /> : <PrefsCard />}
        </div>
        <div className="min-w-0 space-y-4">
          <Card
            title="Diese Woche"
            description={sessions ? `${formatMinutes(sessions.reduce((n, s) => n + s.focusSeconds / 60, 0))} Fokuszeit` : undefined}
          >
            {sessions && <WeekStats sessions={sessions} subjects={subjectMap} today={today} />}
          </Card>
          <Card title="Letzte Fokuszeiten">
            {!recent || recent.length === 0 ? (
              <p className="text-[15px] text-ink-2">Noch keine Fokuszeit – starte die erste Runde.</p>
            ) : (
              <ul className="-my-1 divide-y divide-line">
                {[...recent]
                  .sort((a, b) => b.startedAt - a.startedAt)
                  .slice(0, 8)
                  .map((s) => {
                    const sub = s.subjectId ? subjectMap.get(s.subjectId) : undefined;
                    return (
                      <li key={s.id} className="flex items-center gap-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="flex min-w-0 flex-wrap items-center gap-2 text-[15px]">
                            {sub ? (
                              <SubjectChip name={sub.name} color={sub.color} />
                            ) : (
                              <span>{s.kind === 'fce' ? 'B2 First' : 'Ohne Fach'}</span>
                            )}
                            {s.label && <span className="truncate text-ink-2">{s.label.replace('B2 First – ', '')}</span>}
                          </p>
                          <p className="text-[13px] text-ink-2 tabular-nums">
                            {relativeDays(diffDays(today, s.date))} · {clock.format(s.startedAt)}–{clock.format(s.endedAt)}
                          </p>
                        </div>
                        <span className="shrink-0 font-medium tabular-nums">{formatMinutes(s.focusSeconds / 60)}</span>
                        <IconButton
                          label="Eintrag löschen"
                          className="-mr-2"
                          onClick={() => void deleteWithUndo(db.focusSessions, [s.id], 'Fokuszeit gelöscht')}
                        >
                          <Trash2 size={16} aria-hidden />
                        </IconButton>
                      </li>
                    );
                  })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function TimerFace({ color }: { color: string }) {
  const { focusTimer: timer, focus: prefs } = useSettings();
  const now = useNow(timer.status === 'running' ? 1000 : 60_000);
  const remaining = remainingMs(timer, prefs, now);
  const value = progress(timer, prefs, now);
  const end = endsAt(timer);
  const size = 248;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const round = (timer.completedFocus % prefs.longEvery) + 1;
  const status =
    timer.status === 'running' ? (end ? `läuft bis ${clock.format(end)}` : 'läuft') : timer.status === 'paused' ? 'pausiert' : 'bereit';
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative grid place-items-center"
        style={{ width: size, height: size }}
        role="timer"
        aria-label={`${phaseLabel(timer)}: noch ${formatClock(remaining)}, ${status}`}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - value)}
            className={timer.status === 'running' ? 'timer-ring' : undefined}
            style={{ opacity: value > 0 ? 1 : 0 } as CSSProperties}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center" aria-hidden>
          <p className="max-w-full truncate text-[14px] font-medium text-ink-2">{phaseLabel(timer)}</p>
          <p className="mt-1 text-[52px] leading-none font-semibold tracking-tight tabular-nums">{formatClock(remaining)}</p>
          <p className="mt-2 text-[13px] text-ink-2">{status}</p>
        </div>
      </div>
      {timer.template === 'pomodoro' ? (
        <div className="flex items-center gap-2 text-[13px] text-ink-2">
          <span className="flex gap-1.5" aria-hidden>
            {Array.from({ length: prefs.longEvery }, (_, i) => (
              <span
                key={i}
                className={cn('size-2 rounded-full', i < timer.completedFocus % prefs.longEvery ? 'bg-accent' : 'bg-surface-3')}
              />
            ))}
          </span>
          <span>
            Runde {round} von {prefs.longEvery}
          </span>
        </div>
      ) : (
        <p className="text-[13px] text-ink-2">
          Teil {timer.segmentIndex + 1} von {FCE_SEGMENTS.length}
        </p>
      )}
    </div>
  );
}

function Controls() {
  const { focusTimer: timer } = useSettings();
  const focusing = isFocusPhase(timer.phase);
  const skipLabel = timer.template === 'fce' ? 'Teil abgeben' : focusing ? 'Runde beenden' : 'Pause überspringen';
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {timer.status === 'idle' && (
        <Button
          variant="primary"
          size="lg"
          className="min-w-44"
          icon={<Play size={18} aria-hidden />}
          onClick={() => {
            primeAudio();
            void startFocus();
          }}
        >
          {timer.template === 'fce' ? 'Teil starten' : focusing ? 'Fokus starten' : 'Pause starten'}
        </Button>
      )}
      {timer.status === 'running' && (
        <Button size="lg" icon={<Pause size={18} aria-hidden />} onClick={() => void pauseFocus()}>
          Pause
        </Button>
      )}
      {timer.status === 'paused' && (
        <Button variant="primary" size="lg" icon={<Play size={18} aria-hidden />} onClick={() => void resumeFocus()}>
          Weiter
        </Button>
      )}
      {(timer.status !== 'idle' || !focusing) && (
        <Button size="lg" icon={<SkipForward size={18} aria-hidden />} onClick={async () => undoStop(await finishFocusEarly())}>
          {skipLabel}
        </Button>
      )}
      {timer.status !== 'idle' && (
        <Button variant="ghost" size="lg" icon={<Square size={18} aria-hidden />} onClick={async () => undoStop(await stopFocus())}>
          Stopp
        </Button>
      )}
    </div>
  );
}

function FceCard() {
  const { focusTimer: timer } = useSettings();
  const total = FCE_SEGMENTS.reduce((n, s) => n + s.minutes, 0);
  return (
    <Card
      title="B2 First – Prüfungssimulation"
      description={`Vier Teile, zusammen etwa ${formatMinutes(total)}. Jeder Teil startet auf Knopfdruck.`}
    >
      <ol className="space-y-1">
        {FCE_SEGMENTS.map((segment, i) => {
          const current = i === timer.segmentIndex;
          const done = i < timer.segmentIndex;
          return (
            <li
              key={segment.name}
              aria-current={current ? 'step' : undefined}
              className={cn('flex items-center gap-3 rounded-[10px] px-3 py-2.5', current && 'bg-accent-soft')}
            >
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold tabular-nums',
                  done ? 'bg-success-soft text-success' : current ? 'bg-accent text-on-accent' : 'bg-surface-2 text-ink-2',
                )}
              >
                {i + 1}
              </span>
              <span className={cn('min-w-0 flex-1 truncate', current && 'font-medium')}>
                {segment.name}
                {done && <span className="sr-only"> (erledigt)</span>}
              </span>
              <span className="shrink-0 text-[14px] text-ink-2 tabular-nums">{segment.hint ?? formatMinutes(segment.minutes)}</span>
            </li>
          );
        })}
      </ol>
      <a
        href={FCE_SOURCE}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent-ink underline-offset-2 hover:underline"
      >
        Zeiten laut Cambridge English (offizielle Seite)
        <ExternalLink size={13} aria-hidden />
      </a>
    </Card>
  );
}

function PrefsCard() {
  const { focus } = useSettings();
  const set = (patch: Partial<typeof focus>) => void patchSetting('focus', patch);
  return (
    <Card title="Pomodoro einstellen">
      <div className="space-y-3">
        <PrefRow label="Fokus">
          <Stepper
            label="Fokuszeit"
            value={focus.focusMinutes}
            min={5}
            max={180}
            step={5}
            format={formatMinutes}
            onChange={(focusMinutes) => set({ focusMinutes })}
          />
        </PrefRow>
        <PrefRow label="Kurze Pause">
          <Stepper
            label="Kurze Pause"
            value={focus.shortBreakMinutes}
            min={1}
            max={60}
            format={formatMinutes}
            onChange={(shortBreakMinutes) => set({ shortBreakMinutes })}
          />
        </PrefRow>
        <PrefRow label="Lange Pause">
          <Stepper
            label="Lange Pause"
            value={focus.longBreakMinutes}
            min={5}
            max={90}
            step={5}
            format={formatMinutes}
            onChange={(longBreakMinutes) => set({ longBreakMinutes })}
          />
        </PrefRow>
        <PrefRow label="Lange Pause nach">
          <Stepper
            label="Runden bis zur langen Pause"
            value={focus.longEvery}
            min={2}
            max={12}
            format={(v) => `${v} Runden`}
            onChange={(longEvery) => set({ longEvery })}
          />
        </PrefRow>
        <Switch
          checked={focus.autoStartBreaks}
          onChange={(autoStartBreaks) => set({ autoStartBreaks })}
          label="Pausen automatisch starten"
        />
        <Switch checked={focus.sound} onChange={(sound) => set({ sound })} label="Gong am Ende einer Phase" />
      </div>
    </Card>
  );
}

function PrefRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[15px] text-ink-2">{label}</span>
      {children}
    </div>
  );
}
