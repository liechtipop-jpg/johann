import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { Criterion } from '@/db/schemas';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/useMediaQuery';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Sheet } from '@/ui/Sheet';
import { saveCriterion } from './actions';
import { CriterionForm } from './CompassForms';
import { formatScore } from './format';
import { RatingSelect } from './RatingSelect';
import type { CompassData } from './useCompassData';

/** Optionen × Kriterien: auf dem Handy als Karten, auf dem Desktop als Tabelle. */
export function MatrixView({ data }: { data: CompassData }) {
  const [editing, setEditing] = useState<Criterion | 'new' | null>(null);
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const scoreLabel = (optionId: string) => {
    const s = data.scoreMap.get(optionId);
    return s?.score === null || !s ? 'noch keine Punktzahl' : `${formatScore(s.score)} Punkte · Platz ${s.rank}`;
  };

  return (
    <>
      {data.criteria.length === 0 ? (
        <Card>
          <p className="text-[15px] text-ink-2">Lege zuerst Kriterien an, z. B. «Interesse am Stoff» oder «Machbarkeit».</p>
          <Button className="mt-3" icon={<Plus size={16} aria-hidden />} onClick={() => setEditing('new')}>
            Kriterium
          </Button>
        </Card>
      ) : (
        <>
          {/* Handy: Gewichte und eine Karte pro Option */}
          {!desktop && (
            <div className="space-y-4">
              <Card
                title="Kriterien und Gewichte"
                description="0 = zählt nicht, 10 = sehr wichtig"
                action={
                  <Button size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => setEditing('new')}>
                    Kriterium
                  </Button>
                }
              >
                <ul className="space-y-1">
                  {data.criteria.map((c) => (
                    <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className="flex min-h-11 min-w-0 items-center gap-1.5 text-left text-[15px]"
                      >
                        <span className="truncate">{c.name}</span>
                        <Pencil size={13} aria-hidden className="shrink-0 text-ink-3" />
                      </button>
                      <span className="w-8 text-right font-semibold tabular-nums">{c.weight}</span>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        value={c.weight}
                        aria-label={`Gewicht von «${c.name}»`}
                        onChange={(e) => void saveCriterion({ ...c, weight: Number(e.target.value) })}
                        className="col-span-2 -mt-2 h-8 w-full accent-(--accent)"
                      />
                    </li>
                  ))}
                </ul>
              </Card>
              {data.options.map((option) => (
                <Card
                  key={option.id}
                  title={
                    <Link to={`/kompass/option/${option.id}`} className="hover:underline">
                      {option.name}
                    </Link>
                  }
                  description={scoreLabel(option.id)}
                >
                  <ul className="-my-1 divide-y divide-line">
                    {data.criteria.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 py-1.5">
                        <span className="min-w-0 flex-1 text-[15px]">
                          {c.name}
                          {c.weight === 0 && <span className="text-ink-3"> · zählt nicht</span>}
                        </span>
                        <RatingSelect
                          optionId={option.id}
                          criterionId={c.id}
                          value={data.map.get(option.id)?.get(c.id)}
                          label={`«${option.name}» bei «${c.name}»`}
                        />
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}

          {/* Desktop: Tabelle */}
          {desktop && (
            <Card
              title="Bewertungen"
              description="Gewicht 0–10 pro Kriterium, Bewertung 1–10 pro Option"
              action={
                <Button size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => setEditing('new')}>
                  Kriterium
                </Button>
              }
              bodyClassName="px-0 pb-2 lg:px-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[46rem] table-fixed border-collapse text-[14px]">
                  <thead>
                    <tr className="border-b border-line align-bottom">
                      <th scope="col" className="px-5 py-2 text-left font-medium text-ink-2">
                        Kriterium
                      </th>
                      <th scope="col" className="w-20 px-2 py-2 text-center font-medium text-ink-2">
                        Gewicht
                      </th>
                      {data.options.map((o) => (
                        <th key={o.id} scope="col" className="w-28 px-2 py-2 text-center text-[13px] leading-snug font-medium">
                          <Link
                            to={`/kompass/option/${o.id}`}
                            className="line-clamp-4 hyphens-auto break-words hover:underline"
                            title={o.name}
                          >
                            {o.name}
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.criteria.map((c) => (
                      <tr key={c.id} className="border-b border-line">
                        <th scope="row" className="px-5 py-1.5 text-left font-normal">
                          <button
                            type="button"
                            onClick={() => setEditing(c)}
                            className="inline-flex items-center gap-1.5 text-left hover:underline"
                          >
                            {c.name}
                            <Pencil size={12} aria-hidden className="shrink-0 text-ink-3" />
                          </button>
                        </th>
                        <td className="px-2 py-1.5 text-center">
                          <select
                            aria-label={`Gewicht von «${c.name}»`}
                            value={c.weight}
                            onChange={(e) => void saveCriterion({ ...c, weight: Number(e.target.value) })}
                            className="h-9 w-16 rounded-[10px] border border-line bg-surface-2 px-2 text-center font-semibold tabular-nums outline-none focus:border-accent focus:ring-3 focus:ring-accent/20"
                          >
                            {Array.from({ length: 11 }, (_, i) => (
                              <option key={i} value={i}>
                                {i}
                              </option>
                            ))}
                          </select>
                        </td>
                        {data.options.map((o) => (
                          <td key={o.id} className="px-2 py-1.5 text-center">
                            <RatingSelect
                              optionId={o.id}
                              criterionId={c.id}
                              value={data.map.get(o.id)?.get(c.id)}
                              label={`«${o.name}» bei «${c.name}»`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row" className="px-5 pt-3 pb-2 text-left font-semibold">
                        Punktzahl
                      </th>
                      <td />
                      {data.options.map((o) => {
                        const s = data.scoreMap.get(o.id);
                        return (
                          <td key={o.id} className="px-2 pt-3 pb-2 text-center">
                            <span className="block text-[17px] font-semibold tabular-nums">
                              {s?.score == null ? '–' : formatScore(s.score)}
                            </span>
                            {s?.rank && <span className="text-[12px] text-ink-2">Platz {s.rank}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Kriterium hinzufügen' : 'Kriterium bearbeiten'}
      >
        {editing !== null && (
          <CriterionForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </>
  );
}
