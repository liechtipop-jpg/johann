import { z } from 'zod';
import { ZH_GYM_RULES } from '@/features/grades/logic/rules';
import { DEFAULT_FOCUS_PREFS } from '@/features/focus/logic/timer';
import { DEFAULT_PLAN_PREFS } from '@/features/planner/logic/studyplan';
import { db as defaultDb, type CockpitDB } from './db';
import type { KvRow } from './schemas';

/**
 * Einstellungen liegen als Schlüssel/Wert-Paare in der Tabelle «kv».
 * Jeder Schlüssel hat ein Schema mit Standardwerten – fehlende oder kaputte Werte
 * fallen automatisch auf den Standard zurück.
 */
export const SETTINGS = {
  profile: z.object({ name: z.string().max(40).default('') }),
  appearance: z.object({ theme: z.enum(['system', 'light', 'dark']).default('system') }),
  onboarding: z.object({ done: z.boolean().default(false), completedAt: z.number().optional() }),
  promotionRules: z.object({
    presetId: z.enum(['zh-gym', 'custom']).default(ZH_GYM_RULES.presetId),
    passMark: z.number().min(1).max(6).default(ZH_GYM_RULES.passMark),
    roundingStep: z.number().min(0).max(1).default(ZH_GYM_RULES.roundingStep),
    maxInsufficient: z.number().int().min(0).max(20).default(ZH_GYM_RULES.maxInsufficient),
    compensationFactor: z.number().min(0).max(3).default(ZH_GYM_RULES.compensationFactor),
    minAverage: z.number().min(1).max(6).nullable().default(ZH_GYM_RULES.minAverage),
    warnReserve: z.number().min(0).max(10).default(ZH_GYM_RULES.warnReserve),
  }),
  backup: z.object({
    lastExportAt: z.number().nullable().default(null),
    snoozedUntil: z.number().nullable().default(null),
    firstUseAt: z.number().nullable().default(null),
  }),
  studyPlan: z.object({
    maxMinutesPerDay: z.number().int().min(15).max(600).default(DEFAULT_PLAN_PREFS.maxMinutesPerDay),
    blockedWeekdays: z.array(z.number().int().min(0).max(6)).max(7).default(DEFAULT_PLAN_PREFS.blockedWeekdays),
    blockedDates: z.array(z.iso.date()).max(366).default(DEFAULT_PLAN_PREFS.blockedDates),
    effortMinutes: z
      .object({ S: z.number().int().min(5).max(600), M: z.number().int().min(5).max(600), L: z.number().int().min(5).max(600) })
      .default(DEFAULT_PLAN_PREFS.effortMinutes),
    reviewOffsets: z.array(z.number().int().min(1).max(60)).max(10).default(DEFAULT_PLAN_PREFS.reviewOffsets),
    repetitionDay: z.boolean().default(DEFAULT_PLAN_PREFS.repetitionDay),
  }),
  flashcards: z.object({
    newPerDay: z.number().int().min(0).max(200).default(20),
    retention: z.number().min(0.7).max(0.97).default(0.9),
    autoSpeak: z.boolean().default(false),
  }),
  piano: z.object({ weeklyGoalMinutes: z.number().int().min(10).max(3000).default(120) }),
  metronome: z.object({
    bpm: z.number().int().min(30).max(240).default(80),
    signature: z.string().max(8).default('4/4'),
    subdivision: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).default(1),
    accent: z.boolean().default(true),
    volume: z.number().min(0).max(1).default(0.8),
    trainer: z
      .object({
        enabled: z.boolean(),
        start: z.number().int().min(30).max(240),
        target: z.number().int().min(30).max(240),
        step: z.number().int().min(1).max(30),
        everyBars: z.number().int().min(1).max(64),
      })
      .default({ enabled: false, start: 60, target: 90, step: 2, everyBars: 4 }),
    gap: z
      .object({ enabled: z.boolean(), play: z.number().int().min(1).max(16), mute: z.number().int().min(1).max(16) })
      .default({ enabled: false, play: 3, mute: 1 }),
  }),
  focus: z.object({
    focusMinutes: z.number().int().min(5).max(180).default(DEFAULT_FOCUS_PREFS.focusMinutes),
    shortBreakMinutes: z.number().int().min(1).max(60).default(DEFAULT_FOCUS_PREFS.shortBreakMinutes),
    longBreakMinutes: z.number().int().min(5).max(90).default(DEFAULT_FOCUS_PREFS.longBreakMinutes),
    longEvery: z.number().int().min(2).max(12).default(DEFAULT_FOCUS_PREFS.longEvery),
    autoStartBreaks: z.boolean().default(DEFAULT_FOCUS_PREFS.autoStartBreaks),
    sound: z.boolean().default(true),
  }),
  /** Laufender Fokus-Timer (Zeitstempel, damit er App-Wechsel und Neuladen übersteht) */
  focusTimer: z.object({
    status: z.enum(['idle', 'running', 'paused']).default('idle'),
    template: z.enum(['pomodoro', 'fce']).default('pomodoro'),
    phase: z.enum(['focus', 'short', 'long', 'segment']).default('focus'),
    plannedMs: z.number().nonnegative().default(0),
    startedAt: z.number().nullable().default(null),
    pausedAt: z.number().nullable().default(null),
    pausedMs: z.number().nonnegative().default(0),
    completedFocus: z.number().int().nonnegative().default(0),
    segmentIndex: z.number().int().min(0).max(20).default(0),
    subjectId: z.string().max(64).optional(),
    examId: z.string().max(64).optional(),
  }),
  /** Laufender Übungstimer am Klavier */
  practiceTimer: z.object({
    status: z.enum(['idle', 'running', 'paused']).default('idle'),
    startedAt: z.number().nullable().default(null),
    pausedAt: z.number().nullable().default(null),
    pausedMs: z.number().nonnegative().default(0),
    pieceId: z.string().max(64).optional(),
  }),
  install: z.object({ hintDismissed: z.boolean().default(false) }),
  dev: z.object({ enabled: z.boolean().default(false), demoActive: z.boolean().default(false) }),
  ui: z.object({ lastSubjectId: z.string().optional() }),
};

