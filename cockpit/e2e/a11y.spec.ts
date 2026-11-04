import { mkdirSync, writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Barrierefreiheit: axe (WCAG 2.1 A/AA) auf allen Seiten mit Demo-Daten, hell und dunkel, Handy und Desktop.
const PAGES = [
  '/',
  '/planer',
  '/planer?tab=aufgaben',
  '/planer?tab=lernplan',
  '/planer/pruefung/demo-exam-1',
  '/noten',
  '/noten/fach/demo-subj-3',
  '/noten/promotion',
  '/karten',
  '/karten/deck/demo-deck-1',
  '/karten/lernen/demo-deck-1',
  '/karten/statistik',
  '/klavier',
  '/klavier?tab=metronom',
  '/klavier?tab=repertoire',
  '/klavier/stueck/demo-piece-1',
  '/fokus',
  '/kompass',
  '/kompass?tab=bewerten',
  '/kompass?tab=zeitstrahl',
  '/kompass/option/demo-opt-0',
  '/mehr',
  '/einstellungen',
];

async function setup(page: Page) {
  await page.goto('/willkommen');
  await page.getByLabel('Wie heisst du?').fill('Alex');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Deutsch', exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await page.waitForURL(/\/$/);
  await page.goto('/einstellungen#ueber');
  const version = page.getByRole('button', { name: /^Version/ });
  for (let i = 0; i < 5; i++) await version.click();
  await page.getByRole('switch', { name: 'Demo-Daten laden' }).click();
  await page.getByText('Demo-Daten geladen').waitFor();
}

async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return results.violations.map(
    (v) =>
      `${label} · ${v.id} (${v.impact}): ${v.help} → ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 4)
        .join(' | ')}`,
  );
}

for (const layout of ['handy', 'desktop'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Barrierefreiheit ${layout} ${theme}`, async ({ browser }) => {
      test.setTimeout(240_000);
      const context = await browser.newContext({
        viewport: layout === 'handy' ? { width: 390, height: 844 } : { width: 1440, height: 900 },
        isMobile: layout === 'handy',
        hasTouch: layout === 'handy',
        colorScheme: theme,
        locale: 'de-CH',
        timezoneId: 'Europe/Zurich',
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      mkdirSync('test-results', { recursive: true });
      await setup(page);
      const problems: string[] = [];
      for (const url of PAGES) {
        await page.goto(url);
        const heading = await page
          .locator('h1')
          .first()
          .waitFor({ timeout: 10_000 })
          .then(() => true)
          .catch(() => false);
        if (!heading) problems.push(`${url} · keine Überschrift h1`);
        await page.waitForTimeout(300);
        problems.push(...(await audit(page, url)));
      }
      // Onboarding, Schnellerfassung und Befehlspalette (Dialoge)
      await page.goto('/');
      await page.locator('h1').first().waitFor();
      await page.keyboard.press('n');
      await page.getByRole('dialog').waitFor();
      problems.push(...(await audit(page, 'Schnellerfassung')));
      await page.keyboard.press('Escape');
      await page.keyboard.press('Control+k');
      await page.getByRole('dialog').waitFor();
      problems.push(...(await audit(page, 'Befehlspalette')));
      await context.close();
      writeFileSync(`test-results/a11y-${layout}-${theme}.txt`, problems.join('\n'));
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }
}
