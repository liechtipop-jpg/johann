import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState, type CSSProperties, type PointerEvent } from 'react';
import type { PracticeLog } from '@/db/schemas';
import { cn } from '@/lib/cn';
import { IconButton } from '@/ui/Button';
import { formatDate, parseISODate, type ISODate } from '@/lib/dates';
import { formatMinutes } from '@/lib/format';
import { heatmap, type HeatCell } from './logic/practice';

const WEEKDAYS = ['Mo', '', 'Mi', '', 'Fr', '', 'So'];
const MONTH = new Intl.DateTimeFormat('de-CH', { month: 'short' });
const LEVEL_TEXT = ['nichts', 'unter 15 min', '15–29 min', '30–59 min', 'ab 60 min'];

function describe(cell: HeatCell, style: 'full' | 'weekday' = 'weekday'): string {
  const day = formatDate(cell.date, style);
  if (cell.future) return `${day}: noch offen`;
  return cell.minutes > 0 ? `${day}: ${formatMinutes(cell.minutes)} geübt` : `${day}: nicht geübt`;
}

/** Kalender-Heatmap der Übungszeit: Spalten = Wochen, Zeilen = Montag bis Sonntag. */
export function PracticeHeatmap({ logs, today, weeks = 20 }: { logs: readonly PracticeLog[]; today: ISODate; weeks?: number }) {
  const columns = useMemo(() => heatmap(logs, today, weeks), [logs, today, weeks]);
  const [selected, setSelected] = useState<ISODate | null>(null);
  const active = selected ?? today;
  const flat = columns.flat();
  const activeCell = flat.find((c) => c.date === active) ?? flat[flat.length - 1];
  const practicedDays = flat.filter((c) => c.minutes > 0).length;
  const total = flat.reduce((n, c) => n + c.minutes, 0);

  const months = columns.map((col, i) => {
    const month = parseISODate(col[0].date).getMonth();
    const previous = i > 0 ? parseISODate(columns[i - 1][0].date).getMonth() : -1;
    return month !== previous ? MONTH.format(parseISODate(col[0].date)).replace('.', '') : '';
  });

  function pick(event: PointerEvent<HTMLDivElement>) {
    const date = (event.target as HTMLElement).dataset.date;
    if (date && date <= today) setSelected(date);
  }

  const index = flat.findIndex((c) => c.date === activeCell.date);
  const lastPast = flat.findLastIndex((c) => !c.future);
  const move = (step: number) => setSelected(flat[Math.min(lastPast, Math.max(0, index + step))].date);

  return (
    <div>
      <div className="flex gap-2">
        <div aria-hidden className="grid shrink-0 grid-rows-[auto_repeat(7,minmax(0,1fr))] gap-[3px] text-[10px] leading-none text-ink-3">
          <span className="h-3" />
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="flex items-center">
              {d}
            </span>
          ))}
        </div>
        <div className="min-w-0 max-w-[560px] flex-1">
          <div
            aria-hidden
            className="mb-[3px] grid h-3 gap-[3px] text-[10px] leading-none text-ink-3"
            style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
          >
            {months.map((m, i) => (
              <span key={i} className="overflow-visible whitespace-nowrap">
                {m}
              </span>
            ))}
          </div>
          <p className="sr-only">
            Übungskalender der letzten {weeks} Wochen: an {practicedDays} Tagen geübt, insgesamt {formatMinutes(total)}. Einzelne Tage
            findest du mit den Knöpfen «Vorheriger Tag» und «Nächster Tag» oder im Übungslog.
          </p>
          <div
            aria-hidden
            onPointerOver={pick}
            onPointerDown={pick}
            className="grid grid-flow-col grid-rows-7 gap-[3px] rounded-[4px]"
            style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
          >
            {flat.map((cell) => (
              <span
                key={cell.date}
                data-date={cell.date}
                title={describe(cell, 'full')}
                className={cn(
                  'aspect-square rounded-[3px]',
                  cell.future ? 'bg-transparent' : 'bg-(--cell)',
                  cell.date === activeCell.date && 'outline-2 outline-offset-1 outline-ink',
                )}
                style={{ '--cell': `var(--heat-${cell.level})` } as CSSProperties}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[13px]">
        <div className="flex min-w-0 items-center gap-1">
          <IconButton label="Vorheriger Tag" onClick={() => move(-1)} disabled={index <= 0} className="-ml-2 size-9 pointer-coarse:size-11">
            <ChevronLeft size={16} aria-hidden />
          </IconButton>
          <p aria-live="polite" className="min-w-0 text-ink">
            {describe(activeCell)}
          </p>
          <IconButton label="Nächster Tag" onClick={() => move(1)} disabled={index >= lastPast} className="size-9 pointer-coarse:size-11">
            <ChevronRight size={16} aria-hidden />
          </IconButton>
        </div>
        <div className="flex items-center gap-1.5 text-ink-2">
          <span>Weniger</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} title={LEVEL_TEXT[level]} className="size-3 rounded-[3px]" style={{ background: `var(--heat-${level})` }} />
          ))}
          <span>Mehr</span>
        </div>
      </div>
    </div>
  );
}
