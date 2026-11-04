import { Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

interface CheckCircleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Optional eine Fachfarbe (CSS-Wert) für den gefüllten Zustand. */
  color?: string;
  className?: string;
}

/** Runde Abhak-Schaltfläche mit 44px Tippfläche. */
export function CheckCircle({ checked, onChange, label, color, className }: CheckCircleProps) {
  const style = color ? ({ '--check': color } as CSSProperties) : undefined;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={style}
      className={cn('-m-2.5 grid size-11 shrink-0 place-items-center rounded-full', className)}
    >
      <span
        className={cn(
          'grid size-[22px] place-items-center rounded-full border-2 transition-[background-color,border-color] duration-150',
          checked
            ? 'border-[color:var(--check,var(--accent))] bg-[var(--check,var(--accent))] text-white'
            : 'border-line-strong hover:border-ink-3',
        )}
      >
        {checked && <Check size={14} strokeWidth={3} aria-hidden className="animate-check-in" />}
      </span>
    </button>
  );
}
