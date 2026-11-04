/** Metronom-Logik (ohne Audio): Taktarten, Unterteilungen, Tempo-Trainer, stumme Takte, Tap-Tempo. */

export interface TimeSignature {
  label: string;
  beats: number;
  /** Notenwert eines Schlags (4 = Viertel, 8 = Achtel) */
  unit: 4 | 8;
  /** Gruppen zusammengesetzter Takte, z. B. 6/8 = 3+3 */
  groups?: number[];
}

export const TIME_SIGNATURES: TimeSignature[] = [
  { label: '2/4', beats: 2, unit: 4 },
  { label: '3/4', beats: 3, unit: 4 },
  { label: '4/4', beats: 4, unit: 4 },
  { label: '5/4', beats: 5, unit: 4 },
  { label: '6/8', beats: 6, unit: 8, groups: [3, 3] },
  { label: '7/8', beats: 7, unit: 8, groups: [2, 2, 3] },
  { label: '9/8', beats: 9, unit: 8, groups: [3, 3, 3] },
  { label: '12/8', beats: 12, unit: 8, groups: [3, 3, 3, 3] },
];

export type Subdivision = 1 | 2 | 3 | 4;
export const SUBDIVISIONS: Array<{ value: Subdivision; label: string }> = [
  { value: 1, label: 'Schläge' },
  { value: 2, label: 'Achtel' },
  { value: 3, label: 'Triolen' },
  { value: 4, label: 'Sechzehntel' },
];

/** accent = Eins, group = Beginn einer Gruppe (z. B. 4 im 6/8), beat = Schlag, sub = Unterteilung */
export type ClickKind = 'accent' | 'group' | 'beat' | 'sub';

export const MIN_BPM = 30;
export const MAX_BPM = 240;

export function clampBpm(bpm: number): number {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

export function signatureByLabel(label: string): TimeSignature {
  return TIME_SIGNATURES.find((s) => s.label === label) ?? TIME_SIGNATURES[2];
}

/** Alle Klicks eines Takts. */
export function barPattern(signature: TimeSignature, subdivision: Subdivision, accentFirst: boolean): ClickKind[] {
  const groupStarts = new Set<number>();
  let position = 0;
  for (const g of signature.groups ?? []) {
    groupStarts.add(position);
    position += g;
  }
  const out: ClickKind[] = [];
  for (let beat = 0; beat < signature.beats; beat++) {
    for (let s = 0; s < subdivision; s++) {
      if (s > 0) out.push('sub');
      else if (beat === 0) out.push(accentFirst ? 'accent' : 'beat');
      else if (groupStarts.has(beat)) out.push('group');
      else out.push('beat');
    }
  }
  return out;
}

/** Abstand zweier Klicks in Sekunden. */
export function clickSeconds(bpm: number, subdivision: Subdivision): number {
  return 60 / bpm / subdivision;
}

export interface TrainerOptions {
  enabled: boolean;
  start: number;
  target: number;
  /** +x BPM … */
  step: number;
  /** … alle n Takte */
  everyBars: number;
}

/** Tempo im Takt `bar` (ab 0) mit dem Tempo-Trainer. */
export function trainerBpm(bar: number, t: TrainerOptions): number {
  const steps = Math.floor(bar / Math.max(1, t.everyBars));
  return t.target >= t.start ? Math.min(t.target, t.start + steps * t.step) : Math.max(t.target, t.start - steps * t.step);
}

export interface GapOptions {
  enabled: boolean;
  /** n Takte hörbar … */
  play: number;
  /** … dann m Takte stumm */
  mute: number;
}

export function isSilentBar(bar: number, gap: GapOptions): boolean {
  if (!gap.enabled || gap.mute <= 0 || gap.play <= 0) return false;
  return bar % (gap.play + gap.mute) >= gap.play;
}

/** Tap-Tempo: Mittelwert der letzten Abstände (höchstens 6 Taps, Neustart nach 2 s Pause). */
export function tapTempo(taps: readonly number[], maxGapMs = 2000): number | null {
  const recent: number[] = [];
  for (let i = taps.length - 1; i >= 0; i--) {
    if (recent.length && recent[0] - taps[i] > maxGapMs) break;
    recent.unshift(taps[i]);
    if (recent.length === 6) break;
  }
  if (recent.length < 2) return null;
  const average = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
  return average > 0 ? clampBpm(60_000 / average) : null;
}
