import { describe, expect, it } from 'vitest';
import { distanceToNextStep, gradeSteps, roundGrade, roundingThreshold, weightedAverage } from './average';

describe('Gewichteter Schnitt', () => {
  it('berücksichtigt die Gewichte', () => {
    expect(
      weightedAverage([
        { value: 5, weight: 1 },
        { value: 4, weight: 1 },
      ]),
    ).toBe(4.5);
    expect(
      weightedAverage([
        { value: 6, weight: 2 },
        { value: 3, weight: 1 },
      ]),
    ).toBe(5);
    expect(
      weightedAverage([
        { value: 4.5, weight: 0.5 },
        { value: 5, weight: 1 },
        { value: 4.75, weight: 1 },
      ]),
    ).toBeCloseTo(4.8, 10);
  });

  it('liefert ohne Noten null', () => {
    expect(weightedAverage([])).toBeNull();
  });
});

describe('Rundung der Zeugnisnote', () => {
  it('rundet auf halbe Noten, die Mitte nach oben', () => {
    expect(roundGrade(4.25, 0.5)).toBe(4.5);
    expect(roundGrade(4.2499, 0.5)).toBe(4);
    expect(roundGrade(4.75, 0.5)).toBe(5);
    expect(roundGrade(4.74, 0.5)).toBe(4.5);
    expect(roundGrade(5.75, 0.5)).toBe(6);
    expect(roundGrade(3.74, 0.5)).toBe(3.5);
  });

  it('ist robust gegen Rundungsfehler beim Rechnen', () => {
    // (4.5 + 5) / 2 = 4.75 exakt; 0.1 + 0.2-artige Fehler dürfen die Grenze nicht verschieben
    expect(roundGrade((4.5 + 5) / 2, 0.5)).toBe(5);
    expect(roundGrade(4.85, 0.1)).toBe(4.9);
    expect(roundGrade(4.849, 0.1)).toBe(4.8);
  });

  it('kennt Viertelnoten und keine Rundung', () => {
    expect(roundGrade(4.125, 0.25)).toBe(4.25);
    expect(roundGrade(4.12, 0.25)).toBe(4);
    expect(roundGrade(4.83, 0)).toBe(4.83);
  });

  it('bleibt zwischen 1 und 6', () => {
    expect(roundGrade(6.2, 0.5)).toBe(6);
    expect(roundGrade(0.8, 0.5)).toBe(1);
  });

  it('kennt die Rundungsgrenze', () => {
    expect(roundingThreshold(5, 0.5)).toBe(4.75);
    expect(roundingThreshold(4, 0.25)).toBe(3.875);
    expect(roundingThreshold(5, 0)).toBe(5);
  });

  it('zeigt, wie viel bis zur nächsten Stufe fehlt', () => {
    expect(distanceToNextStep(4.7, 0.5)).toBeCloseTo(0.05, 10);
    expect(distanceToNextStep(4.25, 0.5)).toBeCloseTo(0.5, 10);
    expect(distanceToNextStep(5.8, 0.5)).toBeNull();
    expect(distanceToNextStep(4.7, 0)).toBeNull();
  });

  it('listet mögliche Zeugnisnoten', () => {
    expect(gradeSteps(0.5)).toEqual([6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1]);
    expect(gradeSteps(0.25).slice(0, 3)).toEqual([6, 5.75, 5.5]);
  });
});
