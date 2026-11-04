import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useRovingRadio } from './useRovingRadio';

export interface SegmentOption<T> {
  value: T;
  label: ReactNode;
}

interface SegmentedControlProps<T extends string | number> {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string | number>({ label, options, value, onChange, className }: SegmentedControlProps<T>) {
  const item = useRovingRadio(
    options.map((o) => o.value),
    value,
    onChange,
  );
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex w-full gap-1 rounded-[10px] bg-surface-2 p-1', className)}>
      {options.map((option, index) => (
        <button
          key={String(option.value)}
          {...item(index)}
          className={cn(
            'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] px-3 text-sm font-medium transition-colors duration-150 pointer-coarse:h-11',
            option.value === value
              ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)] dark:bg-surface-3'
              : 'text-ink-2 hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
