import type { Table } from 'dexie';
import { toastUndo } from '@/ui/toast';

/** Löscht sofort und bietet «Rückgängig» an. */
export async function deleteWithUndo<T, K>(table: Table<T, K>, keys: K[], message: string): Promise<void> {
  const rows = (await table.bulkGet(keys)).filter((row): row is T => row !== undefined);
  await table.bulkDelete(keys);
  toastUndo(message, () => table.bulkPut(rows));
}
