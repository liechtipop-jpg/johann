import { CircleCheck, CircleX, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { db } from '@/db/db';
import { cn } from '@/lib/cn';
import { formatGrade } from '@/lib/format';
import { BackLink } from '@/ui/BackLink';
import { Card } from '@/ui/Card';
import { PageHeader } from '@/ui/PageHeader';
import { StatusPill } from '@/ui/StatusPill';
import { SubjectDot } from '@/ui/Subject';
import { ToggleSwitch } from '@/ui/Switch';
import { GradeBadge } from './GradeBadge';
import type { PromotionResult } from './logic/promotion';
import { describeRules, PROMOTION_SOURCE, type PromotionRules } from './logic/rules';
import { PROMOTION_STATUS, reserveUnit, signed } from './promotionUi';
import { SemesterSelect } from './SemesterSelect';
import { useGradesView } from './useGradesView';

function explanation(p: PromotionResult, rules: PromotionRules): string {
  const pass = formatGrade(rules.passMark);
  if (p.status === 'empty') return 'Sobald Noten in den Promotionsfächern erfasst sind, rechnet Cockpit hier mit.';
  if (p.status === 'failed') {
    if (p.insufficientCount > rules.maxInsufficient)
      return `Zu viele ungenügende Noten: ${p.insufficientCount} statt höchstens ${rules.maxInsufficient}.`;
    if (rules.compensationFactor > 0 && p.balance < 0)
      return `Die Punkte unter ${pass} sind nicht kompensiert – es fehlen ${formatGrade(-p.balance)} Punkte.`;
    return 'Mindestens eine Regel ist nicht erfüllt.';
  }
  if (p.status === 'tight')
    return 'Alle Regeln sind erfüllt, aber knapp. Eine schwächere Note kann reichen, um die Promotion zu gefährden.';
  return 'Alle Regeln sind erfüllt – mit Reserve.';
}

/** Promotionsrechner pro Semester mit Ampel, Regelprüfung und Kompensationsbilanz. */
export default function PromotionPage() {
  const view = useGradesView();
  if (!view) return null;
  const { promotion: p, rules, summaries, semester, semesters, setSemester, semesterQuery } = view;
  const status = PROMOTION_STATUS[p.status];
  const rows = [...p.subjects].sort((a, b) => b.contribution - a.contribution);
  const maxAbs = Math.max(0.5, ...rows.map((r) => Math.abs(r.contribution)));
  const colorOf = new Map(summaries.map((s) => [s.subject.id, s.subject.color]));
  const active = summaries.filter((s) => !s.subject.archived);

  return (
    <>
      <BackLink to={`/noten${semesterQuery}`} label="Noten" />
      <PageHeader
        title="Promotion"
        subtitle={semester?.name}
        actions={<SemesterSelect semesters={semesters} value={semester?.id} onChange={setSemester} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <Card>
          <StatusPill tone={status.tone} className="text-[14px]">
            {status.headline}
          </StatusPill>
          {p.status !== 'empty' && rules.compensationFactor > 0 && (
            <p className="mt-4 leading-none">
              <span className="text-[48px] font-semibold tracking-tight tabular-nums">{signed(p.balance)}</span>
              <span className="mt-2 block text-[15px] text-ink-2">{reserveUnit(p.balance)}</span>
            </p>
          )}
          <p className="mt-4 text-[15px]">{explanation(p, rules)}</p>
          {p.status !== 'empty' && (
            <ul className="mt-4 space-y-2.5 border-t border-line pt-4">
              {p.checks.map((check) => (
                <li key={check.id} className="flex gap-3">
                  {check.ok ? (
                    <CircleCheck size={20} aria-label="erfüllt" className="mt-0.5 shrink-0 text-success" />
                  ) : (
                    <CircleX size={20} aria-label="nicht erfüllt" className="mt-0.5 shrink-0 text-danger" />
                  )}
                  <span>
                    <span className="block font-medium">{check.label}</span>
                    <span className="block text-sm text-ink-2">{check.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {p.missing.length > 0 && (
            <p className="mt-4 text-[13px] text-ink-2">Noch ohne Note (zählen noch nicht): {p.missing.join(', ')}</p>
          )}
        </Card>

        <Card
          title="Kompensationsbilanz"
          description={`Abweichung der Zeugnisnoten von ${formatGrade(rules.passMark)}${rules.compensationFactor === 2 ? '; Punkte darunter zählen doppelt' : ''}`}
        >
          {rows.length === 0 ? (
            <p className="text-[15px] text-ink-2">Noch keine Noten in Promotionsfächern.</p>
          ) : (
            <>
              <div aria-hidden className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-3 rounded-[2px] bg-(--chart-pos)" />
                  Plus-Punkte
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-3 rounded-[2px] bg-(--chart-neg)" />
                  Minus-Punkte{rules.compensationFactor === 2 ? ' (doppelt)' : ''}
                </span>
              </div>
              <table className="w-full border-collapse text-[15px]">
                <caption className="sr-only">Beitrag jedes Promotionsfachs zur Kompensationsbilanz</caption>
                <thead className="sr-only">
                  <tr>
                    <th scope="col">Fach</th>
                    <th scope="col">Zeugnisnote</th>
                    <th scope="col">Beitrag</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const width = `${(Math.abs(row.contribution) / maxAbs) * 50}%`;
                    const color = colorOf.get(row.subjectId);
                    return (
                      <tr key={row.subjectId} className="border-b border-line last:border-0">
                        <th scope="row" className="max-w-0 py-2 pr-2 text-left font-normal">
                          <span className="flex items-center gap-2">
                            {color && <SubjectDot color={color} />}
                            <span className="truncate">{row.name}</span>
                          </span>
                        </th>
                        <td className="w-14 py-2 text-right">
                          <GradeBadge grade={row.grade} passMark={rules.passMark} />
                        </td>
                        <td className="w-[42%] py-2 pl-3">
                          <div className="flex items-center gap-2">
                            <div aria-hidden className="relative h-6 flex-1">
                              <div className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
                              {row.contribution !== 0 && (
                                <div
                                  className={cn(
                                    'absolute top-1/2 h-2.5 -translate-y-1/2',
                                    row.contribution > 0
                                      ? 'left-1/2 rounded-r-[4px] bg-(--chart-pos)'
                                      : 'right-1/2 rounded-l-[4px] bg-(--chart-neg)',
                                  )}
                                  style={{ width }}
                                />
                              )}
                            </div>
                            <span className="w-11 text-right text-sm font-medium tabular-nums">{signed(row.contribution)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-1 border-t border-line pt-3 text-sm">
                <dt className="text-ink-2">Plus-Punkte</dt>
                <dd className="text-right tabular-nums">{signed(p.plus)}</dd>
                <dt className="text-ink-2">Minus-Punkte{rules.compensationFactor > 1 ? ` × ${rules.compensationFactor}` : ''}</dt>
                <dd className="text-right tabular-nums">{signed(-(p.minus * Math.max(1, rules.compensationFactor)))}</dd>
                <dt className="font-semibold">Bilanz</dt>
                <dd className="text-right font-semibold tabular-nums">{signed(p.balance)}</dd>
              </dl>
            </>
          )}
        </Card>

        <Card title="Welche Fächer zählen?" description="Promotionsfächer gehen in die Rechnung ein.">
          <ul className="-my-1 divide-y divide-line">
            {active.map(({ subject }) => (
              <li key={subject.id} className="flex items-center gap-3">
                <SubjectDot color={subject.color} />
                <span className="min-w-0 flex-1 truncate text-[15px]">{subject.name}</span>
                <ToggleSwitch
                  label={`${subject.name} zählt für die Promotion`}
                  checked={subject.isPromotion}
                  onChange={(isPromotion) => void db.subjects.update(subject.id, { isPromotion })}
                />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Regeln">
          <ul className="space-y-1.5 text-[15px]">
            {describeRules(rules).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {rules.presetId === 'zh-gym' && !PROMOTION_SOURCE.verified && (
            <p className="mt-3">
              <StatusPill tone="warning">Bitte mit dem Reglement deiner Schule prüfen</StatusPill>
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
            <Link to="/einstellungen#promotion" className="text-accent-ink underline underline-offset-2">
              Regeln anpassen
            </Link>
            <a
              href={PROMOTION_SOURCE.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-accent-ink underline underline-offset-2"
            >
              Reglement LS 413.251.1
              <ExternalLink size={14} aria-hidden />
            </a>
          </div>
        </Card>
      </div>
    </>
  );
}
