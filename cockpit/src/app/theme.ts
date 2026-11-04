import { useEffect } from 'react';
import type { ThemePreference } from '@/db/settings';

const THEME_COLORS = { light: '#f7f5f1', dark: '#131211' } as const;

export function applyTheme(preference: ThemePreference): void {
  const dark = preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const mode = dark ? 'dark' : 'light';
  document.documentElement.dataset.theme = mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[mode]);
  try {
    // Spiegel im localStorage, damit index.html das Schema vor dem ersten Zeichnen kennt.
    localStorage.setItem('cockpit.theme', preference);
  } catch {
    // Privater Modus – egal.
  }
}

export function useThemeSync(preference: ThemePreference): void {
  useEffect(() => {
    applyTheme(preference);
    if (preference !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);
}
