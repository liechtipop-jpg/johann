import { db } from '@/db/db';
import type { FocusSession } from '@/db/schemas';
import { getSetting, setSetting } from '@/db/settings';
import { toISODate } from '@/lib/dates';
import { newId } from '@/lib/ids';
import {
  catchUp,
  configure,
  finishEarly,
  pause,
  resume,
  start,
  stop,
  type FocusPrefs,
  type FocusRecord,
  type Phase,
  type Template,
  type TimerState,
} from './logic/timer';

export function toSession(record: FocusRecord): FocusSession {
  return {
    id: newId(),
    kind: record.kind,
    subjectId: record.subjectId,
    examId: record.examId,
    label: record.label,
    date: toISODate(new Date(record.startedAt)),
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    focusSeconds: record.focusSeconds,
  };
}

export interface FocusUpdate {
  next: TimerState;
  sessions: FocusSession[];
  finished: Phase[];
}

/**
 * Ändert den Timer in einer Transaktion: zuerst verpasste Wechsel nachholen, dann die Aktion.
 * So entstehen auch bei zwei offenen Tabs keine doppelten Einträge.
 */
async function mutate(
  action?: (s: TimerState, prefs: FocusPrefs, now: number) => { next: TimerState; record?: FocusRecord },
): Promise<FocusUpdate> {
  return db.transaction('rw', db.kv, db.focusSessions, async () => {
    const [state, prefs] = await Promise.all([getSetting('focusTimer'), getSetting('focus')]);
    const now = Date.now();
    const caught = catchUp(state, prefs, now);
    const records = [...caught.records];
    let next = caught.next;
    if (action) {
      const result = action(next, prefs, now);
      next = result.next;
      if (result.record) records.push(result.record);
    }
    const sessions = records.map(toSession);
    if (sessions.length) await db.focusSessions.bulkAdd(sessions);
    if (next !== state) await setSetting('focusTimer', next);
    return { next, sessions, finished: caught.finished };
  });
}

export const syncFocusTimer = () => mutate();
export const startFocus = () => mutate((s, prefs, now) => ({ next: start(s, prefs, now) }));
export const pauseFocus = () => mutate((s, _prefs, now) => ({ next: pause(s, now) }));
export const resumeFocus = () => mutate((s, _prefs, now) => ({ next: resume(s, now) }));
export const finishFocusEarly = () => mutate((s, prefs, now) => finishEarly(s, prefs, now));
export const stopFocus = () => mutate((s, _prefs, now) => stop(s, now));
export const configureFocus = (change: { template?: Template; subjectId?: string | null; examId?: string | null }) =>
  mutate((s) => ({ next: configure(s, change) }));
