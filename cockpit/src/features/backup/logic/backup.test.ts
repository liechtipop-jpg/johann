import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { CockpitDB } from '@/db/db';
import type { Grade, Subject } from '@/db/schemas';
import { setSetting } from '@/db/settings';
import { BACKUP_FORMAT, clearAllData, createBackup, parseBackup, restoreBackup, type BackupMigration } from './backup';

let database: CockpitDB | undefined;
afterEach(async () => {
  database?.close();
  if (database) await database.delete();
});

function freshDb() {
  database = new CockpitDB(`test-${Math.random()}`);
  return database;
}

const subject: Subject = { id: 's1', name: 'Mathematik', color: 'teal', isPromotion: true, order: 0, archived: false, createdAt: 1 };
const grade: Grade = {
  id: 'g1',
  subjectId: 's1',
  semesterId: 'sem1',
  value: 5.5,
  weight: 2,
  date: '2026-10-01',
  title: 'Funktionen',
  createdAt: 1,
};

async function seed(db: CockpitDB) {
  await db.subjects.add(subject);
  await db.semesters.add({ id: 'sem1', name: 'HS 2026/27', start: '2026-08-17', end: '2027-01-31', createdAt: 1 });
  await db.grades.add(grade);
  await db.ratings.put({ optionId: 'o1', criterionId: 'c1', score: 8 });
  await setSetting('profile', { name: 'Johann' }, db);
  await db.kv.put({ key: 'demoSnapshot', value: { geheim: true } });
}

describe('Backup', () => {
  it('exportiert alle Tabellen und lässt sich verlustfrei wieder einlesen', async () => {
    const source = freshDb();
    await seed(source);
    const backup = await createBackup(source, '1.0.0', new Date('2026-11-04T10:00:00Z'));
    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.exportedAt).toBe('2026-11-04T10:00:00.000Z');

    // Über JSON wie beim echten Teilen/Herunterladen
    const parsed = parseBackup(JSON.parse(JSON.stringify(backup)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    await clearAllData(source);
    expect(await source.grades.count()).toBe(0);
    await restoreBackup(source, parsed.backup);
    expect(await source.subjects.get('s1')).toEqual(subject);
    expect(await source.grades.get('g1')).toEqual(grade);
    expect((await source.ratings.get(['o1', 'c1']))?.score).toBe(8);
    expect((await source.kv.get('profile'))?.value).toEqual({ name: 'Johann' });
  });

  it('exportiert keine internen Schlüssel und behält sie beim Import', async () => {
    const db = freshDb();
    await seed(db);
    const backup = await createBackup(db, 'test');
    expect((backup.tables.kv as Array<{ key: string }>).map((r) => r.key)).not.toContain('demoSnapshot');
    await restoreBackup(db, backup);
    expect(await db.kv.get('demoSnapshot')).toBeDefined();
  });

  it('ersetzt beim Import alle bestehenden Daten', async () => {
    const db = freshDb();
    await seed(db);
    const backup = await createBackup(db, 'test');
    await db.grades.add({ ...grade, id: 'g2' });
    await restoreBackup(db, backup);
    expect(await db.grades.count()).toBe(1);
  });

  it('lehnt fremde Dateien ab', () => {
    expect(parseBackup({ hello: 'world' })).toEqual({ ok: false, error: 'Das ist keine Cockpit-Sicherung.' });
    expect(parseBackup(null).ok).toBe(false);
    expect(parseBackup('text').ok).toBe(false);
  });

  it('lehnt Sicherungen aus neueren App-Versionen ab', () => {
    const result = parseBackup({ format: BACKUP_FORMAT, schemaVersion: 99, exportedAt: '', tables: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/neueren Version/);
  });

  it('meldet ungültige Einträge mit Tabelle und Nummer', () => {
    const result = parseBackup({
      format: BACKUP_FORMAT,
      schemaVersion: 1,
      exportedAt: '2026-11-04T10:00:00Z',
      tables: { grades: [grade, { ...grade, id: 'g2', value: 7 }] },
    });
    expect(result).toEqual({ ok: false, error: 'Die Sicherung enthält einen ungültigen Eintrag bei «Noten» (Nr. 2).' });
  });

  it('ergänzt fehlende Tabellen als leer', () => {
    const result = parseBackup({ format: BACKUP_FORMAT, schemaVersion: 1, exportedAt: 'x', tables: { subjects: [subject] } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.tables.subjects).toHaveLength(1);
      expect(result.backup.tables.grades).toEqual([]);
    }
  });

  it('migriert ältere Sicherungen Schritt für Schritt', () => {
    // Fiktive Version 2: Fächer hiessen früher «title» statt «name».
    const migrations: Record<number, BackupMigration> = {
      1: (tables) => ({
        ...tables,
        subjects: (tables.subjects ?? []).map((row) => {
          const { title, ...rest } = row as { title: string };
          return { ...rest, name: title };
        }),
      }),
    };
    const { name, ...oldSubject } = subject;
    const result = parseBackup(
      { format: BACKUP_FORMAT, schemaVersion: 1, exportedAt: 'x', tables: { subjects: [{ ...oldSubject, title: name }] } },
      { currentVersion: 2, migrations },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.schemaVersion).toBe(2);
      expect(result.backup.tables.subjects).toEqual([subject]);
    }
  });

  it('meldet eine fehlende Migration', () => {
    const result = parseBackup(
      { format: BACKUP_FORMAT, schemaVersion: 1, exportedAt: 'x', tables: {} },
      { currentVersion: 2, migrations: {} },
    );
    expect(result.ok).toBe(false);
  });
});
