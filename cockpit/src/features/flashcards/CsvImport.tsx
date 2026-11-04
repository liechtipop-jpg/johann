import { FileUp } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { Deck } from '@/db/schemas';
import { plural } from '@/lib/format';
import { Button } from '@/ui/Button';
import { Field, Select, Textarea } from '@/ui/Field';
import { Switch } from '@/ui/Switch';
import { toastUndo } from '@/ui/toast';
import { addCards, deleteCardsWithUndo } from './actions';
import { detectDelimiter, looksLikeHeader, parseDelimited, rowsToCards, type FieldDelimiter, type RowDelimiter } from './logic/csv';

const FIELD_OPTIONS: Array<{ value: FieldDelimiter | 'auto'; label: string }> = [
  { value: 'auto', label: 'Automatisch' },
  { value: '\t', label: 'Tabulator (Quizlet)' },
  { value: ';', label: 'Semikolon' },
  { value: ',', label: 'Komma' },
];

/** CSV- oder Quizlet-Export einfügen bzw. als Datei wählen, Vorschau prüfen, importieren. */
export function CsvImport({ deck, onDone }: { deck: Deck; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [field, setField] = useState<FieldDelimiter | 'auto'>('auto');
  const [row, setRow] = useState<RowDelimiter>('\n');
  const [headerChoice, setHeaderChoice] = useState<boolean | null>(null);
  const [exampleColumn, setExampleColumn] = useState(true);

  const delimiter = field === 'auto' ? detectDelimiter(text) : field;
  const rows = useMemo(() => (text.trim() ? parseDelimited(text, delimiter, row) : []), [text, delimiter, row]);
  const header = headerChoice ?? (rows[0] ? looksLikeHeader(rows[0]) : false);
  const hasThird = rows.some((r) => r.length >= 3);
  const { cards, skipped } = rowsToCards(rows, { front: 0, back: 1, example: hasThird && exampleColumn ? 2 : undefined }, header);

  async function run() {
    const ids = await addCards(deck, cards);
    toastUndo(`${plural(ids.length, 'Karte', 'Karten')} importiert`, () => deleteCardsWithUndo(ids, 'Import rückgängig gemacht'));
    onDone();
  }

  return (
    <div className="space-y-4">
      <p className="text-[15px] text-ink-2">
        Eine Karte pro Zeile: Vorderseite, Rückseite und optional ein Beispielsatz. In Quizlet: «Exportieren» wählen und den Text hier
        einfügen.
      </p>
      <Field label="Text einfügen">
        {(p) => (
          <Textarea
            {...p}
            data-autofocus
            rows={6}
            spellCheck={false}
            placeholder={'la gare\tder Bahnhof\nle billet\tdie Fahrkarte'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="font-mono text-sm"
          />
        )}
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" icon={<FileUp size={16} aria-hidden />} onClick={() => fileRef.current?.click()}>
          Datei wählen (.csv, .txt)
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,.tsv,text/csv,text/plain"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) setText(await file.text());
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Zwischen Vorder- und Rückseite">
          {(p) => (
            <Select {...p} value={field} onChange={(e) => setField(e.target.value as FieldDelimiter | 'auto')}>
              {FIELD_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Zwischen Karten">
          {(p) => (
            <Select {...p} value={row} onChange={(e) => setRow(e.target.value as RowDelimiter)}>
              <option value={'\n'}>Neue Zeile</option>
              <option value=";">Semikolon</option>
            </Select>
          )}
        </Field>
      </div>
      <Switch label="Erste Zeile ist eine Überschrift" checked={header} onChange={setHeaderChoice} />
      {hasThird && <Switch label="Dritte Spalte als Beispielsatz" checked={exampleColumn} onChange={setExampleColumn} />}

      {rows.length > 0 && (
        <section aria-label="Vorschau" className="rounded-[12px] border border-line">
          <p className="border-b border-line px-3 py-2 text-sm font-medium">
            Vorschau: {plural(cards.length, 'Karte', 'Karten')}
            {skipped > 0 && <span className="font-normal text-ink-2"> · {skipped} unvollständige Zeilen übersprungen</span>}
          </p>
          <ul className="max-h-48 divide-y divide-line overflow-y-auto text-sm">
            {cards.slice(0, 8).map((c, i) => (
              <li key={i} className="grid grid-cols-2 gap-3 px-3 py-2">
                <span className="truncate">{c.front}</span>
                <span className="truncate text-ink-2">{c.back}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="flex justify-end">
        <Button variant="primary" disabled={cards.length === 0} onClick={() => void run()}>
          {cards.length ? `${plural(cards.length, 'Karte', 'Karten')} importieren` : 'Importieren'}
        </Button>
      </div>
    </div>
  );
}
