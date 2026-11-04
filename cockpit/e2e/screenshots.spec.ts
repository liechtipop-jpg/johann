import { test, type Browser, type Page } from '@playwright/test';

// Visuelle Kontrolle: alle Seiten mit Demo-Daten in 390 und 1440 px, hell und dunkel → screenshots/
const PAGES: Array<[string, string]> = [
  ['heute', '/'],
  ['planer-pruefungen', '/planer'],
  ['planer-aufgaben', '/planer?tab=aufgaben'],
  ['planer-lernplan', '/planer?tab=lernplan'],
  ['pruefung', '/planer/pruefung/demo-exam-1'],
  ['noten', '/noten'],
  ['noten-fach', '/noten/fach/demo-subj-3'],
  ['promotion', '/noten/promotion'],
  ['karten', '/karten'],
  ['deck', '/karten/deck/demo-deck-1'],
  ['lernen', '/karten/lernen/demo-deck-1'],
  ['karten-statistik', '/karten/statistik'],
  ['klavier', '/klavier'],
  ['klavier-metronom', '/klavier?tab=metronom'],
  ['klavier-repertoire', '/klavier?tab=repertoire'],
  ['klavier-stueck', '/klavier/stueck/demo-piece-1'],
  ['fokus', '/fokus'],
  ['kompass', '/kompass'],
  ['kompass-bewerten', '/kompass?tab=bewerten'],
  ['kompass-zeitstrahl', '/kompass?tab=zeitstrahl'],
  ['kompass-option', '/kompass/option/demo-opt-0'],
  ['mehr', '/mehr'],
  ['einstellungen', '/einstellungen'],
];

const SIZES = [
  { name: '390', width: 390, height: 844, mobile: true },
  { name: '1440', width: 1440, height: 900, mobile: false },
];

async function newPage(browser: Browser, size: (typeof SIZES)[number], theme: 'light' | 'dark'): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    colorScheme: theme,
    locale: 'de-CH',
    timezoneId: 'Europe/Zurich',
    hasTouch: size.mobile,
    isMobile: size.mobile,
  });
  return context.newPage();
}

async function onboard(page: Page) {
  await page.goto('/willkommen');
  await page.getByLabel('Wie heisst du?').fill('Alex');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Deutsch', exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await page.waitForURL(/\/$/);
}

async function loadDemo(page: Page) {
  await page.goto('/einstellungen#ueber');
  const version = page.getByRole('button', { name: /^Version/ });
  for (let i = 0; i < 5; i++) await version.click();
  await page.getByRole('switch', { name: 'Demo-Daten laden' }).click();
  await page.getByText('Demo-Daten geladen').waitFor();
}

for (const size of SIZES) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Screenshots ${size.name} px ${theme}`, async ({ browser }) => {
      test.setTimeout(180_000);
      const prefix = `screenshots/${size.name}-${theme}`;

      const fresh = await newPage(browser, size, theme);
      await fresh.goto('/willkommen');
      await fresh.getByLabel('Wie heisst du?').fill('Alex');
      await fresh.getByRole('button', { name: 'Weiter' }).click();
      for (const s of ['Deutsch', 'Französisch', 'Englisch', 'Mathematik'])
        await fresh.getByRole('button', { name: s, exact: true }).click();
      await fresh.screenshot({ path: `${prefix}-onboarding.png`, fullPage: true });

      const page = await newPage(browser, size, theme);
      await onboard(page);
      await loadDemo(page);
      for (const [name, url] of PAGES) {
        await page.goto(url);
        await page
          .locator('main h1, h1')
          .first()
          .waitFor({ timeout: 10_000 })
          .catch(() => undefined);
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${prefix}-${name}.png`, fullPage: true });
      }
      await page.goto('/');
      await page.locator('h1').first().waitFor();
      if (size.mobile) await page.getByRole('button', { name: 'Schnell erfassen' }).click();
      else await page.keyboard.press('n');
      await page.getByRole('button', { name: /^Prüfung/ }).click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${prefix}-erfassen-pruefung.png` });
    });
  }
}
