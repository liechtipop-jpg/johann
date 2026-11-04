import { describe, expect, it } from 'vitest';
import { evaluatePromotion, formatReserve } from './promotion';
import { ZH_GYM_RULES, type PromotionRules } from './rules';

const input = (...averages: Array<number | null>) => averages.map((average, i) => ({ subjectId: `s${i}`, name: `Fach ${i + 1}`, average }));

describe('Promotionsrechner (Zürcher Gymnasien)', () => {
  it('promoviert mit Reserve, wenn alles genügend ist', () => {
    const r = evaluatePromotion(input(5, 4.5, 5.5, 4), ZH_GYM_RULES);
    expect(r.status).toBe('promoted');
    expect(r.plus).toBe(3);
    expect(r.minus).toBe(0);
    expect(r.balance).toBe(3);
    expect(r.insufficientCount).toBe(0);
  });

  it('kompensiert ungenügende Noten doppelt', () => {
    // Plus 1 + 0.5 + 1.5 = 3, Minus 0.5 → nötig 1.0 → Reserve 2
    const r = evaluatePromotion(input(5, 4.5, 5.5, 3.5), ZH_GYM_RULES);
    expect(r.minus).toBe(0.5);
    expect(r.balance).toBe(2);
    expect(r.status).toBe('promoted');
    expect(r.subjects[3]).toMatchObject({ grade: 3.5, deviation: -0.5, insufficient: true, contribution: -1 });
  });

  it('zeigt Gelb bei knapper Reserve', () => {
    // Plus 1.5, Minus 0.5 → Reserve 0.5 < 1
    const r = evaluatePromotion(input(5, 4.5, 3.5), ZH_GYM_RULES);
    expect(r.balance).toBe(0.5);
    expect(r.status).toBe('tight');
  });

  it('ist gefährdet, wenn die Kompensation nicht reicht', () => {
    // Plus 1.5, Minus 1 → nötig 2 → −0.5
    const r = evaluatePromotion(input(5.5, 3), ZH_GYM_RULES);
    expect(r.balance).toBe(-0.5);
    expect(r.status).toBe('failed');
    expect(r.checks.find((c) => c.id === 'compensation')?.ok).toBe(false);
  });

  it('ist gefährdet bei zu vielen ungenügenden Noten – trotz genügend Plus-Punkten', () => {
    const r = evaluatePromotion(input(6, 6, 6, 6, 3.5, 3.5, 3.5, 3.5), ZH_GYM_RULES);
    expect(r.insufficientCount).toBe(4);
    expect(r.balance).toBeGreaterThan(0);
    expect(r.status).toBe('failed');
  });

  it('zeigt Gelb, wenn das Maximum an ungenügenden Noten erreicht ist', () => {
    const r = evaluatePromotion(input(6, 6, 6, 6, 3.5, 3.5, 3.5), ZH_GYM_RULES);
    expect(r.insufficientCount).toBe(3);
    expect(r.status).toBe('tight');
  });

  it('rechnet mit gerundeten Zeugnisnoten', () => {
    // 3.76 → 4 (genügend), 4.74 → 4.5
    const r = evaluatePromotion(input(3.76, 4.74), ZH_GYM_RULES);
    expect(r.subjects.map((s) => s.grade)).toEqual([4, 4.5]);
    expect(r.insufficientCount).toBe(0);
    // 3.74 → 3.5 (ungenügend)
    expect(evaluatePromotion(input(3.74), ZH_GYM_RULES).insufficientCount).toBe(1);
  });

  it('zählt Fächer ohne Note nicht, listet sie aber', () => {
    const r = evaluatePromotion(input(5, null), ZH_GYM_RULES);
    expect(r.subjects).toHaveLength(1);
    expect(r.missing).toEqual(['Fach 2']);
  });

  it('meldet «leer» ohne Noten', () => {
    expect(evaluatePromotion(input(null, null), ZH_GYM_RULES).status).toBe('empty');
    expect(evaluatePromotion([], ZH_GYM_RULES).status).toBe('empty');
  });

  it('unterstützt einfache und keine Kompensation', () => {
    const single: PromotionRules = { ...ZH_GYM_RULES, presetId: 'custom', compensationFactor: 1 };
    expect(evaluatePromotion(input(5, 3), single)).toMatchObject({ balance: 0, status: 'tight' });
    const none: PromotionRules = { ...ZH_GYM_RULES, presetId: 'custom', compensationFactor: 0 };
    const r = evaluatePromotion(input(4.5, 2), none);
    expect(r.checks.map((c) => c.id)).toEqual(['insufficient']);
    expect(r.status).toBe('promoted'); // 1 ungenügende Note bei höchstens 3, keine Kompensationsregel
  });

  it('prüft optional einen Mindestschnitt', () => {
    const rules: PromotionRules = { ...ZH_GYM_RULES, presetId: 'custom', minAverage: 4.5 };
    expect(evaluatePromotion(input(4, 5), rules).checks.find((c) => c.id === 'average')?.ok).toBe(true);
    expect(evaluatePromotion(input(4, 4.5), rules).status).toBe('failed');
  });

  it('formuliert die Reserve', () => {
    expect(formatReserve(1.5)).toBe('+1.5 Punkte Reserve');
    expect(formatReserve(1)).toBe('+1 Punkt Reserve');
    expect(formatReserve(0)).toBe('+0 Punkte Reserve');
    expect(formatReserve(-0.5)).toBe('0.5 Punkte fehlen');
  });
});
