/**
 * Gewichtete Entscheidungsmatrix: Punktzahl = gewichteter Schnitt der Bewertungen (1–10)
 * über die bewerteten Kriterien mit Gewicht > 0. Dazu die Analyse
 * «Was müsste sich ändern, damit Option X gewinnt?» (einzelne Bewertung oder einzelnes Gewicht).
 */

export interface MatrixOption {
  id: string;
  order: number;
}
export interface MatrixCriterion {
  id: string;
  weight: number;
  order: number;
}
export interface MatrixRating {
  optionId: string;
  criterionId: string;
  score: number;
}
export interface MatrixInput {
  options: readonly MatrixOption[];
  criteria: readonly MatrixCriterion[];
  ratings: readonly MatrixRating[];
}

export type RatingMap = Map<string, Map<string, number>>;

export function ratingMap(ratings: readonly MatrixRating[]): RatingMap {
  const map: RatingMap = new Map();
  for (const r of ratings) {
    if (!map.has(r.optionId)) map.set(r.optionId, new Map());
    map.get(r.optionId)!.set(r.criterionId, r.score);
  }
  return map;
}

export interface OptionScore {
  optionId: string;
  /** Gewichteter Schnitt 1–10, null ohne bewertetes Kriterium mit Gewicht */
  score: number | null;
  /** Bewertete Kriterien mit Gewicht > 0 */
  rated: number;
  /** Kriterien mit Gewicht > 0 */
  total: number;
  /** Platz (gleiche Punktzahl = gleicher Platz), null ohne Punktzahl */
  rank: number | null;
}

const EPS = 1e-9;

function scoreOf(optionId: string, criteria: readonly MatrixCriterion[], map: RatingMap, weights?: Map<string, number>): number | null {
  let sum = 0;
  let weightSum = 0;
  const own = map.get(optionId);
  for (const c of criteria) {
    const w = weights?.get(c.id) ?? c.weight;
    const r = own?.get(c.id);
    if (w <= 0 || r === undefined) continue;
    sum += w * r;
    weightSum += w;
  }
  return weightSum > 0 ? sum / weightSum : null;
}

/** Punktzahlen in Ranking-Reihenfolge (ohne Punktzahl zuletzt, sonst nach eigener Reihenfolge). */
export function scoreOptions(input: MatrixInput): OptionScore[] {
  const map = ratingMap(input.ratings);
  const weighted = input.criteria.filter((c) => c.weight > 0);
  const rows = [...input.options]
    .sort((a, b) => a.order - b.order)
    .map((o) => ({
      optionId: o.id,
      score: scoreOf(o.id, input.criteria, map),
      rated: weighted.filter((c) => map.get(o.id)?.has(c.id)).length,
      total: weighted.length,
      rank: null as number | null,
    }));
  const sorted = [...rows].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  let rank = 0;
  let previous: number | null = null;
  sorted.forEach((row, i) => {
    if (row.score === null) return;
    if (previous === null || Math.abs(previous - row.score) > EPS) rank = i + 1;
    row.rank = rank;
    previous = row.score;
  });
  return sorted;
}

export interface WhatIf {
  criterionId: string;
  /** null = noch nicht bewertet */
  from: number | null;
  to: number;
}

export interface Reason {
  criterionId: string;
  target: number;
  other: number;
  weight: number;
}

export interface Analysis {
  targetId: string;
  /** Stärkste andere Option (bei Gleichstand die erste) */
  rivalId: string | null;
  targetScore: number | null;
  rivalScore: number | null;
  isLeader: boolean;
  /** Kriterien, in denen die Rivalin besser ist (bzw. bei der führenden Option: die eigenen Stärken) */
  reasons: Reason[];
  /** Kleinste Änderung einer einzelnen Bewertung, mit der die Option allein vorne läge */
  ratingChanges: WhatIf[];
  /** Kleinste Änderung eines einzelnen Gewichts, mit der die Option allein vorne läge */
  weightChanges: WhatIf[];
}

function wins(targetId: string, input: MatrixInput, map: RatingMap, weights?: Map<string, number>): boolean {
  const target = scoreOf(targetId, input.criteria, map, weights);
  if (target === null) return false;
  return input.options.every((o) => {
    if (o.id === targetId) return true;
    const s = scoreOf(o.id, input.criteria, map, weights);
    return s === null || target > s + EPS;
  });
}

export function analyze(input: MatrixInput, targetId: string, limit = 3): Analysis | null {
  if (!input.options.some((o) => o.id === targetId)) return null;
  const map = ratingMap(input.ratings);
  const scores = scoreOptions(input);
  const target = scores.find((s) => s.optionId === targetId)!;
  const others = scores.filter((s) => s.optionId !== targetId && s.score !== null);
  const rival = others[0] ?? null;
  const isLeader = target.score !== null && (rival === null || target.score > (rival.score ?? 0) + EPS);

  // Gründe: gewichtete Unterschiede zwischen Option und Rivalin
  const reasons: Reason[] = [];
  if (rival) {
    for (const c of input.criteria) {
      const t = map.get(targetId)?.get(c.id);
      const o = map.get(rival.optionId)?.get(c.id);
      if (c.weight <= 0 || t === undefined || o === undefined) continue;
      if (isLeader ? t > o : o > t) reasons.push({ criterionId: c.id, target: t, other: o, weight: c.weight });
    }
    reasons.sort((a, b) => b.weight * Math.abs(b.other - b.target) - a.weight * Math.abs(a.other - a.target));
  }

  const ratingChanges: WhatIf[] = [];
  const weightChanges: WhatIf[] = [];
  if (!isLeader && rival) {
    // Eine Bewertung anheben (oder ein noch offenes Kriterium bewerten)
    for (const c of input.criteria) {
      if (c.weight <= 0) continue;
      const current = map.get(targetId)?.get(c.id) ?? null;
      for (let to = (current ?? 0) + 1; to <= 10; to++) {
        const trial: RatingMap = new Map(map);
        trial.set(targetId, new Map(map.get(targetId) ?? []).set(c.id, to));
        if (wins(targetId, input, trial)) {
          ratingChanges.push({ criterionId: c.id, from: current, to });
          break;
        }
      }
    }
    ratingChanges.sort((a, b) => (a.from === null ? 1 : 0) - (b.from === null ? 1 : 0) || a.to - (a.from ?? 0) - (b.to - (b.from ?? 0)));

    // Ein Gewicht verschieben (0–10), kleinste Änderung zuerst
    for (const c of input.criteria) {
      for (let step = 1; step <= 10; step++) {
        const found = [c.weight + step, c.weight - step].find((v) => {
          if (v < 0 || v > 10) return false;
          return wins(targetId, input, map, new Map([[c.id, v]]));
        });
        if (found !== undefined) {
          weightChanges.push({ criterionId: c.id, from: c.weight, to: found });
          break;
        }
      }
    }
    weightChanges.sort((a, b) => Math.abs(a.to - (a.from ?? 0)) - Math.abs(b.to - (b.from ?? 0)));
  }

  return {
    targetId,
    rivalId: rival?.optionId ?? null,
    targetScore: target.score,
    rivalScore: rival?.score ?? null,
    isLeader,
    reasons: reasons.slice(0, limit),
    ratingChanges: ratingChanges.slice(0, limit),
    weightChanges: weightChanges.slice(0, limit),
  };
}
