import { Minus, Plus } from 'lucide-react';
import { IconButton } from './Button';

interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
}

/** Zahl mit − und + (gut bedienbar mit dem Daumen). */
export function Stepper({ label, value, onChange, min, max, step = 1, format }: StepperProps) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center rounded-[10px] border border-line bg-surface dark:bg-surface-2"
    >
      <IconButton label={`${label}: weniger`} onClick={() => set(value - step)} disabled={value <= min}>
        <Minus size={16} aria-hidden />
      </IconButton>
      <output aria-live="polite" className="min-w-10 text-center font-semibold tabular-nums">
        {format ? format(value) : value}
      </output>
      <IconButton label={`${label}: mehr`} onClick={() => set(value + step)} disabled={value >= max}>
        <Plus size={16} aria-hidden />
      </IconButton>
    </div>
  );
}
