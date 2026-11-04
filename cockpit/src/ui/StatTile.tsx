import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Kennzahl als Kachel (grosse Zahl, kurze Beschriftung). */
export function StatTile({ label, value, hint, className }: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[14px] border border-line bg-surface p-4', className)}>
      <p className="text-[13px] text-ink-2">{label}</p>
      <p className="mt-1 text-[28px] leading-tight font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[13px] text-ink-2">{hint}</p>}
    </div>
  );
}
