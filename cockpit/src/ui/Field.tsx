import { ChevronDown } from 'lucide-react';
import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const inputClass =
  'block h-11 w-full rounded-[10px] border border-line bg-surface px-3 text-base text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-ink-3 focus:border-accent focus:ring-3 focus:ring-accent/20 disabled:opacity-50 aria-[invalid=true]:border-danger lg:text-[15px] dark:bg-surface-2';

export interface ControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  className?: string;
  children: (control: ControlProps) => ReactNode;
}

/** Beschriftung, Hinweis und Fehlermeldung – korrekt mit dem Eingabefeld verknüpft. */
export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error || hint;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-ink-3"> · optional</span>}
      </label>
      {children({ id, 'aria-describedby': message ? messageId : undefined, 'aria-invalid': error ? true : undefined })}
      {message && (
        <p id={messageId} className={cn('text-[13px]', error ? 'font-medium text-danger' : 'text-ink-2')}>
          {message}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ref, ...rest }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cn(inputClass, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, 'h-auto min-h-24 py-2.5 leading-normal', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(inputClass, 'appearance-none pr-10', className)} {...rest}>
        {children}
      </select>
      <ChevronDown size={18} aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-3" />
    </div>
  );
}
