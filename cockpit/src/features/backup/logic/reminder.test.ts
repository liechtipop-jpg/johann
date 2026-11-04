import { describe, expect, it } from 'vitest';
import { daysSince, isBackupDue, snoozeUntil } from './reminder';

const DAY = 86_400_000;
const now = 100 * DAY;

describe('Backup-Erinnerung', () => {
  it('erinnert 14 Tage nach der letzten Sicherung', () => {
    expect(isBackupDue({ lastExportAt: now - 13 * DAY, firstUseAt: null, snoozedUntil: null, now })).toBe(false);
    expect(isBackupDue({ lastExportAt: now - 14 * DAY, firstUseAt: null, snoozedUntil: null, now })).toBe(true);
  });

  it('erinnert ohne Sicherung 14 Tage nach dem Start', () => {
    expect(isBackupDue({ lastExportAt: null, firstUseAt: now - 3 * DAY, snoozedUntil: null, now })).toBe(false);
    expect(isBackupDue({ lastExportAt: null, firstUseAt: now - 20 * DAY, snoozedUntil: null, now })).toBe(true);
    expect(isBackupDue({ lastExportAt: null, firstUseAt: null, snoozedUntil: null, now })).toBe(false);
  });

  it('schweigt, solange die Erinnerung verschoben ist', () => {
    const snoozed = snoozeUntil(now);
    expect(isBackupDue({ lastExportAt: now - 30 * DAY, firstUseAt: null, snoozedUntil: snoozed, now })).toBe(false);
    expect(isBackupDue({ lastExportAt: now - 30 * DAY, firstUseAt: null, snoozedUntil: snoozed, now: snoozed + 1 })).toBe(true);
  });

  it('zählt vergangene Tage', () => {
    expect(daysSince(now - 2.5 * DAY, now)).toBe(2);
  });
});
