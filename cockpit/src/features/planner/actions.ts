import { db } from '@/db/db';
import type { Exam, StudySession, Task } from '@/db/schemas';
import { getSetting } from '@/db/settings';
import { plural } from '@/lib/format';
import { newId } from '@/lib/ids';
import { todayISO, type ISODate } from '@/lib/dates';
import { toast, toastUndo } from '@/ui/toast';
import { generatePlan, redistributeMissed, type PlanResult } from './logic/studyplan';

/**
 * Erstellt den Lernplan einer Prüfung neu: Erledigte Einheiten bleiben,
 * schon gelernte Minuten werden abgezogen, andere Prüfungen belegen ihre Zeit.
 */
export async function rebuildPlan(examId: string, today: ISODate = todayISO()): Promise<PlanResult | null> {
  const prefs = await getSetting('studyPlan');
  return db.transaction('rw', db.exams, db.studySessions, async () => {
    const exam = await db.exams.get(examId);
    if (!exam) return null;
    const own = await db.studySessions.where('examId').equals(examId).toArray();
    const done = own.filter((s) => s.done);
    const learned = new Map<string, number>();
    for (const s of done) if (s.kind === 'learn' && s.topicId) learned.set(s.topicId, (learned.get(s.topicId) ?? 0) + s.minutes);

    const load: Record<ISODate, number> = {};
    const others = await db.studySessions.where('date').aboveOrEqual(today).toArray();
    for (const s of others) if (s.examId !== examId || s.done) load[s.date] = (load[s.date] ?? 0) + s.minutes;

    const result = generatePlan({
      examDate: exam.date,
      today,
      topics: exam.topics.map((t) => ({ id: t.id, effort: t.effort, minutes: Math.max(0, prefs.effortMinutes[t.effort] - (learned.get(t.id) ?? 0)) })),
      prefs,
      load,
    });
    await db.studySessions.bulkDelete(own.filter((s) => !s.done).map((s) => s.id));
    await db.studySessions.bulkAdd(result.sessions.map((s) => ({ ...s, id: newId(), examId, done: false })));
    return result;
  });
}

/** Meldung nach dem Planen (mit Hinweis auf zu wenig Zeit). */
export function reportPlan(result: PlanResult | null, examTitle: string): void {
  if (!result) return;
  if (result.availableDays === 0) {
    toast(`Für «${examTitle}» bleiben keine Lerntage mehr.`);
  } else if (result.overflowMinutes > 0) {
    toast(`Lernplan erstellt – ${result.overflowMinutes} min passen nicht mehr hinein. Erhöhe die Lernzeit pro Tag in den Einstellungen.`, {
      duration: 7000,
    });
  } else if (result.sessions.length > 0) {
    toast(`Lernplan für «${examTitle}»: ${plural(result.sessions.length, 'Einheit', 'Einheiten')}`, { tone: 'success' });
  }
}

/** «Verpasstes neu verteilen» für alle Prüfungen – mit Rückgängig. */
export async function redistributeAll(today: ISODate = todayISO()): Promise<void> {
  const prefs = await getSetting('studyPlan');
  const before = await db.studySessions.toArray();
  const exams = await db.exams.toArray();
  const result = redistributeMissed({ sessions: before, examDates: new Map(exams.map((e) => [e.id, e.date])), today, prefs });
  await db.transaction('rw', db.studySessions, async () => {
    for (const { id, date } of result.moved) await db.studySessions.update(id, { date });
    await db.studySessions.bulkDelete(result.obsolete);
  });
  const parts = [`${plural(result.moved.length, 'Einheit', 'Einheiten')} neu verteilt`];
  if (result.unplaced.length) parts.push(`${result.unplaced.length} passen nicht mehr`);
  toastUndo(parts.join(', '), () =>
    db.transaction('rw', db.studySessions, async () => {
      await db.studySessions.clear();
      await db.studySessions.bulkPut(before);
    }),
  );
}

export function setTaskDone(task: Task, done: boolean) {
  return db.tasks.update(task.id, { done, doneAt: done ? Date.now() : undefined });
}

export function setSessionDone(session: StudySession, done: boolean) {
  return db.studySessions.update(session.id, { done, doneAt: done ? Date.now() : undefined });
}

/** Löscht eine Prüfung samt Lernplan – mit Rückgängig. */
export async function deleteExamWithUndo(exam: Exam): Promise<void> {
  const sessions = await db.transaction('rw', db.exams, db.studySessions, async () => {
    const rows = await db.studySessions.where('examId').equals(exam.id).toArray();
    await db.studySessions.bulkDelete(rows.map((s) => s.id));
    await db.exams.delete(exam.id);
    return rows;
  });
  toastUndo(`Prüfung «${exam.title}» gelöscht`, () =>
    db.transaction('rw', db.exams, db.studySessions, async () => {
      await db.exams.put(exam);
      await db.studySessions.bulkPut(sessions);
    }),
  );
}
