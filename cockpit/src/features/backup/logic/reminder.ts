export const BACKUP_INTERVAL_DAYS = 14;
export const SNOOZE_DAYS = 3;
const DAY_MS = 86_400_000;

interface ReminderInput {
  lastExportAt: number | null;
  firstUseAt: number | null;
  snoozedUntil: number | null;
  now: number;
}

/** Erinnerung fällig, wenn die letzte Sicherung (oder der Start) 14 Tage her ist und nicht verschoben wurde. */
export function isBackupDue({ lastExportAt, firstUseAt, snoozedUntil, now }: ReminderInput): boolean {
  if (snoozedUntil !== null && now < snoozedUntil) return false;
  const reference = lastExportAt ?? firstUseAt;
  if (reference === null) return false;
  return now - reference >= BACKUP_INTERVAL_DAYS * DAY_MS;
}

export function daysSince(timestamp: number, now: number): number {
  return Math.floor((now - timestamp) / DAY_MS);
}

export function snoozeUntil(now: number): number {
  return now + SNOOZE_DAYS * DAY_MS;
}
