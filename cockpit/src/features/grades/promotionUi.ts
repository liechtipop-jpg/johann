import type { StatusTone } from '@/ui/StatusPill';
import type { PromotionStatus } from './logic/promotion';

export const PROMOTION_STATUS: Record<PromotionStatus, { tone: StatusTone; label: string; headline: string }> = {
  promoted: { tone: 'success', label: 'Promoviert', headline: 'Stand jetzt promoviert' },
  tight: { tone: 'warning', label: 'Knapp', headline: 'Stand jetzt knapp' },
  failed: { tone: 'danger', label: 'Gefährdet', headline: 'Promotion gefährdet' },
  empty: { tone: 'neutral', label: 'Offen', headline: 'Noch keine Noten' },
};

const number = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 2 });

/** +1.5 · −0.5 · 0 (mit echtem Minuszeichen) */
export function signed(n: number): string {
  if (n > 0) return `+${number.format(n)}`;
  if (n < 0) return `−${number.format(-n)}`;
  return '0';
}

/** «Punkte Reserve» bzw. «Punkte fehlen» (Einheit zur grossen Zahl) */
export function reserveUnit(balance: number): string {
  if (balance >= 0) return balance === 1 ? 'Punkt Reserve' : 'Punkte Reserve';
  return balance === -1 ? 'Punkt fehlt' : 'Punkte fehlen';
}
