/**
 * Promotionsregeln. Standard: Promotionsreglement für die Gymnasien des Kantons Zürich
 * (LS 413.251.1). Konnte nicht am Originaltext verifiziert werden → als «bitte prüfen» markiert.
 */
export interface PromotionRules {
  presetId: 'zh-gym' | 'custom';
  /** Ab dieser Note genügend. */
  passMark: number;
  /** Rundung der Zeugnisnote: 0.5 = halbe Noten, 0 = nicht runden. */
  roundingStep: number;
  /** Höchstens so viele ungenügende Noten. */
  maxInsufficient: number;
  /** 2 = doppelte Kompensation, 1 = einfache, 0 = keine Kompensationsregel. */
  compensationFactor: number;
  /** Optionaler Mindestschnitt aller Promotionsnoten. */
  minAverage: number | null;
  /** Unter dieser Reserve (Punkte) zeigt die Ampel Gelb. */
  warnReserve: number;
}

export const ZH_GYM_RULES: PromotionRules = {
  presetId: 'zh-gym',
  passMark: 4,
  roundingStep: 0.5,
  maxInsufficient: 3,
  compensationFactor: 2,
  minAverage: null,
  warnReserve: 1,
};

export const PROMOTION_SOURCE = {
  label: 'Promotionsreglement für die Gymnasien des Kantons Zürich (LS 413.251.1)',
  url: 'http://www.zhlex.zh.ch/Erlass.html?Ordnr=413.251.1',
  /** false → in der App sichtbar als «bitte mit dem Reglement deiner Schule prüfen». */
  verified: false,
} as const;

export const ROUNDING_OPTIONS = [
  { value: 0.5, label: 'Halbe Noten', phrase: 'halbe Noten' },
  { value: 0.25, label: 'Viertelnoten', phrase: 'Viertelnoten' },
  { value: 0.1, label: 'Zehntelnoten', phrase: 'Zehntelnoten' },
  { value: 0, label: 'Nicht runden', phrase: 'nicht gerundet' },
] as const;

/** «halbe Noten», «Viertelnoten» … für Sätze wie «gerundet auf halbe Noten». */
export function roundingPhrase(step: number): string {
  return ROUNDING_OPTIONS.find((o) => o.value === step)?.phrase ?? `${step}er-Schritte`;
}

export const COMPENSATION_OPTIONS = [
  { value: 2, label: 'Doppelt' },
  { value: 1, label: 'Einfach' },
  { value: 0, label: 'Keine' },
] as const;

export function rulesEqual(a: PromotionRules, b: PromotionRules): boolean {
  return (
    a.passMark === b.passMark &&
    a.roundingStep === b.roundingStep &&
    a.maxInsufficient === b.maxInsufficient &&
    a.compensationFactor === b.compensationFactor &&
    a.minAverage === b.minAverage &&
    a.warnReserve === b.warnReserve
  );
}

/** Regeln in Alltagssprache (für Onboarding und Einstellungen). */
export function describeRules(rules: PromotionRules): string[] {
  const lines: string[] = [];
  lines.push(
    rules.roundingStep > 0
      ? `Zeugnisnoten werden auf ${roundingPhrase(rules.roundingStep)} gerundet.`
      : 'Zeugnisnoten werden nicht gerundet.',
  );
  lines.push(
    `Höchstens ${rules.maxInsufficient} ungenügende ${rules.maxInsufficient === 1 ? 'Note' : 'Noten'} (unter ${rules.passMark}) in den Promotionsfächern.`,
  );
  if (rules.compensationFactor === 2) {
    lines.push(
      `Doppelte Kompensation: Die Punkte über ${rules.passMark} müssen mindestens doppelt so gross sein wie die Punkte unter ${rules.passMark}.`,
    );
  } else if (rules.compensationFactor === 1) {
    lines.push(
      `Einfache Kompensation: Die Punkte über ${rules.passMark} müssen die Punkte unter ${rules.passMark} mindestens ausgleichen.`,
    );
  }
  if (rules.minAverage !== null) {
    lines.push(`Der Schnitt der Promotionsnoten muss mindestens ${rules.minAverage} betragen.`);
  }
  return lines;
}
