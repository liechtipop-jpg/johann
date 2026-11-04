import { cn } from '@/lib/cn';
import { PIECE_STATUS, type PieceStatus } from './pieceStatus';

/** Status eines Stücks oder Abschnitts – immer mit Symbol und Text. */
export function PieceStatusBadge({ status, className }: { status: PieceStatus; className?: string }) {
  const { label, icon: Icon, className: tone } = PIECE_STATUS[status];
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] leading-tight font-medium', tone, className)}
    >
      <Icon size={14} aria-hidden className="shrink-0" />
      {label}
    </span>
  );
}
