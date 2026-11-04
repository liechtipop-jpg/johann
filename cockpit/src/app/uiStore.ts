import { useSyncExternalStore } from 'react';

export type QuickAddType = 'grade' | 'exam' | 'task';

interface UIState {
  quickAdd: { open: boolean; type: QuickAddType | null };
  palette: boolean;
  shortcuts: boolean;
}

let state: UIState = { quickAdd: { open: false, type: null }, palette: false, shortcuts: false };
const listeners = new Set<() => void>();

function set(patch: Partial<UIState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

/** Globaler Zustand für Schnellerfassung, Befehlspalette und Tastenkürzel-Hilfe. */
export const ui = {
  openQuickAdd: (type: QuickAddType | null = null) => set({ quickAdd: { open: true, type }, palette: false }),
  setQuickAddType: (type: QuickAddType | null) => set({ quickAdd: { open: true, type } }),
  closeQuickAdd: () => set({ quickAdd: { open: false, type: null } }),
  openPalette: () => set({ palette: true }),
  closePalette: () => set({ palette: false }),
  togglePalette: () => set({ palette: !state.palette }),
  openShortcuts: () => set({ shortcuts: true, palette: false }),
  closeShortcuts: () => set({ shortcuts: false }),
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUI(): UIState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}
