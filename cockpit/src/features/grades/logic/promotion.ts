import { roundGrade } from './average';
import type { PromotionRules } from './rules';

export interface PromotionSubjectInput {
  subjectId: string;
  name: string;
  /** Gewichteter Schnitt im Semester; null = noch keine Note */
  average: number | null;
}

export interface PromotionSubjectResult {
  subjectId: string;
  name: string;
  average: number;
  /** Gerundete Zeugnisnote */
  grade: number;
  /** grade − passMark (positiv = Plus-Punkte) */
  deviation: number;
  insufficient: boolean;
  /** Beitrag zur Kompensationsbilanz (Minus-Punkte zählen mit dem Faktor) */
  contribution: number;
}

export interface PromotionCheck {
  id: 'insufficient' | 'compensation' | 'average';
  ok: boolean;
  label: string;
  detail: string;
}

export type PromotionStatus = 'promoted' | 'tight' | 'failed' | 'empty';

export interface PromotionResult {
  status: PromotionStatus;
  subjects: PromotionSubjectResult[];
  /** Promotionsfächer ohne Note (zählen noch nicht) */
  missing: string[];
  plus: number;
  minus: number;
  /** Plus − Faktor·Minus; ≥ 0 heisst «kompensiert» */
  balance: number;
  insufficientCount: number;
  average: number | null;
  checks: PromotionCheck[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => new Intl.NumberFormat('de-CH', { maximumFractionDigits: 2 }).format(n);

/** Promotionsrechner: wertet die gerundeten Zeugnisnoten der Promotionsfächer nach den Regeln aus. */
export function evaluatePromotion(inputs: readonly PromotionSubjectInput[], rules: PromotionRules): PromotionResult {
  const { passMark, roundingStep, maxInsufficient, compensationFactor, minAverage, warnReserve } = rules;

  const subjects: PromotionSubjectResult[] = [];
  const missing: string[] = [];
  for (const input of inputs) {
    if (input.average === null) {
      missing.push(input.name);
      continue;
    }
    const grade = roundGrade(input.average, roundingStep);
    const deviation = round2(grade - passMark);
    subjects.push({
      subjectId: input.subjectId,
      name: input.name,
      average: input.average,
      grade,
      deviation,
      insufficient: grade < passMark,
      contribution: round2(deviation >= 0 ? deviation : deviation * Math.max(1, compensationFactor)),
    });
  }

  const plus = round2(subjects.reduce((s, x) => s + Math.max(0, x.deviation), 0));
  const minus = round2(subjects.reduce((s, x) => s + Math.max(0, -x.deviation), 0));
  const balance = round2(plus - compensationFactor * minus);
  const insufficientCount = subjects.filter((s) => s.insufficient).length;
  const average = subjects.length ? subjects.reduce((s, x) => s + x.grade, 0) / subjects.length : null;

  const checks: PromotionCheck[] = [
    {
      id: 'insufficient',
      ok: insufficientCount <= maxInsufficient,
      label: 'Ungenügende Noten',
      detail: `${insufficientCount} von höchstens ${maxInsufficient}`,
    },
  ];
  if (compensationFactor > 0) {
    const required = round2(compensationFactor * minus);
    checks.push({
      id: 'compensation',
      ok: balance >= 0,
      label: compensationFactor === 2 ? 'Doppelte Kompensation' : 'Kompensation',
      detail:
        minus === 0
          ? `Keine Punkte unter ${fmt(passMark)} – ${fmt(plus)} Plus-Punkte`
          : `${fmt(plus)} Plus-Punkte, nötig sind ${compensationFactor === 1 ? '' : `${compensationFactor} × ${fmt(minus)} = `}${fmt(required)}`,
    });
  }
  if (minAverage !== null && average !== null) {
    checks.push({
      id: 'average',
      ok: average + 1e-9 >= minAverage,
      label: 'Mindestschnitt',
      detail: `${fmt(round2(average))} (mindestens ${fmt(minAverage)})`,
    });
  }

  let status: PromotionStatus;
  if (subjects.length === 0) status = 'empty';
  else if (checks.some((c) => !c.ok)) status = 'failed';
  else {
    const tightReserve = compensationFactor > 0 && balance < warnReserve;
    const tightCount = insufficientCount > 0 && insufficientCount >= maxInsufficient;
    const tightAverage = minAverage !== null && average !== null && average < minAverage + 0.25;
    status = tightReserve || tightCount || tightAverage ? 'tight' : 'promoted';
  }

  return { status, subjects, missing, plus, minus, balance, insufficientCount, average, checks };
}

/** «+1.5 Punkte Reserve» bzw. «0.5 Punkte fehlen» */
export function formatReserve(balance: number): string {
  if (balance >= 0) return `+${fmt(balance)} ${balance === 1 ? 'Punkt' : 'Punkte'} Reserve`;
  return `${fmt(-balance)} ${balance === -1 ? 'Punkt fehlt' : 'Punkte fehlen'}`;
}
