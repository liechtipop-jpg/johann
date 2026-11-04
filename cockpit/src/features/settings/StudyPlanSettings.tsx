import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { db } from '@/db/db';
import { patchSetting, type Settings } from '@/db/settings';
import { useSettings } from '@/db/settingsContext';
import { rebuildPlan } from '@/features/planner/actions';
import { cn } from '@/lib/cn';
import { formatDate, isISODate, todayISO } from '@/lib/dates';
import { formatMinutes, plural } from '@/lib/format';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Input } from '@/ui/Field';
import { Stepper } from '@/ui/Stepper';
import { Switch } from '@/ui/Switch';
import { toast } from '@/ui/toast';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const OFFSETS = [1, 2, 3, 5, 7, 10, 14];

type Prefs = Settings['studyPlan'];

function Chip({ pressed, onClick, children, label }: { pressed: boolean; onClick: () => void; children: string; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'h-10 min-w-11 rounded-full border px-3 text-sm font-medium tabular-nums transition-colors pointer-coarse:h-11',
        pressed ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-surface text-ink-2 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

/** Einstellungen für den Lernplan-Generator. */
export function StudyPlanSettings() {
  const { studyPlan: prefs } = useSettings();
  const [newDate, setNewDate] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (patch: Partial<Prefs>) => void patchSetting('studyPlan', patch);
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  async function rebuildAll() {
    setBusy(true);
    try {
      const today = todayISO();
      const exams = (await db.exams.where('date').above(today).sortBy('date')).filter((e) => e.topics.length > 0);
      for (const exam of exams) await rebuildPlan(exam.id, today);
      toast(exams.length ? `${plural(exams.length, 'Lernplan', 'Lernpläne')} neu berechnet` : 'Keine anstehenden Prüfungen mit Themen', {
        tone: 'success',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id="lernplan" title="Lernplan" description="So verteilt Cockpit deine Themen auf die Tage vor einer Prüfung.">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[15px]">Höchstens pro Tag</span>
          <Stepper
            label="Lernzeit pro Tag"
            value={prefs.maxMinutesPerDay}
            min={15}
            max={300}
            step={15}
            format={formatMinutes}
            onChange={(maxMinutesPerDay) => update({ maxMinutesPerDay })}
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-[15px]">Gesperrte Wochentage</legend>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day, index) => (
              <Chip
                key={day}
                label={WEEKDAY_NAMES[index]}
                pressed={prefs.blockedWeekdays.includes(index)}
                onClick={() => update({ blockedWeekdays: toggle(prefs.blockedWeekdays, index).sort() })}
              >
                {day}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-[15px]">Gesperrte Tage (z. B. Ferien, Sportlager)</legend>
          {prefs.blockedDates.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {prefs.blockedDates.map((date) => (
                <li
                  key={date}
                  className="inline-flex h-9 items-center gap-1 rounded-full bg-surface-2 pr-1 pl-3 text-sm tabular-nums dark:bg-surface-3"
                >
                  {formatDate(date, 'weekday')}
                  <IconButton
                    label={`${formatDate(date, 'long')} freigeben`}
                    className="size-8"
                    onClick={() => update({ blockedDates: prefs.blockedDates.filter((d) => d !== date) })}
                  >
                    <X size={14} aria-hidden />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Input type="date" aria-label="Tag sperren" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-44" />
            <Button
              disabled={!isISODate(newDate) || prefs.blockedDates.includes(newDate)}
              onClick={() => {
                update({ blockedDates: [...prefs.blockedDates, newDate].sort() });
                setNewDate('');
              }}
            >
              Sperren
            </Button>
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-[15px]">Lernzeit pro Thema</legend>
          {(['S', 'M', 'L'] as const).map((effort) => (
            <div key={effort} className="flex items-center justify-between gap-4">
              <span className="text-[15px] text-ink-2">
                {effort} · {effort === 'S' ? 'klein' : effort === 'M' ? 'mittel' : 'gross'}
              </span>
              <Stepper
                label={`Lernzeit ${effort}`}
                value={prefs.effortMinutes[effort]}
                min={15}
                max={240}
                step={15}
                format={formatMinutes}
                onChange={(minutes) => update({ effortMinutes: { ...prefs.effortMinutes, [effort]: minutes } })}
              />
            </div>
          ))}
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-[15px]">Wiederholen nach … Tagen</legend>
          <div className="flex flex-wrap gap-1.5">
            {OFFSETS.map((offset) => (
              <Chip
                key={offset}
                label={`nach ${offset} ${offset === 1 ? 'Tag' : 'Tagen'}`}
                pressed={prefs.reviewOffsets.includes(offset)}
                onClick={() => update({ reviewOffsets: toggle(prefs.reviewOffsets, offset).sort((a, b) => a - b) })}
              >
                {String(offset)}
              </Chip>
            ))}
          </div>
        </fieldset>

        <Switch
          label="Repetitionstag vor der Prüfung"
          description="Der letzte freie Tag ist fürs Repetieren aller Themen reserviert."
          checked={prefs.repetitionDay}
          onChange={(repetitionDay) => update({ repetitionDay })}
        />

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <p className="min-w-48 flex-1 text-[13px] text-ink-2">
            Änderungen gelten für neue Lernpläne. Bestehende kannst du neu berechnen; Erledigtes bleibt erhalten.
          </p>
          <Button size="sm" icon={<RefreshCw size={16} aria-hidden />} disabled={busy} onClick={() => void rebuildAll()}>
            Alle neu berechnen
          </Button>
        </div>
      </div>
    </Card>
  );
}
