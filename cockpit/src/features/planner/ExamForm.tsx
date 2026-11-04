import { BookOpen, Plus, X } from 'lucide-react';
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { db } from '@/db/db';
import { useSubjects } from '@/db/hooks';
import type { Effort, Topic } from '@/db/schemas';
import { patchSetting } from '@/db/settings';
import { useSettings } from '@/db/settingsContext';
import { addDays, formatDate, isISODate, todayISO } from '@/lib/dates';
import { parseWeight } from '@/lib/format';
import { newId } from '@/lib/ids';
import { Button, IconButton } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Field, Input } from '@/ui/Field';
import { FormActions } from '@/ui/FormActions';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { SubjectPicker } from '@/ui/Subject';
import { toastUndo } from '@/ui/toast';
import { EFFORT_OPTIONS } from './effort';

export function ExamForm({ onDone, onBack, defaultSubjectId }: { onDone: () => void; onBack?: () => void; defaultSubjectId?: string }) {
  const settings = useSettings();
  const subjects = useSubjects();
  const navigate = useNavigate();
  const [subjectId, setSubjectId] = useState<string | undefined>(defaultSubjectId ?? settings.ui.lastSubjectId);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => addDays(todayISO(), 7));
  const [time, setTime] = useState('');
  const [weightText, setWeightText] = useState('1');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [draft, setDraft] = useState('');
  const [draftEffort, setDraftEffort] = useState<Effort>('M');
  const [errors, setErrors] = useState<{ title?: string; date?: string; weight?: string }>({});

  if (!subjects) return null;
  if (subjects.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Noch keine Fächer"
        action={
          <Button
            variant="primary"
            onClick={() => {
              onDone();
              navigate('/einstellungen#faecher');
            }}
          >
            Fächer anlegen
          </Button>
        }
      >
        Prüfungen gehören immer zu einem Fach.
      </EmptyState>
    );
  }
  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];

  function addTopic() {
    const text = draft.trim();
    if (!text) return;
    setTopics((list) => [...list, { id: newId(), title: text.slice(0, 120), effort: draftEffort }]);
    setDraft('');
  }

  function onTopicKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTopic();
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const weight = weightText.trim() ? parseWeight(weightText) : 1;
    const next: typeof errors = {};
    if (!title.trim()) next.title = 'Bitte einen Titel eingeben.';
    if (!isISODate(date)) next.date = 'Bitte ein gültiges Datum wählen.';
    if (weight === null) next.weight = 'Gewicht grösser als 0';
    setErrors(next);
    if (Object.keys(next).length > 0 || weight === null) return;
    const pending = draft.trim() ? [...topics, { id: newId(), title: draft.trim().slice(0, 120), effort: draftEffort }] : topics;
    const id = newId();
    await db.exams.add({
      id,
      subjectId: subject.id,
      title: title.trim(),
      date,
      time: time || undefined,
      weight,
      topics: pending,
      createdAt: Date.now(),
    });
    await patchSetting('ui', { lastSubjectId: subject.id });
    toastUndo(`Prüfung «${title.trim()}» am ${formatDate(date, 'dayMonth')} gespeichert`, () => db.exams.delete(id));
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Fach</legend>
        <SubjectPicker label="Fach" subjects={subjects} value={subject.id} onChange={setSubjectId} />
      </fieldset>
      <Field label="Titel" error={errors.title}>
        {(p) => (
          <Input
            {...p}
            data-autofocus
            placeholder="z. B. Prüfung Unité 4"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </Field>
      <div className="grid grid-cols-[1fr_auto_auto] gap-3">
        <Field label="Datum" error={errors.date}>
          {(p) => <Input {...p} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <Field label="Zeit" optional>
          {(p) => <Input {...p} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-28" />}
        </Field>
        <Field label="Gewicht" error={errors.weight}>
          {(p) => (
            <Input
              {...p}
              inputMode="decimal"
              value={weightText}
              onChange={(e) => setWeightText(e.target.value)}
              className="w-20 text-center tabular-nums"
            />
          )}
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">
          Themen <span className="font-normal text-ink-3">· Aufwand S, M oder L</span>
        </legend>
        {topics.length > 0 && (
          <ul className="divide-y divide-line rounded-[10px] border border-line">
            {topics.map((topic) => (
              <li key={topic.id} className="flex items-center gap-2 py-1 pr-1 pl-3">
                <span className="min-w-0 flex-1 truncate">{topic.title}</span>
                <SegmentedControl
                  label={`Aufwand für ${topic.title}`}
                  options={EFFORT_OPTIONS}
                  value={topic.effort}
                  onChange={(effort) => setTopics((list) => list.map((t) => (t.id === topic.id ? { ...t, effort } : t)))}
                  className="w-32"
                />
                <IconButton label={`${topic.title} entfernen`} onClick={() => setTopics((list) => list.filter((t) => t.id !== topic.id))}>
                  <X size={18} aria-hidden />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2">
          <Input
            aria-label="Neues Thema"
            placeholder="Thema, z. B. Passé composé"
            value={draft}
            maxLength={120}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onTopicKey}
          />
          <SegmentedControl
            label="Aufwand des neuen Themas"
            options={EFFORT_OPTIONS}
            value={draftEffort}
            onChange={setDraftEffort}
            className="w-32 shrink-0"
          />
          <IconButton label="Thema hinzufügen" onClick={addTopic} className="border border-line">
            <Plus size={18} aria-hidden />
          </IconButton>
        </div>
      </fieldset>

      <FormActions submitLabel="Prüfung speichern" onBack={onBack} />
    </form>
  );
}
