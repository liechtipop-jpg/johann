import { db } from '@/db/db';
import type { Exam } from '@/db/schemas';
import { canShareFiles, downloadFile, shareFile } from '@/lib/share';
import { toast } from '@/ui/toast';
import { buildIcs, icsFileName } from './logic/ics';

/** Prüfungen als .ics teilen (Handy: direkt in den Kalender) oder herunterladen. */
export async function exportExamsIcs(exams: Exam[], label: string): Promise<void> {
  if (exams.length === 0) {
    toast('Keine Prüfungen zum Exportieren.');
    return;
  }
  const subjects = new Map((await db.subjects.toArray()).map((s) => [s.id, s.name]));
  const ics = buildIcs(exams.map((exam) => ({ exam, subjectName: subjects.get(exam.subjectId) ?? 'Prüfung' })));
  const file = new File([ics], icsFileName(label), { type: 'text/calendar' });
  if (canShareFiles()) {
    const result = await shareFile(file, label);
    if (result !== 'failed') return;
  }
  downloadFile(file);
  toast(`${file.name} gespeichert – öffne die Datei, um die Termine in deinen Kalender zu übernehmen.`, {
    tone: 'success',
    duration: 6000,
  });
}
