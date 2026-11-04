import { roundGrade, roundingThreshold, weightedAverage, type WeightedGrade } from './average';

export type WishResult =
  /** Diese Note reicht mindestens (auf 0.01 aufgerundet). */
  | { kind: 'reachable'; needed: number; threshold: number }
  /** Schon sicher – sogar mit der tiefsten Note bleibt die Zeugnisnote erreicht. */
  | { kind: 'safe'; threshold: number }
  /** Nicht erreichbar – sogar mit einer 6 reicht es nicht. best = Zeugnisnote mit einer 6. */
  | { kind: 'impossible'; threshold: number; best: number };

interface WishInput {
  grades: readonly WeightedGrade[];
  /** Gewicht der nächsten Prüfung */
  weight: number;
  /** Gewünschte Zeugnisnote (gerundet) */
  target: number;
  /** Rundungsschritt der Zeugnisnote (0.5 = halbe Noten, 0 = keine Rundung) */
  step: number;
  min?: number;
  max?: number;
}

/**
 * Wunschnoten-Rechner: Welche Note brauche ich an der nächsten Prüfung (Gewicht x),
 * damit die gerundete Zeugnisnote mindestens `target` wird?
 * Gerechnet wird mit der Rundungsgrenze: Für eine 5 genügt bei halben Noten ein Schnitt von 4.75.
 */
export function requiredGrade({ grades, weight, target, step, min = 1, max = 6 }: WishInput): WishResult {
  const threshold = roundingThreshold(target, step);
  const sum = grades.reduce((s, g) => s + g.value * g.weight, 0);
  const weights = grades.reduce((s, g) => s + g.weight, 0);
  const exact = (threshold * (weights + weight) - sum) / weight;
  const needed = Math.ceil(exact * 100 - 1e-6) / 100;

  if (needed <= min) return { kind: 'safe', threshold };
  if (needed > max) {
    const best = weightedAverage([...grades, { value: max, weight }]) ?? max;
    return { kind: 'impossible', threshold, best: roundGrade(best, step) };
  }
  return { kind: 'reachable', needed, threshold };
}
