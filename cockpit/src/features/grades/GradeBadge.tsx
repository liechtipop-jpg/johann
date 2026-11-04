import { TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatGrade } from '@/lib/format';

/** Gerundete Zeugnisnote – ungenügend immer mit Symbol, nie nur mit Farbe. */
export function GradeBadge({ grade, passMark, size = 'md' }: { grade: number | null; passMark: number; size?: 'md' | 'lg' }) {
  if (grade === null) {
    return <span className={cn('font-semibold text-ink-3 tabular-nums', size === 'lg' ? 'text-[40px]' : 'text-[20px]')}>–</span>;
  }
  const insufficient = grade < passMark;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 leading-none font-semibold tabular-nums',
        size === 'lg' ? 'text-[44px] tracking-tight' : 'text-[20px]',
        insufficient && 'text-danger',
      )}
    >
      {insufficient && <TriangleAlert size={size === 'lg' ? 26 : 16} aria-label="ungenügend" className="shrink-0" />}
      {formatGrade(grade)}
    </span>
  );
}
