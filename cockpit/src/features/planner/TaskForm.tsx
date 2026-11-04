import { useState, type FormEvent } from 'react';
import { db } from '@/db/db';
import { useSubjects } from '@/db/hooks';
import type { Task } from '@/db/schemas';
import { cn } from '@/lib/cn';
import { addDays, formatDate, isISODate, todayISO } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { Field, Input } from '@/ui/Field';
import { FormActions } from '@/ui/FormActions';
import { SubjectPicker } from '@/ui/Subject';
import { toastUndo } from '@/ui/toast';

export function TaskForm({ onDone, onBack, initial }: { onDone: () => void; onBack?: () => void; initial?: Task }) {
  const subjects = useSubjects();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [due, setDue] = useState(initial?.due ?? '');
  const [subjectId, setSubjectId] = useState<string | undefined>(initial?.subjectId);
  const [error, setError] = useState<string>();
  const today = todayISO();

  const quick = [
    { label: 'Heute', value: today },
    { label: 'Morgen', value: addDays(today, 1) },
    { label: 'In einer Woche', value: addDays(today, 7) },
    { label: 'Ohne Datum', value: '' },
  ];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Bitte beschreibe die Aufgabe.');
      return;
    }
    if (initial) {
      await db.tasks.put({ ...initial, title: title.trim(), subjectId, due: isISODate(due) ? due : undefined });
      toastUndo('Aufgabe geändert', () => db.tasks.put(initial));
    } else {
      const id = newId();
      await db.tasks.add({
        id,
        title: title.trim(),
        subjectId,
        due: isISODate(due) ? due : undefined,
        done: false,
        createdAt: Date.now(),
      });
      toastUndo(isISODate(due) ? `Aufgabe bis ${formatDate(due, 'weekday')} gespeichert` : 'Aufgabe gespeichert', () => db.tasks.delete(id));
    }
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Aufgabe" error={error}>
        {(p) => (
          <Input
            {...p}
            data-autofocus
            placeholder="z. B. Aufsatz abgeben"
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </Field>
      <Field label="Fällig" optional>
        {(p) => <Input {...p} type="date" value={due} onChange={(e) => setDue(e.target.value)} />}
      </Field>
      <div className="-mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Fälligkeit schnell wählen">
        {quick.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => setDue(q.value)}
            className={cn(
              'h-9 rounded-full border px-3 text-sm font-medium pointer-coarse:h-11',
              due === q.value ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-ink-2 hover:text-ink',
            )}
          >
            {q.label}
          </button>
        ))}
      </div>
      {subjects && subjects.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            Fach <span className="font-normal text-ink-3">· optional</span>
          </legend>
          <SubjectPicker label="Fach" subjects={subjects} value={subjectId} onChange={setSubjectId} allowNone />
        </fieldset>
      )}
      <FormActions submitLabel={initial ? 'Änderungen speichern' : 'Aufgabe speichern'} onBack={onBack} />
    </form>
  );
}
