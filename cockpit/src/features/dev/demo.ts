import type { CockpitDB } from '@/db/db';
import { getSetting, patchSetting } from '@/db/settings';
import { clearAllData, createBackup, parseBackup, restoreBackup } from '@/features/backup/logic/backup';
import { todayISO } from '@/lib/dates';
import { buildDemoData } from './demoData';

const SNAPSHOT_KEY = 'demoSnapshot';

/** Sichert die eigenen Daten und ersetzt sie durch Demo-Daten. */
export async function enableDemo(db: CockpitDB): Promise<void> {
  const snapshot = await createBackup(db, __APP_VERSION__);
  const { theme } = await getSetting('appearance', db);
  const data = buildDemoData(todayISO(), Date.now(), theme);
  await db.transaction('rw', db.tables, async () => {
    await clearAllData(db);
    await db.kv.put({ key: SNAPSHOT_KEY, value: snapshot });
    await db.kv.bulkPut(data.kv);
    await db.subjects.bulkPut(data.subjects);
    await db.semesters.bulkPut(data.semesters);
    await db.grades.bulkPut(data.grades);
    await db.exams.bulkPut(data.exams);
    await db.tasks.bulkPut(data.tasks);
    await db.countdowns.bulkPut(data.countdowns);
    await db.studySessions.bulkPut(data.studySessions);
    await db.decks.bulkPut(data.decks);
    await db.cards.bulkPut(data.cards);
    await db.cardStates.bulkPut(data.cardStates);
    await db.reviewLogs.bulkPut(data.reviewLogs);
    await db.pieces.bulkPut(data.pieces);
    await db.practiceLogs.bulkPut(data.practiceLogs);
    await db.focusSessions.bulkPut(data.focusSessions);
  });
}

/** Stellt die eigenen Daten von vor den Demo-Daten wieder her. */
export async function disableDemo(db: CockpitDB): Promise<void> {
  const row = await db.kv.get(SNAPSHOT_KEY);
  const parsed = row ? parseBackup(row.value) : null;
  await db.transaction('rw', db.tables, async () => {
    if (parsed?.ok) await restoreBackup(db, parsed.backup);
    else await clearAllData(db);
    await db.kv.delete(SNAPSHOT_KEY);
    await patchSetting('dev', { enabled: true, demoActive: false }, db);
  });
}
