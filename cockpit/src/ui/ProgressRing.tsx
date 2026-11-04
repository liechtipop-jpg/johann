import type { CSSProperties, ReactNode } from 'react';

interface ProgressRingProps {
  /** 0 bis 1 */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label: string;
  children?: ReactNode;
}

/** Animierter Fortschrittsring (füllt sich beim Erscheinen). */
export function ProgressRing({ value, size = 44, stroke = 4, color = 'var(--accent)', label, children }: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  const offset = circumference * (1 - v);
  return (
    <div role="img" aria-label={label} className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="ring-progress"
          style={{ '--ring-from': circumference } as CSSProperties}
        />
      </svg>
      {children && <span className="absolute text-xs font-semibold tabular-nums">{children}</span>}
    </div>
  );
}
