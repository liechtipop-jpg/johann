import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, label, description, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <div className={cn('flex min-h-11 items-center gap-4', className)}>
      <div className="min-w-0 flex-1">
        <span id={`${id}-label`} className="block text-[15px] text-ink">
          {label}
        </span>
        {description && (
          <span id={`${id}-desc`} className="block text-[13px] text-ink-2">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="group grid h-11 w-14 shrink-0 place-items-center rounded-full disabled:opacity-45"
      >
        <span className={cn('relative h-7 w-12 rounded-full transition-colors duration-200', checked ? 'bg-accent' : 'bg-line-strong')}>
          <span
            className={cn(
              'absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-200 ease-soft',
              checked && 'translate-x-5',
            )}
          />
        </span>
      </button>
    </div>
  );
}

/** Nur der Schalter (z. B. in Listenzeilen) – label ist für Screenreader. */
export function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
      className="grid h-11 w-12 shrink-0 place-items-center rounded-full"
    >
      <span className={cn('relative h-6 w-10 rounded-full transition-colors duration-200', checked ? 'bg-accent' : 'bg-line-strong')}>
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-200 ease-soft',
            checked && 'translate-x-4',
          )}
        />
      </span>
    </button>
  );
}
