import type { Semester } from '@/db/schemas';
import { Select } from '@/ui/Field';

/** Semesterwahl (nur sichtbar, wenn es mehr als ein Semester gibt). */
export function SemesterSelect({
  semesters,
  value,
  onChange,
}: {
  semesters: Semester[];
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  if (semesters.length < 2) return null;
  return (
    <div className="w-44">
      <Select aria-label="Semester" value={value} onChange={(e) => onChange(e.target.value)}>
        {[...semesters].reverse().map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
