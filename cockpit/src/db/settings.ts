import { z } from 'zod';
import { ZH_GYM_RULES } from '@/features/grades/logic/rules';
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
  install: z.object({ hintDismissed: z.boolean().default(false) }),
  dev: z.object({ enabled: z.boolean().default(false), demoActive: z.boolean().default(false) }),
  ui: z.object({ lastSubjectId: z.string().optional() }),
};

export type SettingKey = keyof typeof SETTINGS;
export type Settings = { [K in SettingKey]: z.output<(typeof SETTINGS)[K]> };
export type ThemePreference = Settings['appearance']['theme'];

/** Interne Schlüssel, die nie exportiert werden. */
export const INTERNAL_KV_KEYS = ['demoSnapshot'] as const;

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
