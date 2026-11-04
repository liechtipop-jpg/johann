import { useEffect } from 'react';
import { useLocation } from 'react-router';

/** Scrollt zu #anker, sobald der Inhalt geladen ist (z. B. /einstellungen#faecher). */
export function useHashScroll(ready: boolean): void {
  const { hash } = useLocation();
  useEffect(() => {
    if (!ready || !hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    target?.scrollIntoView({ block: 'start' });
  }, [hash, ready]);
}
