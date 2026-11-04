const scoreFormat = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Punktzahl mit einer Nachkommastelle: 7.6 */
export function formatScore(n: number): string {
  return scoreFormat.format(n);
}

export const EVENT_KIND_LABELS = { deadline: 'Frist', infoday: 'Infotag', other: 'Termin' } as const;
