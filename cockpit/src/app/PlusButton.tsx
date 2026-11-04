import { Plus } from 'lucide-react';
import { ui } from './uiStore';

/** Runder Plus-Knopf auf dem Handy (rechts unten über der Tab-Leiste). */
export function PlusButton() {
  return (
    <button
      type="button"
      onClick={() => ui.openQuickAdd()}
      aria-label="Schnell erfassen"
      aria-haspopup="dialog"
      className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+80px)] z-40 grid size-14 place-items-center rounded-full bg-accent text-on-accent shadow-[0_6px_20px_rgb(51_85_255/0.32)] transition-transform duration-150 ease-soft active:scale-95 lg:hidden"
    >
      <Plus size={26} aria-hidden />
    </button>
  );
}
