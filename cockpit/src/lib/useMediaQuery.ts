import { useCallback, useSyncExternalStore } from 'react';

/** true, solange die Media Query zutrifft (z. B. '(min-width: 64rem)' = Desktop-Layout). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (listener: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Ab hier gilt das Desktop-Layout (Tailwind `lg`). */
export const DESKTOP_QUERY = '(min-width: 64rem)';
