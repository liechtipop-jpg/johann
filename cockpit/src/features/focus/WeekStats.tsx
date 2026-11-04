import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { FocusSession, Subject } from '@/db/schemas';
import { cn } from '@/lib/cn';
import { IconButton } from '@/ui/Button';
import { formatDate, type ISODate } from '@/lib/dates';
import { formatMinutes } from '@/lib/format';
import { SubjectDot } from '@/ui/Subject';
import { subjectColorValue } from '@/ui/subject';
import { weekFocus } from './logic/stats';

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** Fokusminuten dieser Woche: Säulen pro Tag und Balken pro Fach. */
export function WeekStats({ sessions, subjects, today }: { sessions: FocusSession[]; subjects: Map<string, Subject>; today: ISODate }) {
  const week = weekFocus(sessions, today);
  const todayIndex = week.days.findIndex((d) => d.date === today);
  const [cursor, setCursor] = useState<number | null>(null);
  const active = cursor ?? Math.max(0, todayIndex);
  const max = Math.max(30, ...week.days.map((d) => d.minutes));
  const maxSubject = Math.max(1, ...week.subjects.map((s) => s.minutes));

  const move = (step: number) => setCursor(Math.min(6, Math.max(0, active + step)));

  const day = week.days[active];
  return (
    <div className="space-y-5">
      <div>
        <p className="sr-only">
          Fokusminuten pro Tag diese Woche: {week.days.map((d, i) => `${DAY_LABELS[i]} ${formatMinutes(d.minutes)}`).join(', ')}.
        </p>
        <div aria-hidden onPointerLeave={() => setCursor(null)} className="grid h-32 grid-cols-7 items-end gap-2 border-b border-line">
          {week.days.map((d, i) => (
            <div
              key={d.date}
              onPointerEnter={() => setCursor(i)}
              onPointerDown={() => setCursor(i)}
              className="flex h-full flex-col justify-end"
              title={`${formatDate(d.date, 'weekday')}: ${formatMinutes(d.minutes)}`}
            >
              <div
                className={cn(
                  'mx-auto w-full max-w-9 rounded-t-[4px] transition-colors',
                  i === active ? 'bg-accent' : 'bg-(--chart-seq-mid)',
                  d.minutes === 0 && 'bg-transparent',
                )}
                style={{ height: `${(d.minutes / max) * 100}%`, minHeight: d.minutes > 0 ? 4 : 0 }}
              />
            </div>
          ))}
        </div>
        <div aria-hidden className="mt-1.5 grid grid-cols-7 gap-2 text-center text-[12px] text-ink-2">
          {DAY_LABELS.map((label, i) => (
            <span key={label} className={cn(i === todayIndex && 'font-semibold text-ink')}>
              {label}
            </span>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-1 text-[13px]">
          <IconButton
            label="Vorheriger Tag"
            onClick={() => move(-1)}
            disabled={active <= 0}
            className="-ml-2 size-9 pointer-coarse:size-11"
          >
            <ChevronLeft size={16} aria-hidden />
          </IconButton>
          <p aria-live="polite" className="text-ink">
            {formatDate(day.date, 'weekday')}: {day.minutes > 0 ? formatMinutes(day.minutes) : 'keine Fokuszeit'}
          </p>
          <IconButton label="Nächster Tag" onClick={() => move(1)} disabled={active >= 6} className="size-9 pointer-coarse:size-11">
            <ChevronRight size={16} aria-hidden />
          </IconButton>
        </div>
      </div>
      {week.subjects.length > 0 && (
        <div>
          <h3 className="mb-2 text-[13px] font-medium text-ink-2">Pro Fach</h3>
          <ul className="space-y-2.5">
            {week.subjects.map((row) => {
              const subject = row.subjectId ? subjects.get(row.subjectId) : undefined;
              return (
                <li
                  key={row.subjectId ?? 'none'}
                  className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-[14px]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {subject ? (
                      <SubjectDot color={subject.color} />
                    ) : (
                      <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-ink-3" />
                    )}
                    <span className="truncate">{subject?.name ?? 'Ohne Fach'}</span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${(row.minutes / maxSubject) * 100}%`,
                        background: subject ? subjectColorValue(subject.color) : 'var(--ink-3)',
                      }}
                    />
                  </span>
                  <span className="text-right font-medium tabular-nums">{formatMinutes(row.minutes)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
