import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { NAV_ITEMS } from './nav';
import { ui } from './uiStore';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Ctrl/Cmd+K: Befehlspalette · N: Schnellerfassung · ?: Hilfe
 * G dann H/P/N/K/M/F/S/E: zu einer Seite springen.
 */
export function useGlobalShortcuts(): void {
  const navigate = useNavigate();
  useEffect(() => {
    let gPressedAt = 0;
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        ui.togglePalette();
        return;
      }
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || document.querySelector('dialog[open]')) return;
      const key = event.key.toLowerCase();
      if (gPressedAt && Date.now() - gPressedAt < 1500) {
        gPressedAt = 0;
        const item = NAV_ITEMS.find((n) => n.shortcut === key);
        if (item) {
          event.preventDefault();
          navigate(item.to);
        }
        return;
      }
      if (key === 'g') {
        gPressedAt = Date.now();
      } else if (key === 'n') {
        event.preventDefault();
        ui.openQuickAdd();
      } else if (event.key === '?') {
        event.preventDefault();
        ui.openShortcuts();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);
}
