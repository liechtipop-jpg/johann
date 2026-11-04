import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { db } from '@/db/db';
import type { Card, Deck } from '@/db/schemas';
import { Button } from '@/ui/Button';
import { Field, Input, Textarea } from '@/ui/Field';
import { FormActions } from '@/ui/FormActions';
import { toast, toastUndo } from '@/ui/toast';
import { addCards, deleteCardsWithUndo } from './actions';
import { languageLabel } from './languages';

/** Karte anlegen («Weitere Karte» bleibt offen) oder bearbeiten. */
export function CardForm({ deck, initial, onDone }: { deck: Deck; initial?: Card; onDone: () => void }) {
  const [front, setFront] = useState(initial?.front ?? '');
  const [back, setBack] = useState(initial?.back ?? '');
  const [example, setExample] = useState(initial?.example ?? '');
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!front.trim() || !back.trim()) return setError('Vorder- und Rückseite ausfüllen.');
    setError(undefined);
    if (initial) {
      await db.cards.put({ ...initial, front: front.trim(), back: back.trim(), example: example.trim() || undefined });
      toastUndo('Karte gespeichert', () => db.cards.put(initial));
      onDone();
    } else {
      await addCards(deck, [{ front, back, example }]);
      toast('Karte hinzugefügt – gleich die nächste?', { tone: 'success' });
      setFront('');
      setBack('');
      setExample('');
      document.getElementById('card-front')?.focus();
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label={`Vorderseite${deck.frontLang ? ` (${languageLabel(deck.frontLang)})` : ''}`} error={error}>
        {(p) => <Input {...p} id="card-front" data-autofocus maxLength={1000} value={front} onChange={(e) => setFront(e.target.value)} />}
      </Field>
      <Field
        label={`Rückseite${deck.backLang ? ` (${languageLabel(deck.backLang)})` : ''}`}
        hint="Alternativen mit «/» trennen, optionale Teile in Klammern: fatigué(e)"
      >
        {(p) => <Input {...p} maxLength={1000} value={back} onChange={(e) => setBack(e.target.value)} />}
      </Field>
      <Field label="Beispielsatz" optional>
        {(p) => (
          <Textarea {...p} rows={2} maxLength={1000} value={example} onChange={(e) => setExample(e.target.value)} className="min-h-16" />
        )}
      </Field>
      {initial && (
        <Button
          size="sm"
          variant="ghost"
          className="text-danger"
          icon={<Trash2 size={16} aria-hidden />}
          onClick={() => {
            void deleteCardsWithUndo([initial.id], 'Karte gelöscht');
            onDone();
          }}
        >
          Karte löschen
        </Button>
      )}
      <FormActions submitLabel={initial ? 'Speichern' : 'Karte hinzufügen'} />
    </form>
  );
}
