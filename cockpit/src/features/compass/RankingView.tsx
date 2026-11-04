import { ArrowDown, ArrowUp, Lightbulb, Scale, Trophy } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { Card } from '@/ui/Card';
import { Select } from '@/ui/Field';
import { formatScore } from './format';
import { analyze, type WhatIf } from './logic/matrix';
import type { CompassData } from './useCompassData';

export function RankingView({ data }: { data: CompassData }) {
  const ranked = data.scores.filter((s) => s.score !== null);
  const [target, setTarget] = useState<string | null>(null);
  const targetId = target && data.optionMap.has(target) ? target : (ranked[1] ?? ranked[0] ?? data.scores[0])?.optionId;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
      <Card title="Ranking" description="Gewichteter Schnitt deiner Bewertungen (1–10)">
        {ranked.length === 0 ? (
          <p className="flex items-center gap-3 text-[15px] text-ink-2">
            <Scale size={20} aria-hidden className="shrink-0 text-ink-3" />
            Noch keine Bewertungen. Bewerte die Optionen unter «Bewerten» – das Ranking entsteht dann automatisch.
          </p>
        ) : (
          <ol className="space-y-3">
            {data.scores.map((s) => {
              const option = data.optionMap.get(s.optionId)!;
              const leader = s.rank === 1;
              return (
                <li key={s.optionId}>
                  <Link to={`/kompass/option/${s.optionId}`} className="group block rounded-[10px] p-1 -m-1 hover:bg-surface-2">
                    <div className="flex items-baseline gap-3">
                      <span
                        className={cn(
                          'grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold tabular-nums',
                          leader ? 'bg-accent text-on-accent' : 'bg-surface-2 text-ink-2',
                        )}
                        aria-label={s.rank ? `Platz ${s.rank}` : 'ohne Platz'}
                      >
                        {s.rank ?? '–'}
                      </span>
                      <span className="min-w-0 flex-1 text-[15px] leading-snug font-medium group-hover:underline">{option.name}</span>
                      <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                        {s.score === null ? '–' : formatScore(s.score)}
                      </span>
                    </div>
                    <div className="mt-1.5 ml-9 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                      {s.score !== null && (
                        <div
                          className={cn('h-full rounded-full', leader ? 'bg-accent' : 'bg-(--chart-seq-mid)')}
                          style={{ width: `${(s.score / 10) * 100}%` }}
                        />
                      )}
                    </div>
                    {s.rated < s.total && (
                      <p className="mt-1 ml-9 text-[12px] text-ink-2">
                        {s.rated} von {s.total} Kriterien bewertet
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
      {targetId && ranked.length >= 2 && <WhatItTakes data={data} targetId={targetId} onTarget={setTarget} />}
    </div>
  );
}

function WhatItTakes({ data, targetId, onTarget }: { data: CompassData; targetId: string; onTarget: (id: string) => void }) {
  const analysis = analyze({ options: data.options, criteria: data.criteria, ratings: data.ratings }, targetId);
  if (!analysis) return null;
  const name = (id: string | null) => (id ? (data.optionMap.get(id)?.name ?? '') : '');
  const criterion = (id: string) => data.criteria.find((c) => c.id === id)?.name ?? '';
  const target = name(analysis.targetId);
  const rival = name(analysis.rivalId);
  const gap = analysis.targetScore !== null && analysis.rivalScore !== null ? Math.abs(analysis.rivalScore - analysis.targetScore) : null;

  return (
    <Card title="Was müsste sich ändern?" description="Die kleinste einzelne Änderung, mit der eine Option vorne läge.">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="analysis-target" className="text-sm font-medium">
            Option
          </label>
          <Select id="analysis-target" value={targetId} onChange={(e) => onTarget(e.target.value)}>
            {data.scores.map((s) => (
              <option key={s.optionId} value={s.optionId}>
                {s.rank ? `${s.rank}. ` : ''}
                {name(s.optionId)}
              </option>
            ))}
          </Select>
        </div>

        {analysis.targetScore === null ? (
          <p className="text-[15px] text-ink-2">Diese Option hat noch keine Bewertung.</p>
        ) : analysis.isLeader ? (
          <p className="flex items-start gap-2 text-[15px]">
            <Trophy size={18} aria-hidden className="mt-0.5 shrink-0 text-accent-ink" />
            <span>
              «{target}» liegt vorne{gap !== null && rival ? ` – ${formatScore(gap)} Punkte vor «${rival}».` : '.'}
            </span>
          </p>
        ) : (
          <p className="text-[15px]">
            «{target}» liegt {gap !== null && gap > 0 ? `${formatScore(gap)} Punkte` : 'gleichauf'}{' '}
            {gap !== null && gap > 0 ? 'hinter' : 'mit'} «{rival}».
          </p>
        )}

        {analysis.reasons.length > 0 && (
          <Section title={analysis.isLeader ? `Stärken gegenüber «${rival}»` : `Wo «${rival}» besser abschneidet`}>
            {analysis.reasons.map((r) => (
              <li key={r.criterionId} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">{criterion(r.criterionId)}</span>
                <span className="shrink-0 text-ink-2 tabular-nums">
                  {r.target} statt {r.other} · Gewicht {r.weight}
                </span>
              </li>
            ))}
          </Section>
        )}

        {!analysis.isLeader && analysis.targetScore !== null && (
          <>
            <Section
              title="Eine Bewertung ändern"
              empty="Keine einzelne Bewertung reicht – die Option müsste in mehreren Kriterien besser abschneiden."
            >
              {analysis.ratingChanges.map((c) => (
                <Change key={c.criterionId} change={c} label={criterion(c.criterionId)} kind="rating" />
              ))}
            </Section>
            <Section title="Ein Gewicht ändern" empty="Keine einzelne Gewichtung reicht, damit die Option vorne liegt.">
              {analysis.weightChanges.map((c) => (
                <Change key={c.criterionId} change={c} label={criterion(c.criterionId)} kind="weight" />
              ))}
            </Section>
            <p className="flex items-start gap-2 text-[13px] text-ink-2">
              <Lightbulb size={16} aria-hidden className="mt-0.5 shrink-0" />
              Ändere Bewertungen nur, wenn sie wirklich zutreffen. Die Analyse zeigt vor allem, wie knapp die Entscheidung ist.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}

function Section({ title, empty, children }: { title: string; empty?: string; children: ReactNode[] }) {
  return (
    <div>
      <h3 className="mb-1.5 text-[13px] font-semibold text-ink-2">{title}</h3>
      {children.length === 0 ? <p className="text-[14px] text-ink-2">{empty}</p> : <ul className="space-y-1.5 text-[14px]">{children}</ul>}
    </div>
  );
}

function Change({ change, label, kind }: { change: WhatIf; label: string; kind: 'rating' | 'weight' }) {
  const up = change.to > (change.from ?? 0);
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <li className="flex items-start gap-2">
      <Icon size={16} aria-hidden className="mt-0.5 shrink-0 text-accent-ink" />
      <span>
        {kind === 'rating' ? (
          change.from === null ? (
            <>
              «{label}» mit mindestens <strong className="tabular-nums">{change.to}</strong> bewerten
            </>
          ) : (
            <>
              «{label}» von <span className="tabular-nums">{change.from}</span> auf <strong className="tabular-nums">{change.to}</strong>
            </>
          )
        ) : (
          <>
            «{label}» {up ? 'wichtiger' : 'weniger wichtig'}: Gewicht <span className="tabular-nums">{change.from}</span> →{' '}
            <strong className="tabular-nums">{change.to}</strong>
          </>
        )}
      </span>
    </li>
  );
}
