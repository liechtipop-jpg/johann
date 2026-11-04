import { useLiveQuery } from 'dexie-react-hooks';
import { lazy, Suspense } from 'react';
import { db } from '@/db/db';
import { diffDays, formatDate } from '@/lib/dates';
import { useNow, useToday } from '@/lib/useNow';
import { BackLink } from '@/ui/BackLink';
import { Card } from '@/ui/Card';
import { PageHeader } from '@/ui/PageHeader';
import { StatTile } from '@/ui/StatTile';
import { deckDirections } from './actions';
import { forecast, retention, reviewStreak, reviewsPerDay, stateCounts } from './logic/stats';

const StatsBarChart = lazy(() => import('./StatsBarChart'));
const DAY = 86_400_000;

/** Karteikarten-Statistik: Wiederholungen, Trefferquote, Kartenstatus, Prognose. */
export default function StatsPage() {
  const today = useToday();
  const now = useNow();
  const data = useLiveQuery(async () => {
    const [logs, states, decks] = await Promise.all([db.reviewLogs.toArray(), db.cardStates.toArray(), db.decks.toArray()]);
    const dirs = new Map(decks.map((d) => [d.id, deckDirections(d)]));
    return { logs, states: states.filter((s) => dirs.get(s.deckId)?.includes(s.dir)) };
  }, []);
  if (!data) return null;

  const perDay = reviewsPerDay(data.logs, today, 30);
  const next = forecast(data.states, today, 7);
  const counts = stateCounts(data.states);
  const total = counts.new + counts.learning + counts.review;
  const rate = retention(data.logs, now - 30 * DAY);
  const streak = reviewStreak(data.logs, today);
  const segments = [
    { key: 'review', label: 'Gelernt', value: counts.review, color: 'var(--accent)' },
    { key: 'learning', label: 'Am Lernen', value: counts.learning, color: 'color-mix(in oklab, var(--accent) 55%, var(--surface))' },
    { key: 'new', label: 'Neu', value: counts.new, color: 'color-mix(in oklab, var(--accent) 22%, var(--surface))' },
  ];

  return (
    <>
      <BackLink to="/karten" label="Karteikarten" />
      <PageHeader title="Statistik" subtitle="Karteikarten" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Heute wiederholt" value={perDay.at(-1)?.count ?? 0} />
        <StatTile label="Trefferquote" value={rate === null ? '–' : `${Math.round(rate * 100)} %`} hint="Letzte 30 Tage" />
        <StatTile label="Lerntage in Folge" value={streak} />
        <StatTile label="Karten" value={total} hint={`${counts.review} gelernt`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Wiederholungen" description="Letzte 30 Tage">
          <Suspense fallback={<div className="h-[180px]" />}>
            <StatsBarChart
              label="Wiederholungen pro Tag"
              unit="Karten"
              data={perDay.map((d) => ({ label: formatDate(d.date, 'dayMonth'), title: formatDate(d.date, 'weekday'), value: d.count }))}
            />
          </Suspense>
        </Card>
        <Card title="Prognose" description="Fällige Karten in den nächsten 7 Tagen">
          <Suspense fallback={<div className="h-[180px]" />}>
            <StatsBarChart
              label="Fällige Karten pro Tag"
              unit="Karten"
              data={next.map((d) => ({
                label: diffDays(today, d.date) === 0 ? 'Heute' : formatDate(d.date, 'weekday').split(',')[0],
                title: formatDate(d.date, 'weekday'),
                value: d.count,
              }))}
            />
          </Suspense>
        </Card>
        <Card title="Kartenstatus" className="lg:col-span-2">
          {total === 0 ? (
            <p className="text-[15px] text-ink-2">Noch keine Karten.</p>
          ) : (
            <>
              <div className="flex h-6 gap-0.5 overflow-hidden rounded-[6px]" aria-hidden>
                {segments
                  .filter((s) => s.value > 0)
                  .map((s) => (
                    <div key={s.key} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
                  ))}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {segments.map((s) => (
                  <li key={s.key} className="inline-flex items-center gap-2">
                    <span aria-hidden className="size-3 rounded-[3px]" style={{ background: s.color }} />
                    <span className="text-ink-2">{s.label}</span>
                    <span className="font-semibold tabular-nums">{s.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
