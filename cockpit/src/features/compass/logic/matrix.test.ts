import { describe, expect, it } from 'vitest';
import { analyze, scoreOptions, type MatrixInput } from './matrix';

const criteria = [
  { id: 'pay', weight: 8, order: 0 },
  { id: 'interest', weight: 6, order: 1 },
  { id: 'safety', weight: 2, order: 2 },
];
const options = [
  { id: 'eth', order: 0 },
  { id: 'uzh', order: 1 },
  { id: 'hsg', order: 2 },
];
const r = (optionId: string, criterionId: string, score: number) => ({ optionId, criterionId, score });
const input: MatrixInput = {
  options,
  criteria,
  ratings: [
    r('eth', 'pay', 7),
    r('eth', 'interest', 9),
    r('eth', 'safety', 6),
    r('uzh', 'pay', 9),
    r('uzh', 'interest', 6),
    r('uzh', 'safety', 8),
    r('hsg', 'pay', 8),
    r('hsg', 'interest', 5),
  ],
};

describe('Entscheidungsmatrix', () => {
  it('rechnet den gewichteten Schnitt und rangiert', () => {
    const scores = scoreOptions(input);
    // eth: (56 + 54 + 12) / 16 = 7.625 · uzh: (72 + 36 + 16) / 16 = 7.75 · hsg (ohne safety): (64 + 30) / 14 ≈ 6.71
    expect(scores.map((s) => s.optionId)).toEqual(['uzh', 'eth', 'hsg']);
    expect(scores[0].score).toBeCloseTo(7.75);
    expect(scores[1].score).toBeCloseTo(7.625);
    expect(scores[2]).toMatchObject({ rated: 2, total: 3, rank: 3 });
  });

  it('gibt bei Gleichstand denselben Platz und ignoriert Gewicht 0', () => {
    const tie = scoreOptions({
      options,
      criteria: [
        { id: 'a', weight: 5, order: 0 },
        { id: 'b', weight: 0, order: 1 },
      ],
      ratings: [r('eth', 'a', 6), r('uzh', 'a', 6), r('uzh', 'b', 1)],
    });
    expect(tie.map((s) => [s.optionId, s.rank, s.score])).toEqual([
      ['eth', 1, 6],
      ['uzh', 1, 6],
      ['hsg', null, null],
    ]);
  });

  it('erklärt, warum die Rivalin vorne liegt', () => {
    const a = analyze(input, 'eth')!;
    expect(a).toMatchObject({ rivalId: 'uzh', isLeader: false });
    expect(a.reasons.map((x) => x.criterionId)).toEqual(['pay', 'safety']);
  });

  it('findet die kleinste einzelne Bewertungsänderung', () => {
    const a = analyze(input, 'eth')!;
    // Lohn 7 → 8: (64 + 54 + 12) / 16 = 8.125 > 7.75
    expect(a.ratingChanges[0]).toEqual({ criterionId: 'pay', from: 7, to: 8 });
    // Sicherheit 6 → 8: (56 + 54 + 16) / 16 = 7.875 > 7.75 (6 → 7 ergibt nur Gleichstand)
    expect(a.ratingChanges).toContainEqual({ criterionId: 'safety', from: 6, to: 8 });
  });

  it('findet die kleinste einzelne Gewichtsänderung', () => {
    const a = analyze(input, 'eth')!;
    // Interesse 6 → 7: eth (56 + 63 + 12) / 17 ≈ 7.71 · uzh (72 + 42 + 16) / 17 ≈ 7.65 → eth vorne
    expect(a.weightChanges[0]).toEqual({ criterionId: 'interest', from: 6, to: 7 });
    // Lohn weniger wichtig: 8 → 6 · eth (42 + 54 + 12) / 14 ≈ 7.71 · uzh (54 + 36 + 16) / 14 ≈ 7.57
    expect(a.weightChanges).toContainEqual({ criterionId: 'pay', from: 8, to: 6 });
  });

  it('meldet, wenn eine Option bereits vorne liegt', () => {
    const a = analyze(input, 'uzh')!;
    expect(a).toMatchObject({ isLeader: true, rivalId: 'eth', ratingChanges: [], weightChanges: [] });
    expect(a.reasons.map((x) => x.criterionId)).toEqual(['pay', 'safety']);
  });

  it('schlägt auch ein offenes Kriterium vor und meldet Unmögliches nicht', () => {
    const a = analyze(input, 'hsg')!;
    expect(a.ratingChanges.some((c) => c.from === null && c.criterionId === 'safety')).toBe(false);
    const hopeless = analyze(
      { options, criteria: [{ id: 'pay', weight: 5, order: 0 }], ratings: [r('eth', 'pay', 10), r('uzh', 'pay', 10)] },
      'uzh',
    )!;
    expect(hopeless.ratingChanges).toEqual([]);
    expect(hopeless.weightChanges).toEqual([]);
  });
});
