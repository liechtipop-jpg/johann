/** Normalisiert für die Suche: klein, ohne Akzente (é → e, ü → u). */
export function normalizeSearch(text: string): string {
  return text
    .toLocaleLowerCase('de-CH')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export interface Rankable {
  label: string;
  keywords?: string;
}

/**
 * Filtert und sortiert Befehle: Alle Suchwörter müssen vorkommen.
 * Treffer am Anfang des Namens zuerst, dann Wortanfänge, dann der Rest (sonst stabile Reihenfolge).
 */
export function rankCommands<T extends Rankable>(commands: readonly T[], query: string): T[] {
  const q = normalizeSearch(query.trim());
  if (!q) return [...commands];
  const tokens = q.split(/\s+/);
  const scored: Array<{ item: T; score: number; index: number }> = [];
  commands.forEach((item, index) => {
    const label = normalizeSearch(item.label);
    const haystack = `${label} ${normalizeSearch(item.keywords ?? '')}`;
    if (!tokens.every((t) => haystack.includes(t))) return;
    let score = 0;
    if (label.startsWith(q)) score = 3;
    else if (label.split(/[\s:·-]+/).some((word) => word.startsWith(tokens[0]))) score = 2;
    else if (label.includes(tokens[0])) score = 1;
    scored.push({ item, score, index });
  });
  return scored.sort((a, b) => b.score - a.score || a.index - b.index).map((s) => s.item);
}
