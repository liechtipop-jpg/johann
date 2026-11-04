import { useEffect, useState } from 'react';
import { toISODate, type ISODate } from './dates';

/** Aktuelle Zeit, jede Minute und beim Zurückkehren in die App aktualisiert. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}

/** Heutiges Datum (wechselt um Mitternacht automatisch). */
export function useToday(): ISODate {
  return toISODate(new Date(useNow()));
}
