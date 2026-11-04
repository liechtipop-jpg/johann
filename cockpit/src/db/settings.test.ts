import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { ZH_GYM_RULES } from '@/features/grades/logic/rules';
import { CockpitDB } from './db';
import { buildSettings, getSetting, patchSetting, readSetting } from './settings';

let database: CockpitDB | undefined;
afterEach(async () => {
  database?.close();
  if (database) await database.delete();
});

describe('Einstellungen', () => {
  it('liefert Standardwerte für fehlende Schlüssel', () => {
    const settings = buildSettings([]);
    expect(settings.profile.name).toBe('');
    expect(settings.appearance.theme).toBe('system');
    expect(settings.onboarding.done).toBe(false);
    expect(settings.promotionRules).toEqual(ZH_GYM_RULES);
  });

  it('ergänzt teilweise gespeicherte Werte mit Standards', () => {
    expect(readSetting('promotionRules', { maxInsufficient: 2 })).toEqual({ ...ZH_GYM_RULES, maxInsufficient: 2 });
  });

  it('fällt bei kaputten Werten auf den Standard zurück', () => {
    expect(readSetting('appearance', { theme: 'pink' }).theme).toBe('system');
    expect(readSetting('profile', 'unsinn').name).toBe('');
  });

  it('speichert Änderungen teilweise', async () => {
    database = new CockpitDB(`test-${Math.random()}`);
    await patchSetting('backup', { lastExportAt: 123 }, database);
    await patchSetting('backup', { snoozedUntil: 456 }, database);
    expect(await getSetting('backup', database)).toEqual({ lastExportAt: 123, snoozedUntil: 456, firstUseAt: null });
  });
});
