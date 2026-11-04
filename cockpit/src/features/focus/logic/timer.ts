/**
 * Fokus-Timer als Zustandsmaschine. Alle Zeiten kommen aus Zeitstempeln – auch wenn
 * die App im Hintergrund war oder neu geladen wurde, stimmt die Restzeit.
 */
import { elapsedMs, pauseWatch, resumeWatch, startWatch, type StopwatchFields } from '@/lib/stopwatch';

export interface FocusPrefs {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  /** Lange Pause nach jeder n-ten Fokusrunde */
  longEvery: number;
  /** Pause startet direkt nach der Fokusrunde */
  autoStartBreaks: boolean;
}

export const DEFAULT_FOCUS_PREFS: FocusPrefs = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longEvery: 4,
  autoStartBreaks: true,
};

export type Phase = 'focus' | 'short' | 'long' | 'segment';
export type Template = 'pomodoro' | 'fce';

export interface Segment {
  name: string;
  minutes: number;
  hint?: string;
}

/** B2 First (FCE): Dauer der Prüfungsteile laut Cambridge English. */
export const FCE_SEGMENTS: Segment[] = [
  { name: 'Reading & Use of English', minutes: 75 },
  { name: 'Writing', minutes: 80 },
  { name: 'Listening', minutes: 40, hint: 'ca. 40 Minuten' },
  { name: 'Speaking', minutes: 14, hint: '14 Minuten pro Paar' },
];
export const FCE_SOURCE = 'https://www.cambridgeenglish.org/exams-and-tests/qualifications/first/format/';

export interface TimerState extends StopwatchFields {
  template: Template;
  phase: Phase;
  /** Geplante Dauer der laufenden Phase (wird beim Start festgelegt) */
  plannedMs: number;
  /** Abgeschlossene Fokusrunden seit der letzten langen Pause */
  completedFocus: number;
  segmentIndex: number;
  subjectId?: string;
  examId?: string;
}

export interface FocusRecord {
  kind: 'pomodoro' | 'fce';
  startedAt: number;
  endedAt: number;
  focusSeconds: number;
  label?: string;
  subjectId?: string;
  examId?: string;
}

export interface Transition {
  next: TimerState;
  record?: FocusRecord;
  /** Die Phase ist regulär abgelaufen (für Ton/Vibration) */
  finished?: Phase;
}

const MIN = 60_000;
/** Kürzere Fokuszeiten werden nicht gespeichert. */
export const MIN_RECORD_MS = MIN;

export function isFocusPhase(phase: Phase): boolean {
  return phase === 'focus' || phase === 'segment';
}

export function phaseLabel(s: Pick<TimerState, 'phase' | 'segmentIndex'>): string {
  if (s.phase === 'segment') return FCE_SEGMENTS[s.segmentIndex]?.name ?? 'Prüfungsteil';
  if (s.phase === 'short') return 'Kurze Pause';
  if (s.phase === 'long') return 'Lange Pause';
  return 'Fokus';
}

export function phaseMinutes(s: Pick<TimerState, 'phase' | 'segmentIndex'>, prefs: FocusPrefs): number {
  if (s.phase === 'segment') return FCE_SEGMENTS[s.segmentIndex]?.minutes ?? 0;
  if (s.phase === 'short') return prefs.shortBreakMinutes;
  if (s.phase === 'long') return prefs.longBreakMinutes;
  return prefs.focusMinutes;
}

function linkOf(s: Pick<TimerState, 'subjectId' | 'examId'>) {
  return { subjectId: s.subjectId, examId: s.examId };
}

export function idleTimer(template: Template = 'pomodoro', link: Pick<TimerState, 'subjectId' | 'examId'> = {}): TimerState {
  return {
    status: 'idle',
    template,
    phase: template === 'fce' ? 'segment' : 'focus',
    plannedMs: 0,
    startedAt: null,
    pausedAt: null,
    pausedMs: 0,
    completedFocus: 0,
    segmentIndex: 0,
    ...linkOf(link),
  };
}

/** Dauer der aktuellen Phase – im Leerlauf immer nach den aktuellen Einstellungen. */
export function plannedMs(s: TimerState, prefs: FocusPrefs): number {
  return s.status === 'idle' ? phaseMinutes(s, prefs) * MIN : s.plannedMs;
}

export function remainingMs(s: TimerState, prefs: FocusPrefs, now: number): number {
  return Math.max(0, plannedMs(s, prefs) - elapsedMs(s, now));
}

/** Fortschritt der Phase von 0 bis 1. */
export function progress(s: TimerState, prefs: FocusPrefs, now: number): number {
  const planned = plannedMs(s, prefs);
  return planned > 0 ? Math.min(1, elapsedMs(s, now) / planned) : 0;
}

