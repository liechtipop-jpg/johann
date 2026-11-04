import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconButton } from './Button';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** wide: breiter Dialog · top: oben ausgerichtet (Befehlspalette) */
  variant?: 'default' | 'wide' | 'top';
  hideHeader?: boolean;
  bodyClassName?: string;
}

/**
 * Natives <dialog>: auf dem Handy als Bottom-Sheet, auf dem Desktop als Dialog.
 * Esc und Tippen neben das Fenster schliessen. Ein Element mit data-autofocus bekommt den Fokus.
 */
export function Sheet({ open, onClose, title, description, children, footer, variant = 'default', hideHeader, bodyClassName }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => onCloseRef.current();
    const handleClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
      if (!inside) dialog.close();
    };
    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('click', handleClick);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cn('sheet', variant === 'wide' && 'sheet-wide', variant === 'top' && 'sheet-top')}
    >
      {open && (
        <div className="sheet-panel">
          <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong lg:hidden" />
          <header className={cn('flex shrink-0 items-start gap-3 px-5 pt-3 pb-2 lg:px-6 lg:pt-5', hideHeader && 'sr-only')}>
            <div className="min-w-0 flex-1 pt-2">
              <h2 id={titleId} className="text-[17px] leading-tight font-semibold">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
            </div>
            <IconButton label="Schliessen" onClick={() => ref.current?.close()} className="-mr-2">
              <X size={20} aria-hidden />
            </IconButton>
          </header>
          <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 lg:px-6 lg:pb-6', bodyClassName)}>{children}</div>
          {footer && <footer className="flex shrink-0 justify-end gap-2 border-t border-line px-5 py-3 lg:px-6">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
