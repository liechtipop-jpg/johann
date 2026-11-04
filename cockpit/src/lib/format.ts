const gradeFormat = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const averageFormat = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const integerFormat = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 });

/** Liest Zahlen mit Komma oder Punkt («4,5» oder «4.5»). */
export function parseDecimal(input: string): number | null {
  const s = input.trim().replace(/\s+/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Schweizer Note 1–6, höchstens zwei Nachkommastellen. */
export function parseGrade(input: string): number | null {
  const n = parseDecimal(input);
  if (n === null || n < 1 || n > 6) return null;
  return Math.round(n * 100) / 100;
}

/** Gewicht einer Note, z. B. 0.5, 1 oder 2. */
export function parseWeight(input: string): number | null {
  const n = parseDecimal(input);
  if (n === null || n <= 0 || n > 100) return null;
  return Math.round(n * 100) / 100;
}

/** 5 · 4.5 · 4.75 */
export function formatGrade(n: number): string {
  return gradeFormat.format(n);
}

/** Schnitt immer mit zwei Stellen: 4.83 */
export function formatAverage(n: number): string {
  return averageFormat.format(n);
}

export function formatInteger(n: number): string {
  return integerFormat.format(n);
}

/** 45 min · 1 h · 1 h 30 min */
export function formatMinutes(total: number): string {
  const minutes = Math.round(total);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function plural(n: number, one: string, many: string): string {
  return `${formatInteger(n)} ${n === 1 ? one : many}`;
}
