import type { ReactNode } from 'react';

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-[6px] border border-line bg-surface-2 px-1.5 font-sans text-xs font-medium text-ink-2">
      {children}
    </kbd>
  );
}
