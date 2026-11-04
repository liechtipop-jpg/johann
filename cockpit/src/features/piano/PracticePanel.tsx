import { Flame, History, Pause, Play, Plus, Square, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { db } from '@/db/db';
import type { PracticeLog } from '@/db/schemas';
import { patchSetting } from '@/db/settings';
import { useSettings } from '@/db/settingsContext';
import { deleteWithUndo } from '@/db/undo';
import { formatDate, relativeDays, diffDays, type ISODate } from '@/lib/dates';
import { formatMinutes, plural } from '@/lib/format';
import { useNow, useToday } from '@/lib/useNow';
import { elapsedMs, formatClock } from '@/lib/stopwatch';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { FormActions } from '@/ui/FormActions';
import { ProgressRing } from '@/ui/ProgressRing';
import { Sheet } from '@/ui/Sheet';
import { Stepper } from '@/ui/Stepper';
import { addPracticeLog, discardPractice, pausePractice, resumePractice, setPracticePiece, startPractice, stopPractice } from './actions';
import { minutesThisWeek, practiceStreak } from './logic/practice';
import { PracticeHeatmap } from './PracticeHeatmap';
import type { PianoData } from './usePianoData';

export function PracticePanel({ data }: { data: PianoData }) {
  const today = useToday();
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      <div className="min-w-0 space-y-4">
        <PracticeTimerCard data={data} />
        <WeekCard logs={data.logs} today={today} />
      </div>
      <div className="min-w-0 space-y-4">
        <Card title="Übungskalender" description="Minuten pro Tag, die letzten 20 Wochen">
          <PracticeHeatmap logs={data.logs} today={today} />
        </Card>
        <LogList data={data} today={today} />
      </div>
    </div>
  );
}

