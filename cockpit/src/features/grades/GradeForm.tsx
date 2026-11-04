import { BookOpen } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { db } from '@/db/db';
import { useSemesters, useSubjects } from '@/db/hooks';
import { patchSetting } from '@/db/settings';
import { useSettings } from '@/db/settingsContext';
import { cn } from '@/lib/cn';
import { isISODate, semesterForDate, todayISO } from '@/lib/dates';
import { formatGrade, parseGrade, parseWeight } from '@/lib/format';
import { newId } from '@/lib/ids';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Field, Input, Select } from '@/ui/Field';
import { FormActions } from '@/ui/FormActions';
import { SubjectPicker } from '@/ui/Subject';
import { toastUndo } from '@/ui/toast';

const WEIGHT_PRESETS = [
  { value: '0.5', label: '½' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
];

export function GradeForm({ onDone, onBack }: { onDone: () => void; onBack?: () => void }) {
  const settings = useSettings();
  const subjects = useSubjects();
  const semesters = useSemesters();
  const navigate = useNavigate();
  const [subjectId, setSubjectId] = useState<string | undefined>(settings.ui.lastSubjectId);
  const [valueText, setValueText] = useState('');
  const [weightText, setWeightText] = useState('1');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => todayISO());
  const [semesterChoice, setSemesterChoice] = useState('auto');
  const [errors, setErrors] = useState<{
    value?: string;
    weight?: string;
    date?: string;
  }>({});

  if (!subjects || !semesters) return null;
  if (subjects.length === 0 || semesters.length === 0) {
    const missing = subjects.length === 0 ? 'Fächer' : 'Semester';
    return (
      <EmptyState
        icon={BookOpen}
        title={`Noch keine ${missing}`}
        action={
          <Button
            variant="primary"
            onClick={() => {
              onDone();
              navigate(subjects.length === 0 ? '/einstellungen#faecher' : '/einstellungen#semester');
            }}
          >
            Zu den Einstellungen
          </Button>
        }
      >
        Lege zuerst {subjects.length === 0 ? 'deine Fächer' : 'ein Semester'} an.
      </EmptyState>
    );
  }

  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];
  const autoSemester = semesterForDate(semesters, isISODate(date) ? date : todayISO());
  const semester = semesters.find((s) => s.id === semesterChoice) ?? autoSemester;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = parseGrade(valueText);
    const weight = parseWeight(weightText);
    const next: typeof errors = {};
    if (value === null) next.value = 'Note zwischen 1 und 6';
    if (weight === null) next.weight = 'Gewicht grösser als 0';
    if (!isISODate(date)) next.date = 'Bitte ein gültiges Datum wählen.';
    setErrors(next);
    if (value === null || weight === null || !isISODate(date) || !semester) return;
    const id = newId();
    await db.grades.add({
      id,
      subjectId: subject.id,
      semesterId: semester.id,
      value,
      weight,
      date,
      title: title.trim() || undefined,
      createdAt: Date.now(),
    });
    await patchSetting('ui', { lastSubjectId: subject.id });
    toastUndo(`Note ${formatGrade(value)} in ${subject.name} gespeichert`, () => db.grades.delete(id));
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Fach</legend>
        <SubjectPicker label="Fach" subjects={subjects} value={subject.id} onChange={setSubjectId} />
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Note" error={errors.value}>
          {(p) => (
            <Input
              {...p}
              data-autofocus
              inputMode="decimal"
              autoComplete="off"
              placeholder="5.5"
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
              className="h-14 text-center text-2xl font-semibold tabular-nums lg:text-2xl"
            />
          )}
        </Field>
        <Field label="Gewicht" error={errors.weight}>
          {(p) => (
            <div className="space-y-2">
              <Input
                {...p}
                inputMode="decimal"
                autoComplete="off"
                value={weightText}
                onChange={(e) => setWeightText(e.target.value)}
                className="h-14 text-center text-2xl font-semibold tabular-nums lg:text-2xl"
              />
            </div>
          )}
        </Field>
      </div>
      <div className="-mt-2 flex justify-end gap-1.5" role="group" aria-label="Gewicht schnell wählen">
        {WEIGHT_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => setWeightText(preset.value)}
            aria-label={`Gewicht ${preset.value}`}
            className={cn(
              'h-9 min-w-11 rounded-full border px-3 text-sm font-medium tabular-nums pointer-coarse:h-11',
              weightText === preset.value ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-ink-2 hover:text-ink',
            )}
          >
            ×{preset.label}
          </button>
        ))}
      </div>
      <Field label="Titel" optional>
        {(p) => <Input {...p} placeholder="z. B. Vokabeltest" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Datum" error={errors.date}>
          {(p) => <Input {...p} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <Field label="Semester">
          {(p) => (
            <Select {...p} value={semesterChoice} onChange={(e) => setSemesterChoice(e.target.value)}>
              <option value="auto">{autoSemester ? autoSemester.name : 'automatisch'}</option>
              {semesters
                .filter((s) => s.id !== autoSemester?.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
          )}
        </Field>
      </div>
      <FormActions submitLabel="Note speichern" onBack={onBack} />
    </form>
  );
}
