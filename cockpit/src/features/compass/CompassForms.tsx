import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import type { Criterion, StudyOption, TimelineEvent } from '@/db/schemas';
import { isISODate } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { Button } from '@/ui/Button';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { FormActions } from '@/ui/FormActions';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { addCriterion, addOption, deleteCriterion, saveCriterion, saveEvent, saveOption } from './actions';
import { EVENT_KIND_LABELS } from './format';

export function OptionNameForm({ initial, onDone }: { initial?: StudyOption; onDone: (option: StudyOption) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError('Bitte gib der Option einen Namen.');
    if (initial) {
      const next = { ...initial, name: name.trim() };
      await saveOption(next);
      onDone(next);
    } else onDone(await addOption(name));
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Studienoption" hint="z. B. Hochschule, Studiengang und geplanter Master" error={error}>
        {(p) => <Input {...p} data-autofocus maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <FormActions submitLabel={initial ? 'Speichern' : 'Option hinzufügen'} />
    </form>
  );
}

export function CriterionForm({ initial, onDone }: { initial?: Criterion; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [weight, setWeight] = useState(initial?.weight ?? 5);
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError('Bitte gib dem Kriterium einen Namen.');
    if (initial) await saveCriterion({ ...initial, name: name.trim(), weight });
    else await addCriterion(name, weight);
    onDone();
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Kriterium" error={error}>
        {(p) => (
          <Input
            {...p}
            data-autofocus
            maxLength={80}
            placeholder="z. B. Nähe zum Wohnort"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </Field>
      <div className="space-y-2">
        <label htmlFor="criterion-weight" className="flex items-center justify-between text-sm font-medium">
          Gewicht <span className="tabular-nums">{weight} von 10</span>
        </label>
        <input
          id="criterion-weight"
          type="range"
          min={0}
          max={10}
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          className="h-11 w-full accent-(--accent)"
        />
        <p className="text-[13px] text-ink-2">0 = zählt nicht, 10 = sehr wichtig.</p>
      </div>
      <div className="flex items-center gap-2">
        {initial && (
          <Button
            variant="danger"
            icon={<Trash2 size={16} aria-hidden />}
            onClick={async () => {
              await deleteCriterion(initial);
              onDone();
            }}
          >
            Löschen
          </Button>
        )}
        <div className="flex-1">
          <FormActions submitLabel={initial ? 'Speichern' : 'Kriterium hinzufügen'} />
        </div>
      </div>
    </form>
  );
}

const KIND_OPTIONS = (Object.keys(EVENT_KIND_LABELS) as Array<TimelineEvent['kind']>).map((value) => ({
  value,
  label: EVENT_KIND_LABELS[value],
}));
const urlSchema = z.url({ protocol: /^https?$/ });

export function EventForm({
  initial,
  options,
  defaultOptionId,
  onDone,
}: {
  initial?: TimelineEvent;
  options: StudyOption[];
  defaultOptionId?: string;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [kind, setKind] = useState<TimelineEvent['kind']>(initial?.kind ?? 'deadline');
  const [date, setDate] = useState(initial?.date ?? '');
  const [optionId, setOptionId] = useState(initial?.optionId ?? defaultOptionId ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<{ field: 'title' | 'date' | 'url'; message: string }>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError({ field: 'title', message: 'Bitte gib dem Termin einen Namen.' });
    if (date && !isISODate(date)) return setError({ field: 'date', message: 'Bitte ein gültiges Datum wählen.' });
    if (url.trim() && !urlSchema.safeParse(url.trim()).success)
      return setError({ field: 'url', message: 'Bitte eine vollständige Adresse mit https:// eingeben.' });
    await saveEvent({
      id: initial?.id ?? newId(),
      title: title.trim(),
      kind,
      date: date || undefined,
      optionId: optionId || undefined,
      url: url.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Titel" error={error?.field === 'title' ? error.message : undefined}>
        {(p) => (
          <Input
            {...p}
            data-autofocus
            maxLength={120}
            placeholder="z. B. Anmeldeschluss Bachelor"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </Field>
      <div className="space-y-2">
        <span className="block text-sm font-medium">Art</span>
        <SegmentedControl label="Art des Termins" options={KIND_OPTIONS} value={kind} onChange={setKind} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Datum"
          optional
          hint="Nur eintragen, wenn es offiziell bestätigt ist."
          error={error?.field === 'date' ? error.message : undefined}
        >
          {(p) => <Input {...p} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <Field label="Option" optional>
          {(p) => (
            <Select {...p} value={optionId} onChange={(e) => setOptionId(e.target.value)}>
              <option value="">Allgemein</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field label="Offizielle Quelle" optional error={error?.field === 'url' ? error.message : undefined}>
        {(p) => <Input {...p} type="url" inputMode="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />}
      </Field>
      <Field label="Notizen" optional>
        {(p) => <Textarea {...p} rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </Field>
      <FormActions submitLabel={initial ? 'Speichern' : 'Termin hinzufügen'} />
    </form>
  );
}
