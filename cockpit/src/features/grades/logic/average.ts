/** Rechnen mit Schweizer Noten (1–6). */

export interface WeightedGrade {
  value: number;
  weight: number;
}

const EPSILON = 1e-9;

/** Gewichteter Schnitt Σ(Note·Gewicht) / ΣGewicht – null ohne Noten. */
export function weightedAverage(grades: readonly WeightedGrade[]): number | null {
  let sum = 0;
  let weights = 0;
  for (const g of grades) {
    sum += g.value * g.weight;
    weights += g.weight;
  }
  return weights > 0 ? sum / weights : null;
}

/**
 * Rundet auf `step` (0.5 = halbe Noten). Die Mitte wird aufgerundet: 4.25 → 4.5, 4.75 → 5.
 * step 0 = nicht runden. Ergebnis bleibt zwischen 1 und 6.
 */
export function roundGrade(value: number, step: number): number {
  if (step <= 0) return Math.min(6, Math.max(1, value));
  const rounded = Math.floor(value / step + 0.5 + EPSILON) * step;
  return Math.min(6, Math.max(1, Math.round(rounded * 1000) / 1000));
}

/** Kleinster Schnitt, der noch auf `target` gerundet wird (z. B. 4.75 für eine 5 bei halben Noten). */
export function roundingThreshold(target: number, step: number): number {
  return step > 0 ? target - step / 2 : target;
}

/** Wie viel dem Schnitt bis zur nächsthöheren Zeugnisnote fehlt (null bei 6 oder ohne Rundung). */
export function distanceToNextStep(average: number, step: number): number | null {
  if (step <= 0) return null;
  const rounded = roundGrade(average, step);
  if (rounded >= 6) return null;
  return Math.max(0, roundingThreshold(rounded + step, step) - average);
}

/** Mögliche Zeugnisnoten für Auswahlfelder (6, 5.5, 5 … bei halben Noten). */
export function gradeSteps(step: number): number[] {
  const s = step > 0 && step >= 0.25 ? step : 0.5;
  const out: number[] = [];
  for (let v = 6; v >= 1 - EPSILON; v -= s) out.push(Math.round(v * 100) / 100);
  return out;
}
