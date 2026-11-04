import { useState } from 'react';
import { db } from '@/db/db';
import { patchSetting } from '@/db/settings';
import { useSettings } from '@/db/settingsContext';
import { Button } from '@/ui/Button';
import { Switch } from '@/ui/Switch';
import { toast } from '@/ui/toast';
import { disableDemo, enableDemo } from './demo';

/** Werkzeuge im Dev-Modus. */
export function DevTools() {
  const { dev } = useSettings();
  const [busy, setBusy] = useState(false);

  async function toggleDemo(on: boolean) {
    setBusy(true);
    try {
      if (on) {
        await enableDemo(db);
        toast('Demo-Daten geladen. Deine eigenen Daten sind gesichert und kommen zurück, sobald du den Schalter ausschaltest.');
      } else {
        await disableDemo(db);
        toast('Deine eigenen Daten sind zurück.', { tone: 'success' });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-[12px] border border-dashed border-line-strong p-3">
      <p className="text-sm font-semibold text-ink-2">Entwicklermodus</p>
      <Switch
        label="Demo-Daten laden"
        description="Ersetzt die Anzeige durch fiktive Beispieldaten. Ausschalten stellt deine Daten wieder her."
        checked={dev.demoActive}
        disabled={busy}
        onChange={(on) => void toggleDemo(on)}
      />
      {dev.enabled && !import.meta.env.DEV && !dev.demoActive && (
        <Button size="sm" variant="ghost" onClick={() => void patchSetting('dev', { enabled: false })}>
          Entwicklermodus ausschalten
        </Button>
      )}
    </div>
  );
}
