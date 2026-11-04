import { useState, type FormEvent } from 'react';
import type { Piece } from '@/db/schemas';
import { Field, Input } from '@/ui/Field';
import { FormActions } from '@/ui/FormActions';
import { toastUndo } from '@/ui/toast';
import { db } from '@/db/db';
import { createPiece, savePiece } from './actions';

/** Stück anlegen oder umbenennen. */
export function PieceForm({ initial, onDone }: { initial?: Piece; onDone: (piece: Piece) => void }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [composer, setComposer] = useState(initial?.composer ?? '');
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError('Bitte gib den Titel des Stücks ein.');
    if (initial) {
      const next = { ...initial, title: title.trim(), composer: composer.trim() || undefined };
      await savePiece(next, initial, 'Stück gespeichert');
      onDone(next);
    } else {
      const piece = await createPiece(title, composer);
      toastUndo(`«${piece.title}» hinzugefügt`, () => db.pieces.delete(piece.id));
      onDone(piece);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Titel" error={error}>
        {(p) => (
          <Input
            {...p}
            data-autofocus
            maxLength={120}
            placeholder="z. B. Clair de Lune"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </Field>
      <Field label="Komponist/in oder Interpret/in" optional>
        {(p) => <Input {...p} maxLength={120} value={composer} onChange={(e) => setComposer(e.target.value)} />}
      </Field>
      <FormActions submitLabel={initial ? 'Speichern' : 'Stück hinzufügen'} />
    </form>
  );
}
