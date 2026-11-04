import { Share, Smartphone } from 'lucide-react';
import { promptInstall, useInstallState } from '@/lib/platform';
import { Button } from '@/ui/Button';
import { StatusPill } from '@/ui/StatusPill';

/** Rat zur Installation – passend zur Plattform. */
export function InstallHint({ compact = false }: { compact?: boolean }) {
  const state = useInstallState();
  if (state.standalone) return <StatusPill tone="success">Als App installiert</StatusPill>;

  return (
    <div className="flex items-start gap-3">
      {!compact && (
        <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent-ink">
          <Smartphone size={20} aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-[15px] text-ink-2">
          {state.ios ? (
            <>
              Tippe in Safari auf <Share size={15} aria-label="Teilen" className="inline align-[-2px]" /> «Teilen» und dann auf «Zum
              Home-Bildschirm». So startet Cockpit wie eine App, läuft offline und deine Daten sind besser geschützt.
            </>
          ) : state.canPrompt ? (
            'Installiere Cockpit als App: startet schneller, läuft offline und deine Daten sind besser geschützt.'
          ) : (
            'Installiere Cockpit über das Browser-Menü («App installieren» oder «Zum Startbildschirm hinzufügen»). So läuft es offline und deine Daten sind besser geschützt.'
          )}
        </p>
        {state.canPrompt && (
          <Button variant="primary" size="sm" onClick={() => void promptInstall()}>
            App installieren
          </Button>
        )}
      </div>
    </div>
  );
}