export type SettingKey = keyof typeof SETTINGS;
export type Settings = { [K in SettingKey]: z.output<(typeof SETTINGS)[K]> };
export type ThemePreference = Settings['appearance']['theme'];

/** Interne Schlüssel, die nie exportiert werden. */
export const INTERNAL_KV_KEYS = ['demoSnapshot', 'focusTimer', 'practiceTimer'] as const;

export function readSetting<K extends SettingKey>(key: K, raw: unknown): Settings[K] {
  const schema = SETTINGS[key];
  const parsed = schema.safeParse(raw ?? {});
  return (parsed.success ? parsed.data : schema.parse({})) as Settings[K];
}

export function buildSettings(rows: KvRow[]): Settings {
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const result = {} as Record<SettingKey, unknown>;
  for (const key of Object.keys(SETTINGS) as SettingKey[]) {
    result[key] = readSetting(key, values.get(key));
  }
  return result as Settings;
}

export async function getSetting<K extends SettingKey>(key: K, database: CockpitDB = defaultDb): Promise<Settings[K]> {
  return readSetting(key, (await database.kv.get(key))?.value);
}

export async function setSetting<K extends SettingKey>(key: K, value: Settings[K], database: CockpitDB = defaultDb): Promise<void> {
  await database.kv.put({ key, value: SETTINGS[key].parse(value) });
}

export async function patchSetting<K extends SettingKey>(
  key: K,
  patch: Partial<Settings[K]>,
  database: CockpitDB = defaultDb,
): Promise<void> {
  await database.transaction('rw', database.kv, async () => {
    const current = await getSetting(key, database);
    await setSetting(key, { ...current, ...patch }, database);
  });
}
