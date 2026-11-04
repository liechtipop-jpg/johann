import type {
  Card,
  CardState,
  Countdown,
  Deck,
  Exam,
  Grade,
  KvRow,
  ReviewLog,
  Semester,
  StudySession,
  Subject,
  SubjectColor,
  Task,
} from '@/db/schemas';
import { ZH_GYM_RULES } from '@/features/grades/logic/rules';
import { DEFAULT_PLAN_PREFS, generatePlan } from '@/features/planner/logic/studyplan';
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
  studySessions: StudySession[];
  decks: Deck[];
  cards: Card[];
  cardStates: CardState[];
  reviewLogs: ReviewLog[];
}

const DEMO_CARDS: Array<[string, string, string]> = [
  ['la famille', 'die Familie', 'Ma famille habite à Lyon.'],
  ['le frère', 'der Bruder', "Mon frère s'appelle Luc."],
  ['la sœur', 'die Schwester', 'Ma sœur a douze ans.'],
  ['les parents', 'die Eltern', 'Mes parents travaillent beaucoup.'],
  ['le grand-père', 'der Grossvater', 'Mon grand-père joue aux échecs.'],
  ['la tante', 'die Tante', 'Ma tante vit au Canada.'],
  ['le cousin', 'der Cousin', 'Mon cousin fait du foot.'],
  ['se disputer', 'streiten', 'Mes frères se disputent souvent.'],
  ["s'entendre bien", 'sich gut verstehen', "Je m'entends bien avec ma sœur."],
  ['le mariage', 'die Hochzeit', 'Le mariage a lieu en juin.'],
  ['divorcé(e)', 'geschieden', 'Ses parents sont divorcés.'],
  ['élever', 'erziehen', 'Elle a été élevée par sa grand-mère.'],
];

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

  // Lernpläne, als hätte Alex vor vier Tagen angefangen: Vergangenes ist erledigt, eine Einheit wurde verpasst.
  const planStart = addDays(today, -4);
  const load: Record<string, number> = {};
  const studySessions: StudySession[] = [];
  for (const e of exams.filter((x) => x.date > today)) {
    const plan = generatePlan({ examDate: e.date, today: planStart, topics: e.topics, prefs: DEFAULT_PLAN_PREFS, load });
    plan.sessions.forEach((s, i) => {
      load[s.date] = (load[s.date] ?? 0) + s.minutes;
      studySessions.push({ ...s, id: id(`sess-${e.id}`, i), examId: e.id, done: s.date < today, doneAt: s.date < today ? now : undefined });
    });
  }
  const missed = studySessions.filter((s) => s.date < today).at(-1);
  if (missed) {
    missed.done = false;
    missed.doneAt = undefined;
  }

  // Karteikarten mit etwas Lernverlauf (für «Heute» und die Statistik).
  const DAY = 86_400_000;
  const deck: Deck = {
    id: id('deck', 1),
    name: 'Vocabulaire Unité 4',
    subjectId: subjects[1].id,
    frontLang: 'fr-FR',
    backLang: 'de-CH',
    directions: 'fwd',
    source: 'user',
    createdAt: now - 20 * DAY,
  };
  const cards: Card[] = DEMO_CARDS.map(([front, back, example], i) => ({
    id: id('card', i),
    deckId: deck.id,
    front,
    back,
    example,
    createdAt: now - 20 * DAY + i,
  }));
  const cardStates: CardState[] = cards.map((card, i) => {
    const learned = i < 8;
    return {
      id: `${card.id}:fwd`,
      cardId: card.id,
      deckId: deck.id,
      dir: 'fwd',
      due: learned ? now + (i % 3 === 0 ? -DAY : (i % 4) * DAY) : now,
      stability: learned ? 3 + i : 0,
      difficulty: learned ? 5 : 0,
      scheduledDays: learned ? 2 + (i % 4) : 0,
      learningSteps: 0,
      reps: learned ? 3 : 0,
      lapses: learned && i === 5 ? 1 : 0,
      state: learned ? 2 : 0,
      lastReview: learned ? now - 2 * DAY : undefined,
    };
  });
  const reviewLogs: ReviewLog[] = [];
  for (let day = 13; day >= 1; day--) {
    const count = [4, 6, 0, 5, 8, 3, 0, 7, 9, 5, 6, 4, 8][day - 1];
    for (let k = 0; k < count; k++) {
      reviewLogs.push({
        id: id(`log${day}`, k),
        cardId: cards[(day + k) % 8].id,
        deckId: deck.id,
        dir: 'fwd',
        rating: (day + k) % 6 === 0 ? 1 : 3,
        mode: 'flip',
        reviewedAt: now - day * DAY + k * 60_000,
        state: 2,
      });
    }
  }

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

  return { kv, subjects, semesters, grades, exams, tasks, countdowns, studySessions, decks: [deck], cards, cardStates, reviewLogs };
}
