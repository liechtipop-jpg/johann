import { createContext, useContext } from 'react';
import type { Settings } from './settings';

export const SettingsContext = createContext<Settings | null>(null);

/** Aktuelle Einstellungen (live aus der Datenbank). */
export function useSettings(): Settings {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error('useSettings muss innerhalb von <SettingsProvider> verwendet werden.');
  return settings;
}
