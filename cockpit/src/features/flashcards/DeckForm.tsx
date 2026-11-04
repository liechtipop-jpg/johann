import { useState, type FormEvent } from 'react';
import { db } from '@/db/db';
import { useSubjects } from '@/db/hooks';
import type { Deck } from '@/db/schemas';
import { newId } from '@/lib/ids';
import { Field, Input, Select } from '@/ui/Field';
import { FormActions } from '@/ui/FormActions';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { SubjectPicker } from '@/ui/Subject';
import { toastUndo } from '@/ui/toast';
import { ensureStates } from './actions';
import { DIRECTION_OPTIONS, LANGUAGES } from './languages';

/** Deck anlegen oder bearbeiten: Name, Fach, Sprachen fürs Vorlesen, Richtung. */
export function DeckForm({ initial, onDone }: { initial?: Deck; onDone: (deck: Deck) => void }) {
  const subjects = useSubjects();
  const [name, setName] = useState(initial?.name ?? '');
  const [subjectId, setSubjectId] = useState<string | undefined>(initial?.subjectId);
  const [frontLang, setFrontLang] = useState(initial?.frontLang ?? 'de-CH');
  const [backLang, setBackLang] = useState(initial?.backLang ?? 'fr-FR');
  const [directions, setDirections] = useState<Deck['directions']>(initial?.directions ?? 'both');
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError('Bitte gib dem Deck einen Namen.');
    const deck: Deck = {
      id: initial?.id ?? newId(),
      name: name.trim(),
      subjectId,
      frontLang: frontLang || undefined,
      backLang: backLang || undefined,
      directions,
      source: initial?.source ?? 'user',
      createdAt: initial?.createdAt ?? Date.now(),
    };
    await db.decks.put(deck);
    await ensureStates(deck);
    if (initial) toastUndo('Deck gespeichert', () => db.decks.put(initial));
    else toastUndo(`Deck «${deck.name}» erstellt`, () => db.decks.delete(deck.id));
    onDone(deck);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Name" error={error}>
        {(p) => (
          <Input
            {...p}
            data-autofocus
            maxLength={80}
            placeholder="z. B. Vocabulaire Unité 5"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </Field>
      {subjects && subjects.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            Fach <span className="font-normal text-ink-3">· optional</span>
          </legend>
          <SubjectPicker label="Fach" subjects={subjects} value={subjectId} onChange={setSubjectId} allowNone />
        </fieldset>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sprache vorne">
          {(p) => (
            <Select {...p} value={frontLang} onChange={(e) => setFrontLang(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Sprache hinten">
          {(p) => (
            <Select {...p} value={backLang} onChange={(e) => setBackLang(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium">Abfragen</span>
        <SegmentedControl label="Richtung der Abfrage" options={DIRECTION_OPTIONS} value={directions} onChange={setDirections} />
      </div>
      <FormActions submitLabel={initial ? 'Speichern' : 'Deck erstellen'} />
    </form>
  );
}
