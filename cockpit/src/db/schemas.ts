import { z } from 'zod';

/**
 * Zod-Schemas für alle Tabellen. Daraus kommen die TypeScript-Typen,
 * und der Backup-Import prüft jede Zeile damit.
 */

export const SUBJECT_COLORS = [
  'red',
  'orange',
  'yellow',
  'olive',
  'green',
  'teal',
  'cyan',
  'sky',
  'violet',
  'pink',
  'brown',
  'slate',
] as const;
export type SubjectColor = (typeof SUBJECT_COLORS)[number];

const id = z.string().min(1).max(64);
const isoDate = z.iso.date();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const ms = z.number().int().nonnegative();
const text = (max: number) => z.string().max(max);
const label = (max: number) => z.string().trim().min(1).max(max);
const status = z.enum(['learning', 'consolidating', 'ready']);
const direction = z.enum(['fwd', 'rev']);

export const kvSchema = z.object({ key: z.string().min(1).max(64), value: z.unknown() });

export const subjectSchema = z.object({
  id,
  name: label(40),
  color: z.enum(SUBJECT_COLORS),
  isPromotion: z.boolean(),
  order: z.number(),
  archived: z.boolean(),
  createdAt: ms,
});

export const semesterSchema = z.object({
  id,
  name: label(40),
  start: isoDate,
  end: isoDate,
  createdAt: ms,
});

export const gradeSchema = z.object({
  id,
  subjectId: id,
  semesterId: id,
  value: z.number().min(1).max(6),
  weight: z.number().positive().max(100),
  date: isoDate,
  title: text(80).optional(),
  examId: id.optional(),
  createdAt: ms,
});

export const effortSchema = z.enum(['S', 'M', 'L']);
export const topicSchema = z.object({ id, title: label(120), effort: effortSchema });

export const examSchema = z.object({
  id,
  subjectId: id,
  title: label(120),
  date: isoDate,
  time: time.optional(),
  weight: z.number().positive().max(100).optional(),
  topics: z.array(topicSchema).max(100),
  notes: text(5000).optional(),
  gradeId: id.optional(),
  createdAt: ms,
});

export const taskSchema = z.object({
  id,
  title: label(160),
  subjectId: id.optional(),
  due: isoDate.optional(),
  done: z.boolean(),
  doneAt: ms.optional(),
  notes: text(2000).optional(),
  createdAt: ms,
});

export const studySessionSchema = z.object({
  id,
  examId: id,
  topicId: id.optional(),
  date: isoDate,
  minutes: z
    .number()
    .int()
    .positive()
    .max(24 * 60),
  kind: z.enum(['learn', 'review', 'repetition']),
  done: z.boolean(),
  doneAt: ms.optional(),
});

export const countdownSchema = z.object({ id, title: label(60), date: isoDate, createdAt: ms });

export const deckSchema = z.object({
  id,
  name: label(80),
  subjectId: id.optional(),
  frontLang: text(12).optional(),
  backLang: text(12).optional(),
  directions: z.enum(['fwd', 'rev', 'both']),
  source: text(40),
  createdAt: ms,
});

export const cardSchema = z.object({
  id,
  deckId: id,
  front: label(1000),
  back: label(1000),
  example: text(1000).optional(),
  tags: z.array(text(40)).max(20).optional(),
  createdAt: ms,
});

export const cardStateSchema = z.object({
  id,
  cardId: id,
  deckId: id,
  dir: direction,
  due: ms,
  stability: z.number(),
  difficulty: z.number(),
  elapsedDays: z.number().optional(),
  scheduledDays: z.number(),
  learningSteps: z.number(),
  reps: z.number().int(),
  lapses: z.number().int(),
  state: z.number().int().min(0).max(3),
  lastReview: ms.optional(),
});

export const reviewLogSchema = z.object({
  id,
  cardId: id,
  deckId: id,
  dir: direction,
  rating: z.number().int().min(1).max(4),
  mode: z.enum(['flip', 'type']),
  reviewedAt: ms,
  state: z.number().int().optional(),
  scheduledDays: z.number().optional(),
});

export const pieceSchema = z.object({
  id,
  title: label(120),
  composer: text(120).optional(),
  status,
  sections: z
    .array(
      z.object({
        id,
        name: label(60),
        bars: text(30).optional(),
        status,
        bpm: z.number().int().min(20).max(300).optional(),
        targetBpm: z.number().int().min(20).max(300).optional(),
      }),
    )
    .max(100),
  lessonNotes: z.array(z.object({ id, date: isoDate, text: label(4000) })).max(500),
  order: z.number(),
  createdAt: ms,
});

