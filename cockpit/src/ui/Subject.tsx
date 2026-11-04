import { Check } from 'lucide-react';
import { SUBJECT_COLORS, type Subject, type SubjectColor } from '@/db/schemas';
import { cn } from '@/lib/cn';
import { SUBJECT_COLOR_LABELS, subjectStyle } from './subject';
import { useRovingRadio } from './useRovingRadio';

export function SubjectDot({ color, size = 10, className }: { color: SubjectColor; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('subject inline-block shrink-0 rounded-full bg-(--sc)', className)}
      style={{ ...subjectStyle(color), width: size, height: size }}
    />
  );
}

export function SubjectChip({ name, color, className }: { name: string; color: SubjectColor; className?: string }) {
  return (
    <span
      className={cn(
        'subject inline-flex max-w-full items-center gap-1.5 rounded-full bg-(--sc-soft) px-2 py-0.5 text-[13px] font-medium text-(--sc-text)',
        className,
      )}
      style={subjectStyle(color)}
    >
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-(--sc)" />
      <span className="truncate">{name}</span>
    </span>
  );
}

interface SubjectPickerProps {
  label: string;
  subjects: Subject[];
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  allowNone?: boolean;
  noneLabel?: string;
}

/** Fach auswählen: Chips in Fachfarbe, per Pfeiltasten bedienbar. */
export function SubjectPicker({ label, subjects, value, onChange, allowNone, noneLabel = 'Kein Fach' }: SubjectPickerProps) {
  const values: Array<string | undefined> = [...(allowNone ? [undefined] : []), ...subjects.map((s) => s.id)];
  const item = useRovingRadio(values, value, onChange);
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {values.map((id, index) => {
        const subject = subjects.find((s) => s.id === id);
        const selected = id === value;
        return (
          <button
            key={id ?? 'none'}
            {...item(index)}
            style={subject ? subjectStyle(subject.color) : undefined}
            className={cn(
              'subject inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors duration-150 pointer-coarse:h-11',
              selected
                ? subject
                  ? 'border-(--sc) bg-(--sc-soft) text-(--sc-text)'
                  : 'border-ink bg-surface-2 text-ink'
                : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
            )}
          >
            {subject && <span aria-hidden className="size-2.5 rounded-full bg-(--sc)" />}
            {subject ? subject.name : noneLabel}
          </button>
        );
      })}
    </div>
  );
}

/** Auswahl der zwölf Fächerfarben. */
export function ColorSwatchPicker({ value, onChange, label }: { value: SubjectColor; onChange: (c: SubjectColor) => void; label: string }) {
  const item = useRovingRadio(SUBJECT_COLORS, value, onChange);
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-6 gap-1 sm:grid-cols-12">
      {SUBJECT_COLORS.map((color, index) => (
        <button
          key={color}
          {...item(index)}
          aria-label={SUBJECT_COLOR_LABELS[color]}
          title={SUBJECT_COLOR_LABELS[color]}
          className="subject grid size-11 place-items-center rounded-full"
          style={subjectStyle(color)}
        >
          <span
            className={cn(
              'grid size-8 place-items-center rounded-full bg-(--sc) text-white transition-transform duration-150',
              color === value ? 'ring-2 ring-(--sc) ring-offset-2 ring-offset-surface' : 'hover:scale-110',
            )}
          >
            {color === value && <Check size={16} strokeWidth={3} aria-hidden />}
          </span>
        </button>
      ))}
    </div>
  );
}
