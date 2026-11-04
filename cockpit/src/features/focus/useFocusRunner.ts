import { useEffect } from 'react';
import { useSettings } from '@/db/settingsContext';
import { playChime, vibrate } from '@/lib/chime';
import { formatClock } from '@/lib/stopwatch';
import { toast } from '@/ui/toast';
import { syncFocusTimer } from './actions';
import { endsAt, FCE_SEGMENTS, phaseLabel, remainingMs, type Phase } from './logic/timer';

function announce(finished: Phase[], next: { phase: Phase; status: string; segmentIndex: number }) {
  const last = finished[finished.length - 1];
  if (last === 'focus')
    toast(next.status === 'running' ? 'Fokusrunde geschafft – die Pause läuft.' : 'Fokusrunde geschafft – Zeit für eine Pause.', {
      tone: 'success',
    });
  else if (last === 'segment')
    toast(next.segmentIndex === 0 ? 'Simulation beendet – gut gemacht.' : `Zeit um. Weiter mit ${FCE_SEGMENTS[next.segmentIndex].name}.`, {
      tone: 'success',
    });
  else toast('Pause vorbei – bereit für die nächste Runde?');
}

/**
 * Läuft global in der App: schaltet den Fokus-Timer genau zum Ende einer Phase weiter,
 * speichert die Fokuszeit, spielt einen Gong und zeigt die Restzeit im Fenstertitel.
 */
export function useFocusRunner(): void {
  const { focusTimer: timer, focus } = useSettings();
  const end = endsAt(timer);
  const sound = focus.sound;

  useEffect(() => {
    if (end === null) return;
    let cancelled = false;
    const check = async () => {
      if (cancelled || Date.now() < end) return;
      const result = await syncFocusTimer();
      if (result.finished.length === 0) return;
      if (sound && document.visibilityState === 'visible') playChime();
      vibrate();
      announce(result.finished, result.next);
    };
    const id = setTimeout(() => void check(), Math.min(2 ** 31 - 1, Math.max(0, end - Date.now()) + 30));
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearTimeout(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [end, sound]);

  // Restzeit im Fenstertitel (praktisch, wenn Cockpit in einem anderen Tab offen ist)
  const running = timer.status === 'running';
  useEffect(() => {
    if (!running) return;
    const update = () => {
      document.title = `${formatClock(remainingMs(timer, focus, Date.now()))} · ${phaseLabel(timer)} – Cockpit`;
    };
    update();
    const id = setInterval(update, 1000);
    return () => {
      clearInterval(id);
      document.title = 'Cockpit';
    };
  }, [running, timer, focus]);
}