export const practiceLogSchema = z.object({
  id,
  pieceId: id.optional(),
  date: isoDate,
  startedAt: ms,
  seconds: z
    .number()
    .int()
    .nonnegative()
    .max(24 * 3600),
  note: text(500).optional(),
});

export const focusSessionSchema = z.object({
  id,
  kind: z.enum(['pomodoro', 'free', 'fce']),
  subjectId: id.optional(),
  examId: id.optional(),
  label: text(80).optional(),
  date: isoDate,
  startedAt: ms,
  endedAt: ms,
  focusSeconds: z.number().int().nonnegative(),
});

export const studyOptionSchema = z.object({
  id,
  name: label(120),
  pros: z.array(label(300)).max(50),
  cons: z.array(label(300)).max(50),
  notes: text(5000),
  links: z.array(z.object({ label: label(120), url: z.url() })).max(30),
  order: z.number(),
  createdAt: ms,
});

export const criterionSchema = z.object({
  id,
  name: label(80),
  weight: z.number().min(0).max(10),
  order: z.number(),
  createdAt: ms,
});

export const ratingSchema = z.object({
  optionId: id,
  criterionId: id,
  score: z.number().int().min(1).max(10),
});

export const timelineEventSchema = z.object({
  id,
  optionId: id.optional(),
  title: label(120),
  date: isoDate.optional(),
  kind: z.enum(['deadline', 'infoday', 'other']),
  url: z.url().optional(),
  notes: text(1000).optional(),
});

export type KvRow = z.infer<typeof kvSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type Semester = z.infer<typeof semesterSchema>;
export type Grade = z.infer<typeof gradeSchema>;
export type Effort = z.infer<typeof effortSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type Exam = z.infer<typeof examSchema>;
export type Task = z.infer<typeof taskSchema>;
export type StudySession = z.infer<typeof studySessionSchema>;
export type Countdown = z.infer<typeof countdownSchema>;
export type Deck = z.infer<typeof deckSchema>;
export type Card = z.infer<typeof cardSchema>;
export type CardState = z.infer<typeof cardStateSchema>;
export type ReviewLog = z.infer<typeof reviewLogSchema>;
export type Piece = z.infer<typeof pieceSchema>;
export type PracticeLog = z.infer<typeof practiceLogSchema>;
export type FocusSession = z.infer<typeof focusSessionSchema>;
export type StudyOption = z.infer<typeof studyOptionSchema>;
export type Criterion = z.infer<typeof criterionSchema>;
export type Rating = z.infer<typeof ratingSchema>;
export type TimelineEvent = z.infer<typeof timelineEventSchema>;

/** Alle Tabellen mit Schema – Reihenfolge = Reihenfolge im Backup. */
export const TABLE_SCHEMAS = {
  kv: kvSchema,
  subjects: subjectSchema,
  semesters: semesterSchema,
  grades: gradeSchema,
  exams: examSchema,
  tasks: taskSchema,
  studySessions: studySessionSchema,
  countdowns: countdownSchema,
  decks: deckSchema,
  cards: cardSchema,
  cardStates: cardStateSchema,
  reviewLogs: reviewLogSchema,
  pieces: pieceSchema,
  practiceLogs: practiceLogSchema,
  focusSessions: focusSessionSchema,
  studyOptions: studyOptionSchema,
  criteria: criterionSchema,
  ratings: ratingSchema,
  timeline: timelineEventSchema,
} as const;

export type TableName = keyof typeof TABLE_SCHEMAS;
export const TABLE_NAMES = Object.keys(TABLE_SCHEMAS) as TableName[];

export const TABLE_LABELS: Record<TableName, string> = {
  kv: 'Einstellungen',
  subjects: 'Fächer',
  semesters: 'Semester',
  grades: 'Noten',
  exams: 'Prüfungen',
  tasks: 'Aufgaben',
  studySessions: 'Lernplan',
  countdowns: 'Countdowns',
  decks: 'Decks',
  cards: 'Karteikarten',
  cardStates: 'Lernstand der Karten',
  reviewLogs: 'Lernverlauf',
  pieces: 'Klavierstücke',
  practiceLogs: 'Übungslog',
  focusSessions: 'Fokuszeiten',
  studyOptions: 'Studienoptionen',
  criteria: 'Kriterien',
  ratings: 'Bewertungen',
  timeline: 'Zeitstrahl',
};
