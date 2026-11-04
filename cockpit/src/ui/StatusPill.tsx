import { CircleCheck, CircleX, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

const TONES: Record<StatusTone, { icon: LucideIcon; className: string }> = {
  success: { icon: CircleCheck, className: 'bg-success-soft text-success' },
  warning: { icon: TriangleAlert, className: 'bg-warning-soft text-warning' },
  danger: { icon: CircleX, className: 'bg-danger-soft text-danger' },
  neutral: { icon: Info, className: 'bg-surface-2 text-ink-2' },
};

/** Status/Ampel – nie nur Farbe: immer Symbol und Text. */
export function StatusPill({ tone, children, className }: { tone: StatusTone; children: ReactNode; className?: string }) {
  const { icon: Icon, className: toneClass } = TONES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] leading-tight font-medium',
        toneClass,
        className,
      )}
    >
      <Icon size={15} aria-hidden className="shrink-0" />
      <span>{children}</span>
    </span>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-2', className)}>
      {children}
    </span>
  );
}
