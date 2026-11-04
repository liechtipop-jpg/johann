import { HardDriveDownload } from 'lucide-react';
import { patchSetting } from '@/db/settings';
import { useSettings } from '@/db/settingsContext';
import { cn } from '@/lib/cn';
import { useNow } from '@/lib/useNow';
import { Button } from '@/ui/Button';
import { daysSince, isBackupDue, snoozeUntil } from './logic/reminder';
import { exportBackup } from './useBackup';

/** Erinnerung alle 14 Tage – erscheint auf «Heute». */
export function BackupReminder({ className }: { className?: string }) {
  const { backup, onboarding } = useSettings();
  const now = useNow();
  const due = isBackupDue({
    lastExportAt: backup.lastExportAt,
    firstUseAt: backup.firstUseAt ?? onboarding.completedAt ?? null,
    snoozedUntil: backup.snoozedUntil,
    now,
  });
  if (!due) return null;
  const since =
    backup.lastExportAt !== null
      ? `Deine letzte Sicherung ist ${daysSince(backup.lastExportAt, now)} Tage her.`
      : 'Du hast noch keine Sicherung gemacht.';
  return (
    <section
      aria-label="Backup-Erinnerung"
      className={cn('flex flex-wrap items-center gap-3 rounded-[14px] border border-warning/25 bg-warning-soft p-4', className)}
    >
      <HardDriveDownload size={22} aria-hidden className="shrink-0 text-warning" />
      <div className="min-w-48 flex-1">
        <p className="font-semibold">Zeit für eine Sicherung</p>
        <p className="text-sm text-ink-2">{since} Deine Daten liegen nur auf diesem Gerät.</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => void patchSetting('backup', { snoozedUntil: snoozeUntil(Date.now()) })}>
          Später
        </Button>
        <Button size="sm" variant="primary" onClick={() => void exportBackup()}>
          Jetzt sichern
        </Button>
      </div>
    </section>
  );
}
