import { db } from '@/db/db';
import { patchSetting } from '@/db/settings';
import { formatTimestamp } from '@/lib/dates';
import { canShareFiles, downloadFile, shareFile } from '@/lib/share';
import { toast, toastUndo } from '@/ui/toast';
import { backupFileName, createBackup, parseBackup, restoreBackup } from './logic/backup';

async function backupFile(): Promise<File> {
  const backup = await createBackup(db, __APP_VERSION__);
  return new File([JSON.stringify(backup)], backupFileName(), { type: 'application/json' });
}

async function markExported() {
  await patchSetting('backup', { lastExportAt: Date.now(), snoozedUntil: null });
}

/** Sicherung über das Teilen-Menü (Handy) – sonst als Download. */
export async function exportBackup(mode: 'share' | 'download' = canShareFiles() ? 'share' : 'download'): Promise<void> {
  const file = await backupFile();
  if (mode === 'share') {
    const result = await shareFile(file, 'Cockpit-Sicherung');
    if (result === 'cancelled') return;
    if (result === 'shared') {
      await markExported();
      toast('Sicherung geteilt', { tone: 'success' });
      return;
    }
  }
  downloadFile(file);
  await markExported();
  toast(`Sicherung gespeichert: ${file.name}`, { tone: 'success' });
}

/** Liest eine Sicherungsdatei ein. Vorher wird ein Schnappschuss für «Rückgängig» erstellt. */
export async function importBackupFile(file: File): Promise<boolean> {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    toast('Die Datei konnte nicht gelesen werden (kein gültiges JSON).', { tone: 'danger' });
    return false;
  }
  const parsed = parseBackup(json);
  if (!parsed.ok) {
    toast(parsed.error, { tone: 'danger', duration: 6000 });
    return false;
  }
  const before = await createBackup(db, __APP_VERSION__);
  await restoreBackup(db, parsed.backup);
  const exported = Date.parse(parsed.backup.exportedAt);
  toastUndo(Number.isNaN(exported) ? 'Sicherung importiert' : `Sicherung vom ${formatTimestamp(exported, 'medium')} importiert`, () =>
    restoreBackup(db, before),
  );
  return true;
}
