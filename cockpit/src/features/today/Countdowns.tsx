import { useLiveQuery } from 'dexie-react-hooks';
import { Hourglass, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { db } from '@/db/db';
import { deleteWithUndo } from '@/db/undo';
import { cn } from '@/lib/cn';
import { diffDays, formatDate, isISODate, type ISODate } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Field, Input } from '@/ui/Field';
import { FormActions } from '@/ui/FormActions';
import { Sheet } from '@/ui/Sheet';
import { toastUndo } from '@/ui/toast';

const SUGGESTIONS = ['Montpellier', 'Ferien', 'Prüfungswoche'];

export function Countdowns({ today }: { today: ISODate }) {
  const countdowns = useLiveQuery(() => db.countdowns.orderBy('date').toArray(), []);
  const [adding, setAdding] = useState(false);
  if (!countdowns) return null;
  return (
    <Card
      title="Countdowns"
      action={
        <Button size="sm" variant="ghost" icon={<Plus size={16} aria-hidden />} onClick={() => setAdding(true)}>
          Neu
        </Button>
      }
    >
      {countdowns.length === 0 ? (
        <EmptyState icon={Hourglass} title="Worauf freust du dich?" className="py-6">
          Zähle die Tage bis zu Ferien, Reisen oder Prüfungswochen.
        </EmptyState>
      ) : (
        <ul className="-my-1 divide-y divide-line">
          {countdowns.map((c) => {
            const days = diffDays(today, c.date);
            return (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.title}</p>
                  <p className="text-[13px] text-ink-2">{formatDate(c.date, 'full')}</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-[26px] leading-none font-semibold tabular-nums', days < 0 && 'text-ink-3')}>
                    {days === 0 ? 'Heute' : Math.abs(days)}
                  </p>
                  <p className="mt-1 text-xs text-ink-2">
                    {days === 0 ? 'ist es so weit' : days > 0 ? (days === 1 ? 'Tag' : 'Tage') : days === -1 ? 'Tag her' : 'Tage her'}
                  </p>
                </div>
                <IconButton
                  label={`Countdown «${c.title}» löschen`}
                  onClick={() => void deleteWithUndo(db.countdowns, [c.id], `Countdown «${c.title}» gelöscht`)}
                  className="-mr-2"
                >
                  <Trash2 size={18} aria-hidden />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}
      <Sheet open={adding} onClose={() => setAdding(false)} title="Neuer Countdown">
        <CountdownForm today={today} onDone={() => setAdding(false)} />
      </Sheet>
    </Card>
  );
}

function CountdownForm({ today, onDone }: { today: ISODate; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [errors, setErrors] = useState<{ title?: string; date?: string }>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!title.trim()) next.title = 'Bitte einen Namen eingeben.';
    if (!isISODate(date)) next.date = 'Bitte ein Datum wählen.';
    setErrors(next);
    if (Object.keys(next).length) return;
    const id = newId();
    await db.countdowns.add({ id, title: title.trim(), date, createdAt: Date.now() });
    toastUndo(`Countdown «${title.trim()}» erstellt`, () => db.countdowns.delete(id));
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Name" error={errors.title}>
        {(p) => <Input {...p} data-autofocus maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} />}
      </Field>
      <div className="-mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Vorschläge">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTitle(s)}
            className="h-9 rounded-full border border-line px-3 text-sm text-ink-2 hover:text-ink pointer-coarse:h-11"
          >
            {s}
          </button>
        ))}
      </div>
      <Field label="Datum" error={errors.date}>
        {(p) => <Input {...p} type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />}
      </Field>
      <FormActions submitLabel="Countdown speichern" />
    </form>
  );
}
