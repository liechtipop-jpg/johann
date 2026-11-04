import { useState } from 'react';
import type { Exam, Grade } from '@/db/schemas';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/dates';
import { formatGrade, parseWeight } from '@/lib/format';
import { Field, Input, Select } from '@/ui/Field';
import { StatusPill } from '@/ui/StatusPill';
import { gradeSteps } from './logic/average';
import type { PromotionRules } from './logic/rules';
import { requiredGrade } from './logic/wish';

const WEIGHTS = ['0.5', '1', '2'];

interface WishCalculatorProps {
  grades: Grade[];
  rules: PromotionRules;
  /** Aktuelle Zeugnisnote (gerundet) */
  current: number | null;
  nextExam?: Exam;
}

/** «Welche Note brauche ich an der nächsten Prüfung, damit die Zeugnisnote mindestens y wird?» */
export function WishCalculator({ grades, rules, current, nextExam }: WishCalculatorProps) {
  const options = gradeSteps(rules.roundingStep).filter((v) => v >= 3);
  const step = rules.roundingStep >= 0.25 ? rules.roundingStep : 0.5;
  const [target, setTarget] = useState(() => {
    const wanted = current === null ? 5 : Math.min(6, current + step);
    return options.reduce((best, v) => (Math.abs(v - wanted) < Math.abs(best - wanted) ? v : best), options[0]);
  });
  const [weightText, setWeightText] = useState(() => String(nextExam?.weight ?? 1));
  const weight = parseWeight(weightText);
  const result = weight === null ? null : requiredGrade({ grades, weight, target, step: rules.roundingStep });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Zeugnisnote mindestens">
          {(p) => (
            <Select {...p} value={target} onChange={(e) => setTarget(Number(e.target.value))}>
              {options.map((v) => (
                <option key={v} value={v}>
                  {formatGrade(v)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Gewicht der Prüfung" error={weight === null ? 'grösser als 0' : undefined}>
          {(p) => (
            <Input {...p} inputMode="decimal" value={weightText} onChange={(e) => setWeightText(e.target.value)} className="tabular-nums" />
          )}
        </Field>
      </div>
      <div className="-mt-2 flex justify-end gap-1.5" role="group" aria-label="Gewicht schnell wählen">
        {WEIGHTS.map((w) => (
          <button
            key={w}
            type="button"
            aria-label={`Gewicht ${w}`}
            onClick={() => setWeightText(w)}
            className={cn(
              'h-9 min-w-11 rounded-full border px-3 text-sm font-medium tabular-nums pointer-coarse:h-11',
              weightText === w ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-ink-2 hover:text-ink',
            )}
          >
            ×{w === '0.5' ? '½' : w}
          </button>
        ))}
      </div>
      {nextExam && (
        <p className="text-[13px] text-ink-2">
          Nächste Prüfung: «{nextExam.title}» am {formatDate(nextExam.date, 'weekday')}
        </p>
      )}

      <div aria-live="polite" className="rounded-[12px] bg-surface-2 p-4 dark:bg-surface-3">
        {result?.kind === 'reachable' && (
          <>
            <p className="text-sm text-ink-2">Du brauchst an der nächsten Prüfung mindestens</p>
            <p className="mt-1 text-[44px] leading-none font-semibold tracking-tight tabular-nums">{formatGrade(result.needed)}</p>
            {rules.roundingStep > 0 && (
              <p className="mt-2 text-[13px] text-ink-2">
                Rundungsgrenze: Ab einem Schnitt von {formatGrade(result.threshold)} wird auf {formatGrade(target)} gerundet.
              </p>
            )}
          </>
        )}
        {result?.kind === 'safe' && (
          <>
            <StatusPill tone="success">Schon sicher</StatusPill>
            <p className="mt-2 text-[15px]">Selbst mit einer 1 bleibt deine Zeugnisnote bei mindestens {formatGrade(target)}.</p>
          </>
        )}
        {result?.kind === 'impossible' && (
          <>
            <StatusPill tone="danger">Nicht erreichbar</StatusPill>
            <p className="mt-2 text-[15px]">
              Selbst mit einer 6 gibt es im Zeugnis eine {formatGrade(result.best)}. Vielleicht klappt es mit einer weiteren Prüfung.
            </p>
          </>
        )}
        {result === null && <p className="text-[15px] text-ink-2">Gib ein gültiges Gewicht ein.</p>}
      </div>
    </div>
  );
}
