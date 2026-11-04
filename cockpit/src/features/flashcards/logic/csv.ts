/** Einfacher CSV-Leser für Karteikarten (z. B. Quizlet-Export: Tab zwischen Begriff und Definition, neue Zeile pro Karte). */

export type FieldDelimiter = '\t' | ';' | ',';
export type RowDelimiter = '\n' | ';';

export function detectDelimiter(text: string): FieldDelimiter {
  const sample = text.split(/\r?\n/).slice(0, 20).join('\n');
  const count = (ch: string) => sample.split(ch).length - 1;
  if (count('\t') > 0) return '\t';
  return count(';') >= count(',') && count(';') > 0 ? ';' : ',';
}

/** Zerlegt Text in Zeilen und Felder; Anführungszeichen ("…", "" für ") werden unterstützt. */
export function parseDelimited(text: string, field: FieldDelimiter, row: RowDelimiter = '\n'): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell.trim() === '') {
      quoted = true;
      cell = '';
    } else if (ch === field) {
      current.push(cell);
      cell = '';
    } else if ((row === '\n' && (ch === '\n' || ch === '\r')) || (row === ';' && ch === ';')) {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      current.push(cell);
      rows.push(current);
      current = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || current.length > 0) {
    current.push(cell);
    rows.push(current);
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ''));
}

const HEADER_WORDS =
  /^(front|back|term|definition|vorderseite|rückseite|rueckseite|begriff|wort|bedeutung|frage|antwort|beispiel|example|deutsch|französisch|englisch)$/i;

export function looksLikeHeader(row: readonly string[]): boolean {
  return row.length >= 2 && row.slice(0, 2).every((c) => HEADER_WORDS.test(c.trim()));
}

export interface CardDraft {
  front: string;
  back: string;
  example?: string;
}

/** Zeilen in Karten umwandeln; Zeilen ohne Vorder- oder Rückseite werden übersprungen. */
export function rowsToCards(
  rows: readonly string[][],
  map: { front: number; back: number; example?: number },
  skipHeader = false,
): { cards: CardDraft[]; skipped: number } {
  const cards: CardDraft[] = [];
  let skipped = 0;
  rows.forEach((row, index) => {
    if (skipHeader && index === 0) return;
    const front = (row[map.front] ?? '').slice(0, 1000);
    const back = (row[map.back] ?? '').slice(0, 1000);
    if (!front || !back) {
      skipped++;
      return;
    }
    const example = map.example !== undefined ? (row[map.example] ?? '').slice(0, 1000) : '';
    cards.push(example ? { front, back, example } : { front, back });
  });
  return { cards, skipped };
}
