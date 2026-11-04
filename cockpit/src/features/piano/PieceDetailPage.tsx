import { useLiveQuery } from 'dexie-react-hooks';
import { Gauge, ListPlus, Music, NotebookPen, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { db } from '@/db/db';
import type { Piece } from '@/db/schemas';
import { diffDays, formatDate, relativeDays, startOfWeek } from '@/lib/dates';
import { formatMinutes } from '@/lib/format';
import { newId } from '@/lib/ids';
import { useToday } from '@/lib/useNow';
import { BackLink } from '@/ui/BackLink';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Field, Input, Textarea } from '@/ui/Field';
import { FormActions } from '@/ui/FormActions';
import { PageHeader } from '@/ui/PageHeader';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Sheet } from '@/ui/Sheet';
import { toastUndo } from '@/ui/toast';
import { deletePiece, savePiece, startPractice } from './actions';
import { PieceForm } from './PieceForm';
import { STATUS_OPTIONS, type PieceStatus } from './pieceStatus';
import { PieceStatusBadge } from './PieceStatusBadge';

type Section = Piece['sections'][number];

/** Ein Stück im Detail: Status, Abschnitte mit Tempi, Lektionsnotizen und Übungszeit. */
export default function PieceDetailPage() {
  const { pieceId = '' } = useParams();
  const navigate = useNavigate();
  const today = useToday();
  const piece = useLiveQuery(() => db.pieces.get(pieceId).then((p) => p ?? null), [pieceId]);
  const logs = useLiveQuery(() => db.practiceLogs.where('pieceId').equals(pieceId).toArray(), [pieceId]);
  const [editing, setEditing] = useState(false);
  const [section, setSection] = useState<Section | 'new' | null>(null);

  if (piece === undefined || logs === undefined) return null;
  if (piece === null) {
    return (
      <>
        <BackLink to="/klavier?tab=repertoire" label="Repertoire" />
        <EmptyState icon={Music} title="Stück nicht gefunden">
          Vielleicht wurde es gelöscht.
        </EmptyState>
      </>
    );
  }

  const total = logs.reduce((n, l) => n + l.seconds / 60, 0);
  const monday = startOfWeek(today);
  const week = logs.filter((l) => l.date >= monday).reduce((n, l) => n + l.seconds / 60, 0);
  const last = logs.reduce<string | null>((max, l) => (max === null || l.date > max ? l.date : max), null);
  const notes = [...piece.lessonNotes].sort((a, b) => b.date.localeCompare(a.date));

  const save = (next: Piece, message?: string) => savePiece(next, piece, message);

  return (
    <>
      <BackLink to="/klavier?tab=repertoire" label="Repertoire" />
      <PageHeader
        title={piece.title}
        subtitle={piece.composer}
        actions={
          <>
            <Button
              variant="primary"
              icon={<Play size={18} aria-hidden />}
              onClick={async () => {
                await startPractice(piece.id);
                navigate('/klavier');
              }}
            >
              Üben
            </Button>
            <IconButton label="Stück bearbeiten" onClick={() => setEditing(true)}>
              <Pencil size={18} aria-hidden />
            </IconButton>
            <IconButton
              label="Stück löschen"
              onClick={async () => {
                await deletePiece(piece);
                navigate('/klavier?tab=repertoire');
              }}
            >
              <Trash2 size={18} aria-hidden />
            </IconButton>
          </>
        }
      />
      <div className="space-y-4">
        <SegmentedControl<PieceStatus>
          label="Status des Stücks"
          options={STATUS_OPTIONS}
          value={piece.status}
          onChange={(status) => void save({ ...piece, status })}
          className="max-w-md"
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
          <div className="min-w-0 space-y-4">
            <Card
              title="Abschnitte"
              description="Teile das Stück in Takte auf und halte das Tempo fest."
              action={
                <Button size="sm" icon={<ListPlus size={16} aria-hidden />} onClick={() => setSection('new')}>
                  Abschnitt
                </Button>
              }
              bodyClassName="px-2 pt-2 pb-2 lg:px-3"
            >
              {piece.sections.length === 0 ? (
                <p className="px-2 py-2 text-[15px] text-ink-2">Noch keine Abschnitte – z. B. «Intro, Takte 1–8».</p>
              ) : (
                <ul className="divide-y divide-line">
                  {piece.sections.map((s) => (
                    <SectionRow key={s.id} section={s} onEdit={() => setSection(s)} />
                  ))}
                </ul>
              )}
            </Card>
            <LessonNotes piece={piece} notes={notes} today={today} onSave={save} />
          </div>
          <Card title="Übungszeit">
            <dl className="grid grid-cols-2 gap-3">
              {[
                ['Insgesamt', total],
                ['Diese Woche', week],
              ].map(([label, minutes]) => (
                <div key={label} className="rounded-[12px] bg-surface-2 px-3 py-2.5">
                  <dt className="text-[13px] text-ink-2">{label}</dt>
                  <dd className="text-[20px] leading-tight font-semibold tabular-nums">{formatMinutes(Number(minutes))}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[13px] text-ink-2">
              {last ? `Zuletzt geübt: ${relativeDays(diffDays(today, last))}, ${formatDate(last, 'medium')}` : 'Noch nicht geübt.'}
            </p>
          </Card>
        </div>
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Stück bearbeiten">
        <PieceForm initial={piece} onDone={() => setEditing(false)} />
      </Sheet>
      <Sheet
        open={section !== null}
        onClose={() => setSection(null)}
        title={section === 'new' ? 'Abschnitt hinzufügen' : 'Abschnitt bearbeiten'}
      >
        {section !== null && (
          <SectionForm
            key={section === 'new' ? 'new' : section.id}
            initial={section === 'new' ? undefined : section}
            index={piece.sections.length + 1}
            onSubmit={async (next) => {
              const exists = piece.sections.some((s) => s.id === next.id);
              await save({
                ...piece,
                sections: exists ? piece.sections.map((s) => (s.id === next.id ? next : s)) : [...piece.sections, next],
              });
              setSection(null);
            }}
            onDelete={async (id) => {
              await save({ ...piece, sections: piece.sections.filter((s) => s.id !== id) }, 'Abschnitt gelöscht');
              setSection(null);
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function SectionRow({ section: s, onEdit }: { section: Section; onEdit: () => void }) {
  const ratio = s.bpm && s.targetBpm ? Math.min(1, s.bpm / s.targetBpm) : null;
  const metronomeBpm = s.bpm ?? s.targetBpm;
  return (
    <li className="flex items-center gap-2 py-1">
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-[10px] px-2 py-2 text-left hover:bg-surface-2"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {s.name}
            {s.bars && <span className="font-normal text-ink-2"> · Takte {s.bars}</span>}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <PieceStatusBadge status={s.status} className="py-0.5 text-[12px]" />
            {(s.bpm || s.targetBpm) && (
              <span className="text-[13px] text-ink-2 tabular-nums">
                {s.bpm ?? '–'} → {s.targetBpm ?? '–'} BPM
              </span>
            )}
          </div>
          {ratio !== null && (
            <div
              className="mt-2 h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-surface-3"
              role="img"
              aria-label={`${Math.round(ratio * 100)} Prozent des Ziel-Tempos`}
            >
              <div className="h-full rounded-full bg-accent" style={{ width: `${ratio * 100}%` }} />
            </div>
          )}
        </div>
        <Pencil size={16} aria-hidden className="shrink-0 text-ink-3" />
      </button>
      {metronomeBpm && (
        <Link
          to={`/klavier?tab=metronom&bpm=${metronomeBpm}`}
          aria-label={`Metronom mit ${metronomeBpm} BPM öffnen`}
          className="grid size-11 shrink-0 place-items-center rounded-[10px] text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <Gauge size={18} aria-hidden />
        </Link>
      )}
    </li>
  );
}

function parseBpm(value: string): number | undefined | null {
  if (!value.trim()) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 20 && n <= 300 ? n : null;
}

function SectionForm({
  initial,
  index,
  onSubmit,
  onDelete,
}: {
  initial?: Section;
  index: number;
  onSubmit: (section: Section) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? `Abschnitt ${index}`);
  const [bars, setBars] = useState(initial?.bars ?? '');
  const [status, setStatus] = useState<PieceStatus>(initial?.status ?? 'learning');
  const [bpm, setBpm] = useState(initial?.bpm ? String(initial.bpm) : '');
  const [target, setTarget] = useState(initial?.targetBpm ? String(initial.targetBpm) : '');
  const [error, setError] = useState<{ field: string; message: string }>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError({ field: 'name', message: 'Bitte gib dem Abschnitt einen Namen.' });
    const current = parseBpm(bpm);
    const goal = parseBpm(target);
    if (current === null) return setError({ field: 'bpm', message: 'Tempo zwischen 20 und 300 BPM.' });
    if (goal === null) return setError({ field: 'target', message: 'Tempo zwischen 20 und 300 BPM.' });
    await onSubmit({
      id: initial?.id ?? newId(),
      name: name.trim(),
      bars: bars.trim() || undefined,
      status,
      bpm: current,
      targetBpm: goal,
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <Field label="Name" error={error?.field === 'name' ? error.message : undefined}>
          {(p) => <Input {...p} data-autofocus maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label="Takte" optional>
          {(p) => <Input {...p} maxLength={30} placeholder="z. B. 1–16" value={bars} onChange={(e) => setBars(e.target.value)} />}
        </Field>
      </div>
      <div className="space-y-2">
        <span className="block text-sm font-medium">Status</span>
        <SegmentedControl<PieceStatus> label="Status des Abschnitts" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Tempo jetzt" optional error={error?.field === 'bpm' ? error.message : undefined}>
          {(p) => <Input {...p} inputMode="numeric" placeholder="BPM" value={bpm} onChange={(e) => setBpm(e.target.value)} />}
        </Field>
        <Field label="Ziel-Tempo" optional error={error?.field === 'target' ? error.message : undefined}>
          {(p) => <Input {...p} inputMode="numeric" placeholder="BPM" value={target} onChange={(e) => setTarget(e.target.value)} />}
        </Field>
      </div>
      <div className="flex items-center gap-2">
        {initial && (
          <Button variant="danger" icon={<Trash2 size={16} aria-hidden />} onClick={() => void onDelete(initial.id)}>
            Löschen
          </Button>
        )}
        <div className="flex-1">
          <FormActions submitLabel={initial ? 'Speichern' : 'Hinzufügen'} />
        </div>
      </div>
    </form>
  );
}

function LessonNotes({
  piece,
  notes,
  today,
  onSave,
}: {
  piece: Piece;
  notes: Piece['lessonNotes'];
  today: string;
  onSave: (next: Piece, message?: string) => Promise<void>;
}) {
  const [date, setDate] = useState(today);
  const [text, setText] = useState('');

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    await onSave({ ...piece, lessonNotes: [...piece.lessonNotes, { id: newId(), date: date || today, text: text.trim() }] });
    setText('');
  }

  return (
    <Card title="Lektionsnotizen" description="Was die Lehrperson gesagt hat – mit Datum.">
      <form onSubmit={add} className="space-y-3">
        <Textarea
          aria-label="Neue Lektionsnotiz"
          rows={3}
          maxLength={4000}
          placeholder="z. B. Takt 9–12 linke Hand legato, langsam mit 60 BPM üben"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            aria-label="Datum der Lektion"
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
          <Button type="submit" icon={<Plus size={16} aria-hidden />} disabled={!text.trim()} className="ml-auto">
            Notiz speichern
          </Button>
        </div>
      </form>
      {notes.length > 0 ? (
        <ul className="mt-4 space-y-3 border-t border-line pt-4">
          {notes.map((note) => (
            <li key={note.id} className="flex gap-3">
              <NotebookPen size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink-2">{formatDate(note.date, 'medium')}</p>
                <p className="text-[15px] break-words whitespace-pre-wrap">{note.text}</p>
              </div>
              <IconButton
                label="Notiz löschen"
                className="-mr-2"
                onClick={async () => {
                  await db.pieces.put({ ...piece, lessonNotes: piece.lessonNotes.filter((n) => n.id !== note.id) });
                  toastUndo('Notiz gelöscht', () => db.pieces.put(piece));
                }}
              >
                <Trash2 size={16} aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
