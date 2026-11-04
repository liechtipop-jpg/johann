import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useReducedMotion } from '@/lib/useReducedMotion';

export interface BarDatum {
  label: string;
  /** Ausführliche Beschriftung für Tooltip und Tabelle */
  title: string;
  value: number;
}

const tick = { fill: 'var(--ink-2)', fontSize: 12 };

/** Einfaches Säulendiagramm (eine Reihe, Werte zusätzlich als Tabelle). */
export default function StatsBarChart({ data, unit, label }: { data: BarDatum[]; unit: string; label: string }) {
  const reduced = useReducedMotion();
  const max = Math.max(0, ...data.map((d) => d.value));
  return (
    <figure>
      <div role="img" aria-label={`${label}: höchstens ${max} ${unit} pro Tag`} className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="label"
              tick={tick}
              axisLine={{ stroke: 'var(--line)' }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis allowDecimals={false} tick={tick} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              cursor={{ fill: 'var(--surface-2)' }}
              isAnimationActive={false}
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as BarDatum | undefined;
                if (!active || !d) return null;
                return (
                  <div className="rounded-[10px] border border-line bg-surface px-3 py-2 text-[13px] shadow-(--shadow-overlay)">
                    <p className="text-[17px] font-semibold tabular-nums">
                      {d.value} <span className="text-[13px] font-normal text-ink-2">{unit}</span>
                    </p>
                    <p className="text-ink-2">{d.title}</p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="value"
              fill="var(--accent)"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              isAnimationActive={!reduced}
              animationDuration={250}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-ink-2">Als Tabelle</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-ink-2">
              <th scope="col" className="py-1 font-medium">
                Tag
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                {unit}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.title} className="border-t border-line">
                <td className="py-1">{d.title}</td>
                <td className="py-1 text-right tabular-nums">{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
