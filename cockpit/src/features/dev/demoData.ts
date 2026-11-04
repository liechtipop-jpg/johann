import type { Countdown, Exam, Grade, KvRow, Semester, Subject, SubjectColor, Task } from '@/db/schemas';
import { ZH_GYM_RULES } from '@/features/grades/logic/rules';
import { addDays, diffDays, suggestSemester, type ISODate } from '@/lib/dates';

/** Fiktive Beispieldaten (Dev-Modus) – relativ zum heutigen Datum, ohne Zufall. */
export interface DemoData {
  kv: KvRow[];
  subjects: Subject[];
  semesters: Semester[];
  grades: Grade[];
  exams: Exam[];
  tasks: Task[];
  countdowns: Countdown[];
}

const SUBJECTS: Array<[string, SubjectColor, boolean]> = [
  ['Deutsch', 'red', true],
  ['Französisch', 'violet', true],
  ['Englisch', 'sky', true],
  ['Mathematik', 'teal', true],
  ['Biologie', 'green', true],
  ['Chemie', 'orange', true],
  ['Physik', 'slate', true],
  ['Geschichte', 'brown', true],
  ['Geografie', 'olive', true],
  ['Wirtschaft und Recht', 'yellow', true],
  ['Bildnerisches Gestalten', 'pink', true],
  ['Sport', 'cyan', false],
];

/** [Fachindex, Tage nach Semesterbeginn, Note, Gewicht, Titel] */
const CURRENT_GRADES: Array<[number, number, number, number, string]> = [
  [0, 20, 5, 1, 'Erörterung'],
  [0, 48, 5.5, 1, 'Grammatiktest'],
  [1, 14, 4.5, 0.5, 'Vokabeltest Unité 2'],
  [1, 35, 5, 1, 'Compréhension écrite'],
  [1, 60, 4.75, 1, 'Prüfung Unité 3'],
  [2, 25, 5.5, 1, 'Reading & Use of English'],
  [2, 55, 5, 1, 'Essay'],
  [3, 18, 4, 1, 'Gleichungen'],
  [3, 46, 4.5, 1, 'Funktionen I'],
  [3, 70, 5, 2, 'Semesterprüfung Algebra'],
  [4, 30, 5.5, 1, 'Zellbiologie'],
  [4, 58, 5, 1, 'Genetik'],
  [5, 28, 4.25, 1, 'Stöchiometrie'],
  [5, 62, 4, 1, 'Säuren und Basen'],
  [6, 22, 3.5, 1, 'Kinematik'],
  [6, 52, 3.75, 1, 'Kräfte'],
  [7, 32, 5, 1, 'Industrialisierung'],
  [8, 40, 4.5, 1, 'Plattentektonik'],
  [9, 36, 5, 1, 'Vertragsrecht'],
  [10, 44, 5.5, 1, 'Porträt'],
  [11, 50, 5.5, 1, 'Ausdauer'],
];

const PREVIOUS_GRADES: Array<[number, number, number, number, string]> = [
  [0, 30, 5, 1, 'Textanalyse'],
  [1, 40, 4.5, 1, 'Prüfung Unité 1'],
  [2, 35, 5, 1, 'Listening'],
  [3, 50, 4.5, 1, 'Geometrie'],
  [4, 45, 5, 1, 'Ökologie'],
  [5, 55, 4.5, 1, 'Atombau'],
  [6, 60, 4, 1, 'Optik'],
  [7, 42, 5.5, 1, 'Mittelalter'],
];

