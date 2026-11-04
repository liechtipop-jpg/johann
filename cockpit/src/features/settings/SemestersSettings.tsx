import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { db } from '@/db/db';
import { useSemesters } from '@/db/hooks';
import type { Semester } from '@/db/schemas';
import { deleteSemesterWithUndo } from '@/features/subjects/actions';
import { formatDate, isISODate, nextSemesterAfter, suggestSemester, type SemesterSuggestion } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { useToday } from '@/lib/useNow';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field, Input } from '@/ui/Field';
import { FormActions } from '@/ui/FormActions';
import { Sheet } from '@/ui/Sheet';
import { Badge } from '@/ui/StatusPill';
import { toastUndo } from '@/ui/toast';

export function SemestersSettings() {
  const semesters = useSemesters();
  const today = useToday();
  const [editing, setEditing] = useState<Semester | SemesterSuggestion | null>(null);
  if (!semesters) return null;
  const newest = semesters.at(-1);

  return (
    <Card
      id="semester"
      title="Semester"
      description="Jede Note gehört zu einem Semester."
      action={
        <Button
          size="sm"
          variant="ghost"
          icon={<Plus size={16} aria-hidden />}
          onClick={() => setEditing(newest ? nextSemesterAfter(newest) : suggestSemester(today))}
        >
          Neu
        </Button>
      }
    >
      <ul className="-my-1 divide-y divide-line">
        {[...semesters].reverse().map((semester) => (
          <li key={semester.id} className="flex items-center gap-2 py-2">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-medium">
                {semester.name}
                {semester.start <= today && today <= semester.end && <Badge>aktuell</Badge>}
              </p>
              <p className="text-[13px] text-ink-2 tabular-nums">
                {formatDate(semester.start, 'short')} – {formatDate(semester.end, 'short')}
              </p>
            </div>
            <IconButton label={`${semester.name} bearbeiten`} onClick={() => setEditing(semester)}>
              <Pencil size={18} aria-hidden />
            </IconButton>
            <IconButton label={`${semester.name} löschen`} onClick={() => void deleteSemesterWithUndo(semester)} className="-mr-2">
              <Trash2 size={18} aria-hidden />
            </IconButton>
          </li>
        ))}
      </ul>
      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing && 'id' in editing ? 'Semester bearbeiten' : 'Neues Semester'}
      >
        {editing && <SemesterForm initial={editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </Card>
  );
}

function SemesterForm({ initial, onDone }: { initial: Semester | SemesterSuggestion; onDone: () => void }) {
  const [name, setName] = useState(initial.name);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !isISODate(start) || !isISODate(end)) return setError('Bitte Name, Beginn und Ende ausfüllen.');
    if (start > end) return setError('Das Ende muss nach dem Beginn liegen.');
    if ('id' in initial) {
      await db.semesters.update(initial.id, { name: name.trim(), start, end });
    } else {
      const id = newId();
      await db.semesters.add({ id, name: name.trim(), start, end, createdAt: Date.now() });
      toastUndo(`«${name.trim()}» angelegt`, () => db.semesters.delete(id));
    }
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Bezeichnung" error={error}>
        {(p) => <Input {...p} data-autofocus maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Beginn">{(p) => <Input {...p} type="date" value={start} onChange={(e) => setStart(e.target.value)} />}</Field>
        <Field label="Ende">{(p) => <Input {...p} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />}</Field>
      </div>
      <FormActions submitLabel="Speichern" />
    </form>
  );
}