/** Zeitpunkt, an dem die laufende Phase endet (null, wenn nicht laufend). */
export function endsAt(s: TimerState): number | null {
  return s.status === 'running' && s.startedAt !== null ? s.startedAt + s.pausedMs + s.plannedMs : null;
}

export function start(s: TimerState, prefs: FocusPrefs, now: number): TimerState {
  if (s.status === 'idle') return { ...startWatch(s, now), plannedMs: phaseMinutes(s, prefs) * MIN };
  return startWatch(s, now);
}

export function pause(s: TimerState, now: number): TimerState {
  return pauseWatch(s, now);
}

export function resume(s: TimerState, now: number): TimerState {
  return resumeWatch(s, now);
}

/** Vorlage oder Verknüpfung ändern. Die Vorlage nur im Leerlauf, die Verknüpfung jederzeit. */
export function configure(s: TimerState, change: { template?: Template; subjectId?: string | null; examId?: string | null }): TimerState {
  const link = {
    subjectId: change.subjectId === undefined ? s.subjectId : (change.subjectId ?? undefined),
    examId: change.examId === undefined ? s.examId : (change.examId ?? undefined),
  };
  if (change.template && change.template !== s.template && s.status === 'idle') return idleTimer(change.template, link);
  return { ...s, ...link };
}

function makeRecord(s: TimerState, focusMs: number, endedAt: number): FocusRecord | undefined {
  if (s.startedAt === null || focusMs < MIN_RECORD_MS || !isFocusPhase(s.phase)) return undefined;
  return {
    kind: s.template,
    startedAt: s.startedAt,
    endedAt,
    focusSeconds: Math.round(focusMs / 1000),
    label: s.phase === 'segment' ? `B2 First – ${FCE_SEGMENTS[s.segmentIndex]?.name ?? ''}` : undefined,
    ...linkOf(s),
  };
}

/** Nächste Phase. `at` = Ende der vorherigen Phase (für den automatischen Pausenstart). */
function advance(s: TimerState, prefs: FocusPrefs, at: number): TimerState {
  const base: TimerState = { ...s, status: 'idle', startedAt: null, pausedAt: null, pausedMs: 0, plannedMs: 0 };
  if (s.template === 'fce') {
    const segmentIndex = s.segmentIndex + 1;
    if (segmentIndex >= FCE_SEGMENTS.length) return idleTimer('fce', s);
    return { ...base, phase: 'segment', segmentIndex };
  }
  if (s.phase === 'focus') {
    const completedFocus = s.completedFocus + 1;
    const phase: Phase = completedFocus % Math.max(1, prefs.longEvery) === 0 ? 'long' : 'short';
    const brk: TimerState = { ...base, phase, completedFocus };
    return prefs.autoStartBreaks ? start(brk, prefs, at) : brk;
  }
  return { ...base, phase: 'focus', completedFocus: s.phase === 'long' ? 0 : s.completedFocus };
}

/** Ist die laufende Phase abgelaufen? Dann mit dem echten Endzeitpunkt weiterschalten. */
export function tick(s: TimerState, prefs: FocusPrefs, now: number): Transition | null {
  const end = endsAt(s);
  if (end === null || now < end) return null;
  return { next: advance(s, prefs, end), record: makeRecord(s, s.plannedMs, end), finished: s.phase };
}

/** Holt alle verpassten Wechsel nach (z. B. Fokus und Pause sind beide abgelaufen). */
export function catchUp(s: TimerState, prefs: FocusPrefs, now: number): { next: TimerState; records: FocusRecord[]; finished: Phase[] } {
  const records: FocusRecord[] = [];
  const finished: Phase[] = [];
  let state = s;
  for (let i = 0; i < 20; i++) {
    const t = tick(state, prefs, now);
    if (!t) break;
    if (t.record) records.push(t.record);
    if (t.finished) finished.push(t.finished);
    state = t.next;
  }
  return { next: state, records, finished };
}

/** Phase vorzeitig beenden (Fokuszeit ab einer Minute zählt) bzw. Pause überspringen. */
export function finishEarly(s: TimerState, prefs: FocusPrefs, now: number): Transition {
  const end = s.status === 'paused' && s.pausedAt !== null ? s.pausedAt : now;
  if (s.status === 'idle') return { next: advance(s, prefs, end) };
  return { next: advance(s, prefs, end), record: makeRecord(s, elapsedMs(s, now), end) };
}

/** Ganz aufhören: speichert die angefangene Fokuszeit und setzt die Vorlage zurück. */
export function stop(s: TimerState, now: number): Transition {
  const end = s.status === 'paused' && s.pausedAt !== null ? s.pausedAt : now;
  return { next: idleTimer(s.template, s), record: s.status === 'idle' ? undefined : makeRecord(s, elapsedMs(s, now), end) };
}
