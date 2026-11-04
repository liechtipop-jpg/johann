import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import type { SubjectColor } from '@/db/schemas';
import { addDays, diffDays, formatDate } from '@/lib/dates';
import { formatAverage, formatGrade } from '@/lib/format';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { subjectStyle } from '@/ui/subject';
import type { GradePoint } from './logic/series';

interface Datum extends GradePoint {
  x: number;
}

interface GradeChartProps {
  points: GradePoint[];
  color: SubjectColor;
  passMark: number;
  subjectName: string;
}

const axisTick = { fill: 'var(--ink-2)', fontSize: 12 };

/** Notenverlauf: Einzelnoten als Punkte, laufender Schnitt als Linie (eine Achse, 1–6). */
export default function GradeChart({ points, color, passMark, subjectName }: GradeChartProps) {
  const reduced = useReducedMotion();
  const base = points[0].date;
  const data: Datum[] = points.map((p) => ({ ...p, x: diffDays(base, p.date) }));
  const last = data[data.length - 1];
  const pad = Math.max(1, Math.round(last.x * 0.04));
  const values = points.map((p) => p.value);
  const summary = `Notenverlauf ${subjectName}: ${points.length} ${points.length === 1 ? 'Note' : 'Noten'} zwischen ${formatGrade(Math.min(...values))} und ${formatGrade(Math.max(...values))}, aktueller Schnitt ${formatAverage(last.average)}.`;

  return (
    <figure className="subject" style={subjectStyle(color)}>
      <div aria-hidden className="mb-3 flex gap-4 text-[13px] text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-(--sc-mark)" />
          Einzelnote
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-(--sc-mark)" />
          Schnitt
        </span>
      </div>
      <div role="img" aria-label={summary} className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="x"
              type="number"
              domain={[-pad, last.x + pad]}
              allowDecimals={false}
              tickFormatter={(x: number) => formatDate(addDays(base, Math.round(x)), 'dayMonth')}
              tick={axisTick}
              axisLine={{ stroke: 'var(--line)' }}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis domain={[1, 6]} ticks={[1, 2, 3, 4, 5, 6]} tick={axisTick} axisLine={false} tickLine={false} width={22} />
            <ReferenceLine
              y={passMark}
              stroke="var(--ink-3)"
              strokeDasharray="4 4"
              label={{ value: 'genügend', position: 'insideBottomRight', fill: 'var(--ink-3)', fontSize: 11 }}
            />
            <Tooltip cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }} isAnimationActive={false} content={ChartTooltip} />
            <Line
              dataKey="average"
              type="monotone"
              stroke="var(--sc-mark)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={false}
              isAnimationActive={!reduced}
              animationDuration={250}
            />
            <Scatter dataKey="value" fill="var(--sc-mark)" stroke="var(--surface)" strokeWidth={2} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  const datum = payload?.[0]?.payload as Datum | undefined;
  if (!active || !datum) return null;
  return (
    <div className="rounded-[10px] border border-line bg-surface px-3 py-2 text-[13px] shadow-(--shadow-overlay)">
      <p className="text-[17px] font-semibold tabular-nums">{formatGrade(datum.value)}</p>
      <p className="text-ink-2">
        {datum.title || 'Note'} · {formatDate(datum.date, 'dayMonth')}
        {datum.weight !== 1 && ` · Gewicht ${formatGrade(datum.weight)}`}
      </p>
      <p className="mt-1 text-ink-2">
        Schnitt danach <span className="font-medium text-ink tabular-nums">{formatAverage(datum.average)}</span>
      </p>
    </div>
  );
}
