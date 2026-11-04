import { Download, Share2, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { InstallHint } from '@/app/InstallHint';
import { db } from '@/db/db';
import { useSettings } from '@/db/settingsContext';
import { clearAllData, createBackup, restoreBackup } from '@/features/backup/logic/backup';
import { BACKUP_INTERVAL_DAYS, daysSince } from '@/features/backup/logic/reminder';
import { exportBackup, importBackupFile } from '@/features/backup/useBackup';
import { formatTimestamp } from '@/lib/dates';
import { isStoragePersisted, requestPersistentStorage } from '@/lib/platform';
import { canShareFiles } from '@/lib/share';
import { useNow } from '@/lib/useNow';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { StatusPill } from '@/ui/StatusPill';
import { toast, toastUndo } from '@/ui/toast';

export function DataSettings() {
  const { backup } = useSettings();
  const now = useNow();
  const fileRef = useRef<HTMLInputElement>(null);
  const [shareable] = useState(canShareFiles);
  const [persisted, setPersisted] = useState<boolean | null | undefined>(undefined);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    let alive = true;
    void isStoragePersisted().then((value) => {
      if (alive) setPersisted(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function askPersist() {
    const granted = await requestPersistentStorage();
    setPersisted(granted);
    toast(granted ? 'Speicher ist jetzt dauerhaft.' : 'Der Browser hat abgelehnt. Installiere Cockpit als App, dann klappt es meist.', {
      tone: granted ? 'success' : 'neutral',
    });
  }

  async function resetAll() {
    const before = await createBackup(db, __APP_VERSION__);
    await clearAllData(db);
    toastUndo('Alle Daten gelöscht', () => restoreBackup(db, before));
  }

  return (
    <Card
      id="daten"
      title="Daten & Backup"
      description="Alles bleibt auf diesem Gerät. Mit einer Sicherung überträgst du deine Daten auf ein anderes Gerät."
    >
      <div className="space-y-6">
        <section className="space-y-3">
          <p className="text-[15px]">
            {backup.lastExportAt !== null ? (
              <>
                Letzte Sicherung: <strong className="font-semibold">{formatTimestamp(backup.lastExportAt, 'long')}</strong>
                <span className="text-ink-2">
                  {' '}
                  ({daysSince(backup.lastExportAt, now) === 0 ? 'heute' : `vor ${daysSince(backup.lastExportAt, now)} Tagen`})
                </span>
              </>
            ) : (
              'Noch keine Sicherung.'
            )}
            <span className="block text-[13px] text-ink-2">Cockpit erinnert dich alle {BACKUP_INTERVAL_DAYS} Tage.</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {shareable && (
              <Button variant="primary" icon={<Share2 size={18} aria-hidden />} onClick={() => void exportBackup('share')}>
                Sicherung teilen
              </Button>
            )}
            <Button
              variant={shareable ? 'secondary' : 'primary'}
              icon={<Download size={18} aria-hidden />}
              onClick={() => void exportBackup('download')}
            >
              Herunterladen
            </Button>
            <Button icon={<Upload size={18} aria-hidden />} onClick={() => fileRef.current?.click()}>
              Sicherung importieren
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-hidden
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void importBackupFile(file);
              }}
            />
          </div>
          <p className="text-[13px] text-ink-2">
            Handy → Laptop: Auf dem Handy «Sicherung teilen» (z. B. per AirDrop, Mail oder in einen Cloud-Ordner), auf dem Laptop «Sicherung
            importieren». Der Import ersetzt die Daten auf dem Zielgerät.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-ink-2">Speicher</h3>
          {persisted === true && <StatusPill tone="success">Dauerhaft gespeichert – der Browser löscht nichts von selbst</StatusPill>}
          {persisted === false && (
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill tone="warning">Der Browser darf Daten bei Platzmangel löschen</StatusPill>
              <Button size="sm" onClick={() => void askPersist()}>
                Dauerhaft speichern
              </Button>
            </div>
          )}
          {persisted === null && <StatusPill tone="neutral">Dieser Browser meldet keinen Speicherstatus</StatusPill>}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-ink-2">App</h3>
          <InstallHint />
        </section>

        <section className="space-y-2 border-t border-line pt-5">
          <h3 className="text-sm font-semibold text-ink-2">Zurücksetzen</h3>
          {confirmReset ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px]">Wirklich alle Daten auf diesem Gerät löschen?</span>
              <Button variant="danger" icon={<Trash2 size={18} aria-hidden />} onClick={() => void resetAll()}>
                Ja, alles löschen
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                Abbrechen
              </Button>
            </div>
          ) : (
            <Button variant="danger" icon={<Trash2 size={18} aria-hidden />} onClick={() => setConfirmReset(true)}>
              Alle Daten löschen
            </Button>
          )}
        </section>
      </div>
    </Card>
  );
}
