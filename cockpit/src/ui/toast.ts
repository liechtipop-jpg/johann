import { useSyncExternalStore } from 'react';

export type ToastTone = 'neutral' | 'success' | 'danger';

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; run: () => unknown };
  duration: number;
}

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function dismissToast(id: number): void {
  clearTimeout(timers.get(id));
  timers.delete(id);
  items = items.filter((t) => t.id !== id);
  emit();
}

export function toast(message: string, options: { tone?: ToastTone; action?: ToastItem['action']; duration?: number } = {}): number {
  const item: ToastItem = {
    id: nextId++,
    message,
    tone: options.tone ?? 'neutral',
    action: options.action,
    duration: options.duration ?? (options.action ? 6000 : 3500),
  };
  // Immer nur die neueste Meldung – so ist klar, worauf sich «Rückgängig» bezieht.
  for (const old of items) clearTimeout(timers.get(old.id));
  timers.clear();
  items = [item];
  timers.set(
    item.id,
    setTimeout(() => dismissToast(item.id), item.duration),
  );
  emit();
  return item.id;
}

/** Meldung mit «Rückgängig» – statt Bestätigungsdialog. */
export function toastUndo(message: string, undo: () => unknown): number {
  return toast(message, {
    action: {
      label: 'Rückgängig',
      run: async () => {
        await undo();
        toast('Rückgängig gemacht');
      },
    },
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => items;

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
