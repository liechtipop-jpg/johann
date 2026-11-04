import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { CockpitDB } from './db';
import { SCHEMA_VERSION, STORES_V1 } from './schema';
import { TABLE_LABELS, TABLE_NAMES, TABLE_SCHEMAS } from './schemas';

let database: CockpitDB | undefined;
afterEach(async () => {
  database?.close();
  if (database) await database.delete();
});

describe('Datenbank-Schema', () => {
  it('kennt für jede Tabelle Schema, Index-Definition und Beschriftung', () => {
    expect(Object.keys(STORES_V1).sort()).toEqual([...TABLE_NAMES].sort());
    expect(Object.keys(TABLE_LABELS).sort()).toEqual(Object.keys(TABLE_SCHEMAS).sort());
  });

  it('öffnet in der aktuellen Version mit allen Tabellen', async () => {
    database = new CockpitDB(`test-${Math.random()}`);
    await database.open();
    expect(database.verno).toBe(SCHEMA_VERSION);
    expect(database.tables.map((t) => t.name).sort()).toEqual([...TABLE_NAMES].sort());
  });

  it('nutzt zusammengesetzte Schlüssel für Bewertungen', async () => {
    database = new CockpitDB(`test-${Math.random()}`);
    await database.ratings.put({ optionId: 'a', criterionId: 'b', score: 7 });
    await database.ratings.put({ optionId: 'a', criterionId: 'b', score: 9 });
    expect(await database.ratings.count()).toBe(1);
    expect((await database.ratings.get(['a', 'b']))?.score).toBe(9);
  });
});
