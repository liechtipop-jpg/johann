import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Archive, ArchiveRestore, ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { db } from '@/db/db';
import { useSubjects } from '@/db/hooks';
import type { Subject } from '@/db/schemas';
import { createSubject, deleteSubjectWithUndo, reorderSubjects } from '@/features/subjects/actions';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field, Input } from '@/ui/Field';
import { ColorSwatchPicker, SubjectDot } from '@/ui/Subject';
import { Switch } from '@/ui/Switch';
import { toastUndo } from '@/ui/toast';

export function SubjectsSettings() {
  const subjects = useSubjects(true);
  const [newName, setNewName] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  if (!subjects) return null;

  const active = subjects.filter((s) => !s.archived);
  const archived = subjects.filter((s) => s.archived);
  const nameOf = (id: UniqueIdentifier) => subjects.find((s) => s.id === id)?.name ?? 'Fach';

  const announcements: Announcements = {
    onDragStart: ({ active: a }) => `${nameOf(a.id)} aufgenommen.`,
    onDragOver: ({ active: a, over }) =>
      over ? `${nameOf(a.id)} ist jetzt bei ${nameOf(over.id)}.` : `${nameOf(a.id)} ist ausserhalb der Liste.`,
    onDragEnd: ({ active: a, over }) => (over ? `${nameOf(a.id)} bei ${nameOf(over.id)} abgelegt.` : `${nameOf(a.id)} abgelegt.`),
    onDragCancel: ({ active: a }) => `Verschieben von ${nameOf(a.id)} abgebrochen.`,
  };

  function onDragEnd({ active: a, over }: DragEndEvent) {
    if (!over || a.id === over.id) return;
    const ids = active.map((s) => s.id);
    const moved = arrayMove(ids, ids.indexOf(String(a.id)), ids.indexOf(String(over.id)));
    void reorderSubjects([...moved, ...archived.map((s) => s.id)]);
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    const subject = await createSubject(newName);
    setNewName('');
    toastUndo(`«${subject.name}» hinzugefügt`, () => db.subjects.delete(subject.id));
  }

  return (
    <Card id="faecher" title="Fächer" description="Ziehen zum Sortieren. Die Farbe erscheint überall: Noten, Prüfungen, Timer, Karten.">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              'Leertaste drücken, um das Fach anzuheben. Mit den Pfeiltasten verschieben, mit der Leertaste ablegen, mit Escape abbrechen.',
          },
        }}
      >
        <SortableContext items={active.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="-mx-2 divide-y divide-line">
            {active.map((subject) => (
              <SubjectRow key={subject.id} subject={subject} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <form onSubmit={add} className="mt-3 flex gap-2">
        <Input
          aria-label="Neues Fach"
          placeholder="Neues Fach"
          maxLength={40}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button type="submit" icon={<Plus size={18} aria-hidden />} disabled={!newName.trim()}>
          Hinzufügen
        </Button>
      </form>

      {archived.length > 0 && (
        <details className="mt-4 rounded-[10px] border border-line">
          <summary className="flex h-11 cursor-pointer items-center px-3 text-sm font-medium text-ink-2">
            Archiviert ({archived.length})
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {archived.map((subject) => (
              <li key={subject.id} className="flex items-center gap-3 py-1 pr-1 pl-3">
                <SubjectDot color={subject.color} />
                <span className="min-w-0 flex-1 truncate text-ink-2">{subject.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<ArchiveRestore size={16} aria-hidden />}
                  onClick={() => void db.subjects.update(subject.id, { archived: false })}
                >
                  Zurückholen
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 size={16} aria-hidden />}
                  onClick={() => void deleteSubjectWithUndo(subject)}
                >
                  Löschen
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

function SubjectRow({ subject }: { subject: Subject }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: subject.id });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(subject.name);
  const panelId = `fach-panel-${subject.id}`;

  function saveName() {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(subject.name);
      return;
    }
    if (trimmed !== subject.name) void db.subjects.update(subject.id, { name: trimmed });
  }

  function archive() {
    void db.subjects.update(subject.id, { archived: true });
    toastUndo(`«${subject.name}» archiviert`, () => db.subjects.update(subject.id, { archived: false }));
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('bg-surface', isDragging && 'relative z-10 rounded-[10px] shadow-(--shadow-overlay)')}
    >
      <div className="flex items-center">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`${subject.name} verschieben`}
          className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-[10px] text-ink-3 hover:text-ink active:cursor-grabbing"
        >
          <GripVertical size={18} aria-hidden />
        </button>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-[10px] px-2 text-left hover:bg-surface-2"
        >
          <SubjectDot color={subject.color} size={12} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium">{subject.name}</span>
            {!subject.isPromotion && <span className="block text-[13px] text-ink-2">zählt nicht für die Promotion</span>}
          </span>
          <ChevronDown
            size={18}
            aria-hidden
            className={cn('shrink-0 text-ink-3 transition-transform duration-200', open && 'rotate-180')}
          />
        </button>
      </div>
      {open && (
        <div id={panelId} className="space-y-4 px-2 pt-1 pb-4 sm:pl-12">
          <Field label="Name">
            {(p) => (
              <Input
                {...p}
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
              />
            )}
          </Field>
          <div>
            <p className="mb-1 text-sm font-medium">Farbe</p>
            <ColorSwatchPicker
              label={`Farbe für ${subject.name}`}
              value={subject.color}
              onChange={(color) => void db.subjects.update(subject.id, { color })}
            />
          </div>
          <Switch
            label="Promotionsfach"
            description="Zählt im Promotionsrechner"
            checked={subject.isPromotion}
            onChange={(isPromotion) => void db.subjects.update(subject.id, { isPromotion })}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={<Archive size={16} aria-hidden />} onClick={archive}>
              Archivieren
            </Button>
            <Button size="sm" variant="danger" icon={<Trash2 size={16} aria-hidden />} onClick={() => void deleteSubjectWithUndo(subject)}>
              Löschen
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
