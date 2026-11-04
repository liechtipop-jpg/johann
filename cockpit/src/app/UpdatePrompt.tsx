import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';

/** Meldet neue App-Versionen und den ersten Offline-Start. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!offlineReady) return;
    toast('Cockpit funktioniert jetzt auch offline.', { tone: 'success' });
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+12px)] z-[65] mx-auto flex max-w-md animate-toast-in items-center gap-2 rounded-[12px] border border-line bg-surface py-2 pr-2 pl-4 shadow-(--shadow-overlay) lg:top-6 lg:right-6 lg:left-auto"
    >
      <RefreshCw size={18} aria-hidden className="shrink-0 text-accent-ink" />
      <span className="flex-1 text-[15px]">Neue Version verfügbar</span>
      <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
        Später
      </Button>
      <Button size="sm" variant="primary" onClick={() => void updateServiceWorker(true)}>
        Aktualisieren
      </Button>
    </div>
  );
}
