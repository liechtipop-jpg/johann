import { CircleAlert, CircleCheck } from 'lucide-react';
import { dismissToast, useToasts } from './toast';

/** Meldungen unten am Bildschirm, auf dem Handy über der Tab-Leiste und links vom Plus-Knopf. */
export function Toaster() {
  const toasts = useToasts();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-[84px] bottom-[calc(env(safe-area-inset-bottom)+80px)] left-4 z-[60] flex flex-col items-start gap-2 lg:right-6 lg:bottom-6 lg:left-[calc(15rem+1.5rem)] lg:items-center"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex w-full max-w-md animate-toast-in items-center gap-3 rounded-[12px] bg-ink py-2.5 pr-2 pl-4 text-[15px] text-bg shadow-(--shadow-overlay)"
        >
          {t.tone === 'success' && <CircleCheck size={18} aria-hidden className="shrink-0" />}
          {t.tone === 'danger' && <CircleAlert size={18} aria-hidden className="shrink-0" />}
          <span className="min-w-0 flex-1 py-1">{t.message}</span>
          {t.action ? (
            <button
              type="button"
              className="h-9 shrink-0 rounded-[8px] px-3 font-semibold text-(--toast-action) hover:bg-white/10 dark:hover:bg-black/10"
              onClick={() => {
                dismissToast(t.id);
                void t.action?.run();
              }}
            >
              {t.action.label}
            </button>
          ) : (
            <span className="w-2" />
          )}
        </div>
      ))}
    </div>
  );
}
