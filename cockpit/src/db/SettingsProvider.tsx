import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, type ReactNode } from 'react';
import { db } from './db';
import { buildSettings } from './settings';
import { SettingsContext } from './settingsContext';

export function SettingsProvider({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const rows = useLiveQuery(() => db.kv.toArray(), []);
  const settings = useMemo(() => (rows ? buildSettings(rows) : null), [rows]);
  if (!settings) return fallback;
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}