export function PracticeTimerCard({ data }: { data: PianoData }) {
  const { practiceTimer: timer } = useSettings();
  const now = useNow(timer.status === 'running' ? 1000 : 60_000);
  const elapsed = elapsedMs(timer, now);
  const piece = timer.pieceId ? data.pieceMap.get(timer.pieceId) : undefined;
  const nextSection = piece?.sections.find((s) => s.status !== 'ready');

  return (
    <Card
      title="Übungstimer"
      description={timer.status === 'idle' ? 'Wähle ein Stück und starte – die Zeit landet im Übungslog.' : undefined}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <label htmlFor="practice-piece" className="shrink-0 text-[15px] text-ink-2">
            Stück
          </label>
          <Select id="practice-piece" value={timer.pieceId ?? ''} onChange={(e) => void setPracticePiece(e.target.value || undefined)}>
            <option value="">Ohne bestimmtes Stück</option>
            {data.pieces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </div>
        <p className="text-center text-[56px] leading-none font-semibold tracking-tight tabular-nums" aria-live="off">
          {formatClock(elapsed, 'floor')}
        </p>
        <p className="sr-only" aria-live="polite">
          {timer.status === 'running' ? 'Timer läuft' : timer.status === 'paused' ? 'Timer pausiert' : ''}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {timer.status === 'idle' && (
            <Button
              variant="primary"
              size="lg"
              icon={<Play size={18} aria-hidden />}
              onClick={() => void startPractice(timer.pieceId)}
              className="min-w-40"
            >
              Üben starten
            </Button>
          )}
          {timer.status === 'running' && (
            <Button size="lg" icon={<Pause size={18} aria-hidden />} onClick={() => void pausePractice()}>
              Pause
            </Button>
          )}
          {timer.status === 'paused' && (
            <Button size="lg" icon={<Play size={18} aria-hidden />} onClick={() => void resumePractice()}>
              Weiter
            </Button>
          )}
          {timer.status !== 'idle' && (
            <>
              <Button variant="primary" size="lg" icon={<Square size={18} aria-hidden />} onClick={() => void stopPractice()}>
                Fertig
              </Button>
              <IconButton label="Timer verwerfen" onClick={() => void discardPractice()} className="size-12">
                <X size={20} aria-hidden />
              </IconButton>
            </>
          )}
        </div>
        {piece && (
          <p className="text-center text-[13px] text-ink-2">
            {nextSection ? (
              <>
                Als Nächstes: {nextSection.name}
                {nextSection.bars ? ` (Takte ${nextSection.bars})` : ''}
                {nextSection.bpm ? ` · ${nextSection.bpm} BPM` : ''}{' '}
              </>
            ) : null}
            <Link
              to={`/klavier?tab=metronom${nextSection?.bpm ? `&bpm=${nextSection.bpm}` : ''}`}
              className="font-medium text-accent-ink underline underline-offset-2"
            >
              Metronom öffnen
            </Link>
          </p>
        )}
      </div>
    </Card>
  );
}

function WeekCard({ logs, today }: { logs: PracticeLog[]; today: ISODate }) {
  const { piano } = useSettings();
  const week = minutesThisWeek(logs, today);
  const goal = piano.weeklyGoalMinutes;
  const streak = practiceStreak(logs, today);
  const practicedToday = logs.some((l) => l.date === today);
  const ratio = goal > 0 ? week / goal : 0;
  return (
    <Card title="Diese Woche">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <ProgressRing value={ratio} size={72} stroke={6} label={`${week} von ${goal} Minuten Wochenziel`}>
            <span className="text-[13px]">{Math.min(999, Math.round(ratio * 100))} %</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-[22px] leading-tight font-semibold tabular-nums">
              {formatMinutes(week)} <span className="text-[15px] font-normal text-ink-2">von {formatMinutes(goal)}</span>
            </p>
            <p className="text-[13px] text-ink-2">
              {week >= goal ? 'Wochenziel erreicht' : `Noch ${formatMinutes(goal - week)} bis zum Wochenziel`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[12px] bg-surface-2 p-3">
          <Flame size={22} aria-hidden className={streak > 0 ? 'shrink-0 text-warning' : 'shrink-0 text-ink-3'} />
          <div className="min-w-0">
            <p className="font-semibold">{streak > 0 ? `${plural(streak, 'Tag', 'Tage')} in Folge` : 'Noch keine Serie'}</p>
            <p className="text-[13px] text-ink-2">
              {practicedToday
                ? 'Heute schon geübt – stark.'
                : streak > 0
                  ? 'Heute noch üben, damit die Serie hält.'
                  : 'Übe heute ein paar Minuten und starte eine Serie.'}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] text-ink-2">Wochenziel</span>
          <Stepper
            label="Wochenziel"
            value={goal}
            min={15}
            max={1500}
            step={15}
            format={formatMinutes}
            onChange={(v) => void patchSetting('piano', { weeklyGoalMinutes: v })}
          />
        </div>
      </div>
    </Card>
  );
}

function LogList({ data, today }: { data: PianoData; today: ISODate }) {
  const [adding, setAdding] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const list = showAll ? data.logs : data.logs.slice(0, 8);
  return (
    <Card
      title="Übungslog"
      action={
        <Button size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => setAdding(true)}>
          Nachtragen
        </Button>
      }
    >
      {data.logs.length === 0 ? (
        <p className="flex items-center gap-3 text-[15px] text-ink-2">
          <History size={20} aria-hidden className="shrink-0 text-ink-3" />
          Noch keine Übungszeit – starte den Timer oder trage sie nach.
        </p>
      ) : (
        <>
          <ul className="-my-1 divide-y divide-line">
            {list.map((log) => (
              <li key={log.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">
                    {log.pieceId ? (data.pieceMap.get(log.pieceId)?.title ?? 'Gelöschtes Stück') : 'Freies Üben'}
                  </p>
                  <p className="truncate text-[13px] text-ink-2">
                    {relativeDays(diffDays(today, log.date))} · {formatDate(log.date, 'weekday')}
                    {log.note ? ` · ${log.note}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-[15px] font-medium tabular-nums">{formatMinutes(log.seconds / 60)}</span>
                <IconButton
                  label="Eintrag löschen"
                  onClick={() => void deleteWithUndo(db.practiceLogs, [log.id], 'Eintrag gelöscht')}
                  className="-mr-2"
                >
                  <Trash2 size={16} aria-hidden />
                </IconButton>
              </li>
            ))}
          </ul>
          {data.logs.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-2 text-sm font-medium text-accent-ink hover:underline"
            >
              {showAll ? 'Weniger anzeigen' : `Alle ${data.logs.length} Einträge anzeigen`}
            </button>
          )}
        </>
      )}
      <Sheet open={adding} onClose={() => setAdding(false)} title="Übungszeit nachtragen">
        <ManualLogForm data={data} today={today} onDone={() => setAdding(false)} />
      </Sheet>
    </Card>
  );
}

function ManualLogForm({ data, today, onDone }: { data: PianoData; today: ISODate; onDone: () => void }) {
  const [date, setDate] = useState(today);
  const [minutes, setMinutes] = useState(30);
  const [pieceId, setPieceId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!date || date > today) return setError('Bitte ein Datum bis heute wählen.');
    await addPracticeLog({ date, minutes, pieceId: pieceId || undefined, note });
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Datum" error={error}>
          {(p) => <Input {...p} type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <div className="space-y-2">
          <span className="block text-sm font-medium">Dauer</span>
          <Stepper label="Dauer" value={minutes} min={5} max={600} step={5} format={formatMinutes} onChange={setMinutes} />
        </div>
      </div>
      <Field label="Stück" optional>
        {(p) => (
          <Select {...p} value={pieceId} onChange={(e) => setPieceId(e.target.value)}>
            <option value="">Ohne bestimmtes Stück</option>
            {data.pieces.map((piece) => (
              <option key={piece.id} value={piece.id}>
                {piece.title}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Notiz" optional>
        {(p) => (
          <Textarea
            {...p}
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="z. B. linke Hand allein"
          />
        )}
      </Field>
      <FormActions submitLabel="Eintragen" />
    </form>
  );
}