export function buildDemoData(today: ISODate, now: number, theme: 'system' | 'light' | 'dark' = 'system'): DemoData {
  const id = (prefix: string, n: number | string) => `demo-${prefix}-${n}`;
  const current = suggestSemester(today);
  const previous = suggestSemester(addDays(current.start, -30));
  const semesters: Semester[] = [
    { id: id('sem', 0), ...previous, createdAt: now },
    { id: id('sem', 1), ...current, createdAt: now },
  ];

  const subjects: Subject[] = SUBJECTS.map(([name, color, isPromotion], i) => ({
    id: id('subj', i),
    name,
    color,
    isPromotion,
    order: i,
    archived: false,
    createdAt: now,
  }));

  const elapsed = Math.max(0, diffDays(current.start, today));
  const toGrades = (rows: typeof CURRENT_GRADES, sem: Semester, clampToToday: boolean, prefix: string): Grade[] =>
    rows.map(([subject, offset, value, weight, title], i) => {
      // Im laufenden Semester liegen alle Noten vor heute (gleichmässig gestaucht, falls das Semester erst begonnen hat).
      const day = clampToToday ? Math.min(offset, Math.round((offset / 80) * elapsed)) : offset;
      return {
        id: id(prefix, i),
        subjectId: subjects[subject].id,
        semesterId: sem.id,
        value,
        weight,
        date: addDays(sem.start, day),
        title,
        createdAt: now,
      };
    });

  const grades = [...toGrades(PREVIOUS_GRADES, semesters[0], false, 'gp'), ...toGrades(CURRENT_GRADES, semesters[1], true, 'gc')];

  const exam = (n: number, subject: number, title: string, inDays: number, topics: Array<[string, 'S' | 'M' | 'L']>, weight = 1): Exam => ({
    id: id('exam', n),
    subjectId: subjects[subject].id,
    title,
    date: addDays(today, inDays),
    weight,
    topics: topics.map(([t, effort], i) => ({ id: id(`topic${n}`, i), title: t, effort })),
    createdAt: now,
  });

  const exams: Exam[] = [
    exam(1, 1, 'Prüfung Unité 4', 3, [
      ['Passé composé', 'M'],
      ['Vocabulaire: la famille', 'S'],
      ['Compréhension orale', 'M'],
    ]),
    exam(
      2,
      3,
      'Funktionen II',
      8,
      [
        ['Quadratische Funktionen', 'L'],
        ['Scheitelpunktform', 'M'],
      ],
      2,
    ),
    exam(3, 4, 'Zellatmung', 13, [
      ['Glykolyse', 'M'],
      ['Citratzyklus', 'L'],
      ['Atmungskette', 'M'],
    ]),
    exam(4, 7, 'Französische Revolution', 20, [['Ursachen und Verlauf', 'L']]),
    exam(5, 2, 'Use of English', -9, [['Phrasal verbs', 'M']]),
  ];

  const task = (n: number, title: string, due: number | null, subject: number | null, done = false): Task => ({
    id: id('task', n),
    title,
    subjectId: subject === null ? undefined : subjects[subject].id,
    due: due === null ? undefined : addDays(today, due),
    done,
    doneAt: done ? now - 86_400_000 : undefined,
    createdAt: now,
  });

  const tasks: Task[] = [
    task(1, 'Arbeitsblatt Vektoren', 0, 3),
    task(2, 'Erörterung abgeben', 1, 0),
    task(3, 'Vokabeln Unité 4 lernen', 2, 1),
    task(4, 'Laborbericht Enzyme', -1, 4),
    task(5, 'Lektüre besorgen', null, 0),
    task(6, 'Referat Klimazonen vorbereiten', -3, 8, true),
  ];

  const countdowns: Countdown[] = [
    { id: id('cd', 1), title: 'Sprachaufenthalt', date: addDays(today, 180), createdAt: now },
    { id: id('cd', 2), title: 'Sportwoche', date: addDays(today, 38), createdAt: now },
  ];

  const kv: KvRow[] = [
    { key: 'profile', value: { name: 'Alex' } },
    { key: 'appearance', value: { theme } },
    { key: 'onboarding', value: { done: true, completedAt: now } },
    { key: 'promotionRules', value: { ...ZH_GYM_RULES } },
    { key: 'backup', value: { lastExportAt: now, snoozedUntil: null, firstUseAt: now } },
    { key: 'install', value: { hintDismissed: true } },
    { key: 'dev', value: { enabled: true, demoActive: true } },
  ];

  return { kv, subjects, semesters, grades, exams, tasks, countdowns };
}
