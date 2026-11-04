import { describe, expect, it } from 'vitest';
import { requiredGrade } from './wish';

const grades = [
  { value: 5, weight: 1 },
  { value: 4, weight: 1 },
];

describe('Wunschnoten-Rechner', () => {
  it('rechnet mit der Rundungsgrenze', () => {
    // Für eine 5 genügt ein Schnitt von 4.75: (5 + 4 + x) / 3 ≥ 4.75 → x ≥ 5.25
    expect(requiredGrade({ grades, weight: 1, target: 5, step: 0.5 })).toEqual({ kind: 'reachable', needed: 5.25, threshold: 4.75 });
    expect(requiredGrade({ grades, weight: 1, target: 4.5, step: 0.5 })).toEqual({ kind: 'reachable', needed: 3.75, threshold: 4.25 });
  });

  it('berücksichtigt das Gewicht der nächsten Prüfung', () => {
    // (9 + 2x) / 4 ≥ 4.75 → x ≥ 5
    expect(requiredGrade({ grades, weight: 2, target: 5, step: 0.5 })).toMatchObject({ kind: 'reachable', needed: 5 });
  });

  it('meldet, wenn das Ziel schon sicher ist', () => {
    expect(requiredGrade({ grades: [{ value: 6, weight: 3 }], weight: 1, target: 4.5, step: 0.5 })).toEqual({
      kind: 'safe',
      threshold: 4.25,
    });
  });

  it('meldet, wenn das Ziel nicht erreichbar ist – mit der bestmöglichen Note', () => {
    expect(requiredGrade({ grades, weight: 1, target: 6, step: 0.5 })).toEqual({ kind: 'impossible', threshold: 5.75, best: 5 });
  });

  it('funktioniert ohne bisherige Noten und ohne Rundung', () => {
    expect(requiredGrade({ grades: [], weight: 1, target: 5, step: 0.5 })).toMatchObject({ kind: 'reachable', needed: 4.75 });
    expect(requiredGrade({ grades, weight: 1, target: 5, step: 0 })).toMatchObject({ kind: 'reachable', needed: 6 });
  });

  it('rundet die nötige Note auf zwei Stellen auf', () => {
    // (4.5 + x) / 2 ≥ 4.75 … mit Gewicht 0.5: (4.5 + 0.5x) / 1.5 ≥ 4.75 → x ≥ 5.25
    expect(requiredGrade({ grades: [{ value: 4.5, weight: 1 }], weight: 0.5, target: 5, step: 0.5 })).toMatchObject({ needed: 5.25 });
    // 1/3-Werte werden aufgerundet, nie abgerundet
    const r = requiredGrade({
      grades: [
        { value: 4, weight: 1 },
        { value: 4.5, weight: 1 },
      ],
      weight: 1,
      target: 4.5,
      step: 0,
    });
    expect(r).toMatchObject({ kind: 'reachable', needed: 5 });
  });
});
