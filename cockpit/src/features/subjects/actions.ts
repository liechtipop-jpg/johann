import { db } from '@/db/db';
import type { Semester, Subject } from '@/db/schemas';
import { newId } from '@/lib/ids';
import { plural } from '@/lib/format';
import { pickColor } from '@/ui/subject';
import { toastUndo } from '@/ui/toast';
import { SUBJECT_SUGGESTIONS } from './suggestions';

export async function createSubject(name: string): Promise<Subject> {
  const all = await db.subjects.toArray();
  const suggestion = SUBJECT_SUGGESTIONS.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
  const subject: Subject = {
    id: newId(),
    name: name.trim(),
    color: pickColor(
      all.filter((s) => !s.archived).map((s) => s.color),
      suggestion?.color,
    ),
    isPromotion: true,
    order: all.reduce((max, s) => Math.max(max, s.order), -1) + 1,
    archived: false,
    createdAt: Date.now(),
  };
  await db.subjects.add(subject);
  return subject;
}

export async function reorderSubjects(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.subjects, async () => {
    for (const [index, id] of orderedIds.entries()) {
      await db.subjects.update(id, { order: index });
    }
  });
}

const subjectTables = () => [db.subjects, db.grades, db.exams, db.studySessions, db.tasks, db.decks, db.focusSessions];

/** Löscht ein Fach samt Noten und Prüfungen; Aufgaben, Decks und Fokuszeiten bleiben ohne Fach erhalten. */
export async function deleteSubjectWithUndo(subject: Subject): Promise<void> {
  const snapshot = await db.transaction('rw', subjectTables(), async () => {
    const grades = await db.grades.where('subjectId').equals(subject.id).toArray();
    const exams = await db.exams.where('subjectId').equals(subject.id).toArray();
    const sessions = exams.length
      ? await db.studySessions
          .where('examId')
          .anyOf(exams.map((e) => e.id))
          .toArray()
      : [];
    const tasks = await db.tasks.where('subjectId').equals(subject.id).toArray();
    const decks = await db.decks.where('subjectId').equals(subject.id).toArray();
    const focus = await db.focusSessions.where('subjectId').equals(subject.id).toArray();

    await db.grades.bulkDelete(grades.map((g) => g.id));
    await db.studySessions.bulkDelete(sessions.map((s) => s.id));
    await db.exams.bulkDelete(exams.map((e) => e.id));
    await db.tasks.bulkPut(tasks.map((t) => ({ ...t, subjectId: undefined })));
    await db.decks.bulkPut(decks.map((d) => ({ ...d, subjectId: undefined })));
    await db.focusSessions.bulkPut(focus.map((f) => ({ ...f, subjectId: undefined })));
    await db.subjects.delete(subject.id);
    return { grades, exams, sessions, tasks, decks, focus };
  });

  const extra = snapshot.grades.length ? ` und ${plural(snapshot.grades.length, 'Note', 'Noten')}` : '';
  toastUndo(`«${subject.name}»${extra} gelöscht`, () =>
    db.transaction('rw', subjectTables(), async () => {
      await db.subjects.put(subject);
      await db.grades.bulkPut(snapshot.grades);
      await db.exams.bulkPut(snapshot.exams);
      await db.studySessions.bulkPut(snapshot.sessions);
      await db.tasks.bulkPut(snapshot.tasks);
      await db.decks.bulkPut(snapshot.decks);
      await db.focusSessions.bulkPut(snapshot.focus);
    }),
  );
}

/** Löscht ein Semester samt seinen Noten. */
export async function deleteSemesterWithUndo(semester: Semester): Promise<void> {
  const grades = await db.transaction('rw', db.semesters, db.grades, async () => {
    const rows = await db.grades.where('semesterId').equals(semester.id).toArray();
    await db.grades.bulkDelete(rows.map((g) => g.id));
    await db.semesters.delete(semester.id);
    return rows;
  });
  const extra = grades.length ? ` und ${plural(grades.length, 'Note', 'Noten')}` : '';
  toastUndo(`«${semester.name}»${extra} gelöscht`, () =>
    db.transaction('rw', db.semesters, db.grades, async () => {
      await db.semesters.put(semester);
      await db.grades.bulkPut(grades);
    }),
  );
}
