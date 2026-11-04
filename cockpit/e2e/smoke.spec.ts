import { expect, test } from '@playwright/test';

test('Onboarding, Note erfassen und nach dem Neuladen noch da', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/willkommen$/);

  // 1 Name
  await page.getByLabel('Wie heisst du?').fill('Johann');
  await page.getByRole('button', { name: 'Weiter' }).click();
  // 2 Fächer
  await page.getByRole('button', { name: 'Mathematik' }).click();
  await page.getByRole('button', { name: 'Französisch' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  // 3 Semester (Vorschlag übernehmen)
  await expect(page.getByLabel('Bezeichnung')).not.toHaveValue('');
  await page.getByRole('button', { name: 'Weiter' }).click();
  // 4 Promotionsregeln
  await expect(page.getByText('Bitte mit dem Reglement deiner Schule prüfen')).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();
  // 5 Abschluss
  await page.getByRole('button', { name: 'Los geht’s' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Johann');

  // Schnellerfassung: Plus → Note
  await page.getByRole('button', { name: 'Schnell erfassen' }).click();
  await page.getByRole('button', { name: /^Note/ }).click();
  await page.getByRole('radio', { name: 'Mathematik' }).click();
  await page.getByLabel('Note', { exact: true }).fill('5,5');
  await page.getByRole('button', { name: 'Note speichern' }).click();
  await expect(page.getByText('Note 5.5 in Mathematik gespeichert')).toBeVisible();

  await page.getByRole('link', { name: 'Noten' }).click();
  await expect(page.getByText('5.5', { exact: true })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/noten$/);
  await expect(page.getByText('5.5', { exact: true })).toBeVisible();
});

test('Rückgängig nach dem Löschen einer Aufgabe', async ({ page }) => {
  await page.goto('/willkommen');
  await page.getByLabel('Wie heisst du?').fill('Test');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Deutsch' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/planer?tab=aufgaben');
  await page.getByRole('button', { name: 'Aufgabe', exact: true }).click();
  await page.getByLabel('Aufgabe', { exact: true }).fill('Aufsatz abgeben');
  await page.getByRole('button', { name: 'Morgen' }).click();
  await page.getByRole('button', { name: 'Aufgabe speichern' }).click();
  await expect(page.getByText('Aufsatz abgeben')).toBeVisible();

  await page.getByRole('button', { name: 'Aufgabe «Aufsatz abgeben» löschen' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Aufgabe «Aufsatz abgeben» gelöscht' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Aufsatz abgeben erledigt' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(page.getByRole('checkbox', { name: 'Aufsatz abgeben erledigt' })).toBeVisible();
});
