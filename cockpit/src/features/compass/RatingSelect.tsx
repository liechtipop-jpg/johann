import { cn } from '@/lib/cn';
import { setRating } from './actions';

/** Bewertung 1–10 (oder offen) als native Auswahl – kompakt in Tabelle und Karte. */
export function RatingSelect({
  optionId,
  criterionId,
  value,
  label,
  className,
}: {
  optionId: string;
  criterionId: string;
  value: number | undefined;
  label: string;
  className?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value ?? ''}
      onChange={(e) => void setRating(optionId, criterionId, e.target.value ? Number(e.target.value) : null)}
      className={cn(
        'h-11 w-[4.5rem] rounded-[10px] border border-line bg-surface px-2 text-center text-[15px] font-semibold tabular-nums outline-none focus:border-accent focus:ring-3 focus:ring-accent/20 lg:h-9 dark:bg-surface-2',
        value === undefined && 'font-normal text-ink-3',
        className,
      )}
    >
      <option value="">–</option>
      {Array.from({ length: 10 }, (_, i) => (
        <option key={i + 1} value={i + 1}>
          {i + 1}
        </option>
      ))}
    </select>
  );
}
