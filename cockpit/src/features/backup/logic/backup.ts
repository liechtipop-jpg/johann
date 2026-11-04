import { z } from 'zod';
import type { CockpitDB } from '@/db/db';
import { SCHEMA_VERSION } from '@/db/schema';
import { INTERNAL_KV_KEYS } from '@/db/settings';
import { TABLE_LABELS, TABLE_NAMES, TABLE_SCHEMAS, type KvRow, type TableName } from '@/db/schemas';
import { toISODate } from '@/lib/dates';

export const BACKUP_FORMAT = 'cockpit-backup';

export interface Backup {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  tables: Record<TableName, unknown[]>;
}

/** Eine geprüfte Sicherung: alle Zeilen passen zum aktuellen Schema. */
export type ValidBackup = Backup & { readonly __valid: true };

/** Migriert die Tabellen einer Sicherung von Version n auf n + 1. */
export type BackupMigration = (tables: Record<string, unknown[]>) => Record<string, unknown[]>;

/** BACKUP_MIGRATIONS[n] hebt eine Sicherung von Schema-Version n auf n + 1. */
export const BACKUP_MIGRATIONS: Record<number, BackupMigration> = {};

const internalKeys = new Set<string>(INTERNAL_KV_KEYS);

/** Liest alle Daten in eine Sicherung (interne Schlüssel ausgenommen). */
export async function createBackup(db: CockpitDB, appVersion: string, now: Date = new Date()): Promise<ValidBackup> {
  const tables = {} as Record<TableName, unknown[]>;
  await db.transaction('r', db.tables, async () => {
    for (const name of TABLE_NAMES) {
      const rows = await db.table(name).toArray();
      tables[name] = name === 'kv' ? (rows as KvRow[]).filter((row) => !internalKeys.has(row.key)) : rows;
    }
  });
  return { format: BACKUP_FORMAT, schemaVersion: SCHEMA_VERSION, appVersion, exportedAt: now.toISOString(), tables } as ValidBackup;
}

const envelopeSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.number().int().min(1),
  appVersion: z.string().optional(),
  exportedAt: z.string(),
  tables: z.record(z.string(), z.array(z.unknown())),
});

export type ParseResult = { ok: true; backup: ValidBackup } | { ok: false; error: string };

/** Prüft eine eingelesene Datei, migriert ältere Versionen und validiert jede Zeile. */
export function parseBackup(
  input: unknown,
  {
    currentVersion = SCHEMA_VERSION,
    migrations = BACKUP_MIGRATIONS,
  }: { currentVersion?: number; migrations?: Record<number, BackupMigration> } = {},
): ParseResult {
  const envelope = envelopeSchema.safeParse(input);
  if (!envelope.success) return { ok: false, error: 'Das ist keine Cockpit-Sicherung.' };

  const { schemaVersion, exportedAt, appVersion } = envelope.data;
  if (schemaVersion > currentVersion) {
    return { ok: false, error: 'Diese Sicherung stammt aus einer neueren Version von Cockpit. Bitte aktualisiere zuerst die App.' };
  }

  let tables = envelope.data.tables;
  for (let version = schemaVersion; version < currentVersion; version++) {
    const migrate = migrations[version];
    if (!migrate) return { ok: false, error: `Sicherungen der Version ${version} können nicht mehr gelesen werden.` };
    tables = migrate(tables);
  }

  const validated = {} as Record<TableName, unknown[]>;
  for (const name of TABLE_NAMES) {
    const rows = tables[name] ?? [];
    const schema = TABLE_SCHEMAS[name];
    const out: unknown[] = [];
    for (let i = 0; i < rows.length; i++) {
      const parsed = schema.safeParse(rows[i]);
      if (!parsed.success) {
        return { ok: false, error: `Die Sicherung enthält einen ungültigen Eintrag bei «${TABLE_LABELS[name]}» (Nr. ${i + 1}).` };
      }
      out.push(parsed.data);
    }
    validated[name] = out;
  }

  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      schemaVersion: currentVersion,
      appVersion: appVersion ?? 'unbekannt',
      exportedAt,
      tables: validated,
    } as ValidBackup,
  };
}

/** Ersetzt alle Daten durch die Sicherung (in einer Transaktion; interne Schlüssel bleiben). */
export async function restoreBackup(db: CockpitDB, backup: ValidBackup): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const name of TABLE_NAMES) {
      const table = db.table(name);
      if (name === 'kv') {
        const keep = (await table.toArray()).filter((row: KvRow) => internalKeys.has(row.key));
        const incoming = (backup.tables.kv as KvRow[]).filter((row) => !internalKeys.has(row.key));
        await table.clear();
        await table.bulkPut([...incoming, ...keep]);
      } else {
        await table.clear();
        await table.bulkPut(backup.tables[name]);
      }
    }
  });
}

/** Löscht alle Daten (interne Schlüssel bleiben). */
export async function clearAllData(db: CockpitDB): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const name of TABLE_NAMES) {
      const table = db.table(name);
      if (name === 'kv') {
        const keys = (await table.toCollection().primaryKeys()) as string[];
        await table.bulkDelete(keys.filter((key) => !internalKeys.has(key)));
      } else {
        await table.clear();
      }
    }
  });
}

export function backupFileName(now: Date = new Date()): string {
  return `cockpit-backup-${toISODate(now)}.json`;
}

/** Anzahl Einträge pro Tabelle (für Vorschau und Statistik). */
export function countRows(backup: Backup): number {
  return TABLE_NAMES.filter((n) => n !== 'kv').reduce((sum, name) => sum + backup.tables[name].length, 0);
}
