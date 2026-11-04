import { CalendarClock, CalendarDays, ExternalLink, Pencil, School, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { TimelineEvent } from '@/db/schemas';
import { cn } from '@/lib/cn';
import { diffDays, formatDate, relativeDays, type ISODate } from '@/lib/dates';
import { useToday } from '@/lib/useNow';
import { IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Sheet } from '@/ui/Sheet';
import { deleteEvent } from './actions';
import { EventForm } from './CompassForms';
import { EVENT_KIND_LABELS } from './format';
import type { CompassData } from './useCompassData';

const KIND_ICONS = { deadline: CalendarClock, infoday: School, other: CalendarDays } as const;

export function TimelineView({ data, events, emptyText }: { data: CompassData; events?: TimelineEvent[]; emptyText?: string }) {
  const today = useToday();
  const [editing, setEditing] = useState<TimelineEvent | null>(null);
  const list = events ?? data.timeline;
  const upcoming = list.filter((e) => e.date && e.date >= today).sort((a, b) => a.date!.localeCompare(b.date!));
  const open = list.filter((e) => !e.date);
  const past = list.filter((e) => e.date && e.date < today).sort((a, b) => b.date!.localeCompare(a.date!));

  if (list.length === 0) return <p className="text-[15px] text-ink-2">{emptyText ?? 'Noch keine Termine.'}</p>;

  const group = (title: string, items: TimelineEvent[], dim = false) =>
    items.length > 0 && (
      <section className="space-y-2">
        <h3 className="text-[13px] font-semibold text-ink-2">{title}</h3>
        <ol className={cn('space-y-2', dim && 'opacity-70')}>
          {items.map((e) => (
            <EventRow key={e.id} event={e} data={data} today={today} onEdit={() => setEditing(e)} />
          ))}
        </ol>
      </section>
    );

  return (
    <div className="space-y-5">
      {group('Kommend', upcoming)}
      {group('Datum offen – bitte ergänzen', open)}
      {group('Vorbei', past, true)}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Termin bearbeiten">
        {editing && <EventForm key={editing.id} initial={editing} options={data.options} onDone={() => setEditing(null)} />}
      </Sheet>
    </div>
  );
}

function EventRow({ event, data, today, onEdit }: { event: TimelineEvent; data: CompassData; today: ISODate; onEdit: () => void }) {
  const Icon = KIND_ICONS[event.kind];
  const option = event.optionId ? data.optionMap.get(event.optionId) : undefined;
  const days = event.date ? diffDays(today, event.date) : null;
  return (
    <li className="flex gap-3 rounded-[12px] border border-line p-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-ink-2">
        <Icon size={18} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium tracking-wide text-ink-2 uppercase">{EVENT_KIND_LABELS[event.kind]}</p>
        <p className="font-medium">{event.title}</p>
        <p className={cn('text-[14px] tabular-nums', event.date ? 'text-ink' : 'text-ink-2')}>
          {event.date ? `${formatDate(event.date, 'full')} · ${relativeDays(days!)}` : 'Datum noch offen'}
        </p>
        {option && <p className="mt-0.5 truncate text-[13px] text-ink-2">{option.name}</p>}
        {event.notes && <p className="mt-1 text-[13px] text-ink-2">{event.notes}</p>}
        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-accent-ink hover:underline"
          >
            Offizielle Seite
            <ExternalLink size={13} aria-hidden />
          </a>
        )}
      </div>
      <div className="-mr-1 flex shrink-0 flex-col">
        <IconButton label={`«${event.title}» bearbeiten`} onClick={onEdit}>
          <Pencil size={16} aria-hidden />
        </IconButton>
        <IconButton label={`«${event.title}» löschen`} onClick={() => void deleteEvent(event)}>
          <Trash2 size={16} aria-hidden />
        </IconButton>
      </div>
    </li>
  );
}

export function TimelineCard({ data }: { data: CompassData }) {
  return (
    <Card title="Zeitstrahl" description="Anmeldefristen und Infotage – nur mit Link zur offiziellen Quelle.">
      <TimelineView data={data} emptyText="Noch keine Termine. Trage Fristen und Infotage mit offiziellem Link ein." />
    </Card>
  );
}
