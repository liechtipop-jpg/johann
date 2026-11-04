import Dexie, { type EntityTable, type Table } from 'dexie';
import { defineSchema } from './schema';
import type {
  Card,
  CardState,
  Countdown,
  Criterion,
  Deck,
  Exam,
  FocusSession,
  Grade,
  KvRow,
  Piece,
  PracticeLog,
  Rating,
  ReviewLog,
  Semester,
  StudyOption,
  StudySession,
  Subject,
  Task,
  TimelineEvent,
} from './schemas';

export class CockpitDB extends Dexie {
  kv!: EntityTable<KvRow, 'key'>;
  subjects!: EntityTable<Subject, 'id'>;
  semesters!: EntityTable<Semester, 'id'>;
  grades!: EntityTable<Grade, 'id'>;
  exams!: EntityTable<Exam, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  studySessions!: EntityTable<StudySession, 'id'>;
  countdowns!: EntityTable<Countdown, 'id'>;
  decks!: EntityTable<Deck, 'id'>;
  cards!: EntityTable<Card, 'id'>;
  cardStates!: EntityTable<CardState, 'id'>;
  reviewLogs!: EntityTable<ReviewLog, 'id'>;
  pieces!: EntityTable<Piece, 'id'>;
  practiceLogs!: EntityTable<PracticeLog, 'id'>;
  focusSessions!: EntityTable<FocusSession, 'id'>;
  studyOptions!: EntityTable<StudyOption, 'id'>;
  criteria!: EntityTable<Criterion, 'id'>;
  ratings!: Table<Rating, [string, string]>;
  timeline!: EntityTable<TimelineEvent, 'id'>;

  constructor(name = 'cockpit') {
    super(name);
    defineSchema(this);
  }
}

/** Die Datenbank der App (in Tests wird eine eigene Instanz erzeugt). */
export const db = new CockpitDB();
