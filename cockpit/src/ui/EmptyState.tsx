import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Leerzustand – immer mit einer klaren nächsten Aktion. */
export function EmptyState({ icon: Icon, title, children, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-surface-2 text-ink-2">
        <Icon size={22} aria-hidden />
      </div>
      <h3 className="text-[17px] font-semibold">{title}</h3>
      {children && <div className="mt-1 max-w-sm text-ink-2">{children}</div>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
