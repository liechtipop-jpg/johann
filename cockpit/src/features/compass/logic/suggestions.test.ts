import { describe, expect, it } from 'vitest';
import { timelineEventSchema } from '@/db/schemas';
import { CRITERION_SUGGESTIONS, nextOccurrence, OPTION_SUGGESTIONS, timelineSuggestions } from '../suggestions';

describe('Kompass-Vorschläge', () => {
  it('berechnet den nächsten jährlichen Termin', () => {
    expect(nextOccurrence(4, 30, '2026-11-04')).toBe('2027-04-30');
    expect(nextOccurrence(4, 30, '2027-04-30')).toBe('2027-04-30');
    expect(nextOccurrence(4, 30, '2027-01-10')).toBe('2027-04-30');
  });

  it('liefert nur Termine mit offiziellem Link und gültigem Schema', () => {
    for (const today of ['2026-11-04', '2027-10-01']) {
      for (const { optionKey, ...event } of timelineSuggestions(today)) {
        expect(event.url).toMatch(/^https:\/\/(www\.)?(ethz\.ch|uzh\.ch|mnf\.uzh\.ch|unisg\.ch|msande\.stanford\.edu)\//);
        expect(timelineEventSchema.safeParse({ ...event, id: 'x' }).success).toBe(true);
        if (event.date) expect(event.date >= today).toBe(true);
        if (optionKey) expect(OPTION_SUGGESTIONS.some((o) => o.key === optionKey)).toBe(true);
      }
    }
    // Nach den Infotagen 2027 bleibt das Datum leer statt geraten
    expect(timelineSuggestions('2027-10-01').find((e) => e.title.includes('Studieninformationstage'))?.date).toBeUndefined();
  });

  it('enthält die Optionen und Kriterien aus der Vorgabe (ohne Kosten)', () => {
    expect(OPTION_SUGGESTIONS).toHaveLength(6);
    expect(CRITERION_SUGGESTIONS).toHaveLength(10);
    expect(CRITERION_SUGGESTIONS.some((c) => /kosten/i.test(c))).toBe(false);
  });
});
