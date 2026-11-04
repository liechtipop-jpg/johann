import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { formatAverage } from '@/lib/format';
import { StatusPill } from '@/ui/StatusPill';
import { formatReserve, type PromotionResult } from './logic/promotion';
import type { PromotionRules } from './logic/rules';
import { PROMOTION_STATUS, reserveUnit, signed } from './promotionUi';

/** Kompakte Promotions-Ampel mit Kompensationsbilanz (Noten-Übersicht). */
export function PromotionCard({
  promotion,
  rules,
  to,
  className,
}: {
  promotion: PromotionResult;
  rules: PromotionRules;
  to: string;
  className?: string;
}) {
  const status = PROMOTION_STATUS[promotion.status];
  const showBalance = promotion.status !== 'empty' && rules.compensationFactor > 0;
  const label = `Promotion: ${status.headline}${showBalance ? `, ${formatReserve(promotion.balance)}` : ''}. Details anzeigen`;
  return (
    <Link
      to={to}
      aria-label={label}
      className={cn('block rounded-[14px] border border-line bg-surface p-4 transition-colors hover:border-line-strong lg:p-5', className)}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold">Promotion</h2>
        <span className="inline-flex items-center text-sm font-medium text-accent-ink">
          Details
          <ChevronRight size={16} aria-hidden />
        </span>
      </div>
      <div className="mt-3">
        <StatusPill tone={status.tone}>{status.headline}</StatusPill>
      </div>
      {promotion.status === 'empty' ? (
        <p className="mt-3 text-[15px] text-ink-2">Sobald du Noten erfasst, siehst du hier, wie sicher deine Promotion ist.</p>
      ) : (
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          {showBalance && (
            <p className="leading-none">
              <span className="text-[40px] font-semibold tracking-tight tabular-nums">{signed(promotion.balance)}</span>
              <span className="mt-1.5 block text-sm text-ink-2">{reserveUnit(promotion.balance)}</span>
            </p>
          )}
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-2">Ungenügend</dt>
            <dd className="text-right font-medium tabular-nums">
              {promotion.insufficientCount} von max. {rules.maxInsufficient}
            </dd>
            {promotion.average !== null && (
              <>
                <dt className="text-ink-2">Schnitt</dt>
                <dd className="text-right font-medium tabular-nums">{formatAverage(promotion.average)}</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </Link>
  );
}
