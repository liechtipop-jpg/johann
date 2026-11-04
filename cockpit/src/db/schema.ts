import type Dexie from 'dexie';
import type { TableName } from './schemas';

/**
 * Versionierte Datenbank-Struktur.
 * Regel: Eine veröffentlichte Version wird NIE verändert. Änderungen kommen als neue
 * Version mit upgrade()-Funktion dazu (plus passende Backup-Migration und Test).
 */
export const SCHEMA_VERSION = 1;

export const STORES_V1: Record<TableName, string> = {
  kv: 'key',
  subjects: 'id, order',
  semesters: 'id, start',
  grades: 'id, subjectId, semesterId, examId, date, [semesterId+subjectId]',
  exams: 'id, subjectId, date',
  tasks: 'id, subjectId, due',
  studySessions: 'id, examId, date',
  countdowns: 'id, date',
  decks: 'id, subjectId',
  cards: 'id, deckId',
  cardStates: 'id, cardId, deckId, due',
  reviewLogs: 'id, cardId, deckId, reviewedAt',
  pieces: 'id, order',
  practiceLogs: 'id, pieceId, date',
  focusSessions: 'id, subjectId, examId, date',
  studyOptions: 'id, order',
  criteria: 'id, order',
  ratings: '[optionId+criterionId], optionId, criterionId',
  timeline: 'id, optionId, date',
};

export function defineSchema(db: Dexie): void {
  db.version(1).stores(STORES_V1);
  // Beispiel für später:
  // db.version(2).stores({ ...geänderte Tabellen }).upgrade(async (tx) => { … });
}
