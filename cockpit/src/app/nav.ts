import { CalendarRange, Compass, GraduationCap, Layers, Piano, Settings, Sun, Timer, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Taste nach «G» (z. B. G dann H = Heute) */
  shortcut: string;
  /** In der Tab-Leiste auf dem Handy (sonst unter «Mehr») */
  tab?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Heute', icon: Sun, shortcut: 'h', tab: true },
  { to: '/planer', label: 'Planer', icon: CalendarRange, shortcut: 'p', tab: true },
  { to: '/noten', label: 'Noten', icon: GraduationCap, shortcut: 'n', tab: true },
  { to: '/karten', label: 'Karten', icon: Layers, shortcut: 'k', tab: true },
  { to: '/klavier', label: 'Klavier', icon: Piano, shortcut: 'm' },
  { to: '/fokus', label: 'Fokus', icon: Timer, shortcut: 'f' },
  { to: '/kompass', label: 'Kompass', icon: Compass, shortcut: 's' },
  { to: '/einstellungen', label: 'Einstellungen', icon: Settings, shortcut: 'e' },
];

export function isActivePath(pathname: string, to: string): boolean {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
export const MOD_KEY = isMac ? '⌘' : 'Ctrl';
