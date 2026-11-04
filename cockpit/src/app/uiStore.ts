import { useSyncExternalStore } from 'react';

export type QuickAddType = 'grade' | 'exam' | 'task';

/** Vorbelegung, z. B. das Fach, wenn man auf einer Fachseite «Note» tippt. */
export interface QuickAddDefaults {
  subjectId?: string;
}

interface UIState {
  quickAdd: { open: boolean; type: QuickAddType | null; defaults: QuickAddDefaults };
  palette: boolean;
  shortcuts: boolean;
}

let state: UIState = { quickAdd: { open: false, type: null, defaults: {} }, palette: false, shortcuts: false };
const listeners = new Set<() => void>();

function set(patch: Partial<UIState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

/** Globaler Zustand für Schnellerfassung, Befehlspalette und Tastenkürzel-Hilfe. */
export const ui = {
  openQuickAdd: (type: QuickAddType | null = null, defaults: QuickAddDefaults = {}) =>
    set({ quickAdd: { open: true, type, defaults }, palette: false }),
  setQuickAddType: (type: QuickAddType | null) => set({ quickAdd: { ...state.quickAdd, open: true, type } }),
  closeQuickAdd: () => set({ quickAdd: { open: false, type: null, defaults: {} } }),
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
