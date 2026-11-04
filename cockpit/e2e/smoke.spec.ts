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

test('Noten: Zeugnisnote, Wunschnote und Promotion', async ({ page }) => {
  await page.goto('/willkommen');
  await page.getByLabel('Wie heisst du?').fill('Test');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Mathematik' }).click();
  await page.getByRole('button', { name: 'Physik' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await expect(page).toHaveURL(/\/$/);

  async function addGrade(subject: string, value: string) {
    await page.getByRole('button', { name: 'Schnell erfassen' }).click();
    await page.getByRole('button', { name: /^Note/ }).click();
    await page.getByRole('radio', { name: subject }).click();
    await page.getByLabel('Note', { exact: true }).fill(value);
    await page.getByRole('button', { name: 'Note speichern' }).click();
    await expect(page.getByText(`in ${subject} gespeichert`)).toBeVisible();
  }
  await addGrade('Mathematik', '5');
  await addGrade('Mathematik', '4.5'); // Schnitt 4.75 → Zeugnisnote 5
  await addGrade('Physik', '3.5');

  await page.goto('/noten');
  const math = page.getByRole('link', { name: /Mathematik/ });
  await expect(math).toContainText('5');
  // Plus 1, Minus 0.5 doppelt = 1 → Reserve 0 → knapp
  await expect(page.getByText('Stand jetzt knapp')).toBeVisible();

  await math.click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Mathematik');
  await page.getByLabel('Zeugnisnote mindestens').selectOption('5.5');
  // (9.5 + x) / 3 ≥ 5.25 → x ≥ 6.25 → nicht erreichbar
  await expect(page.getByText('Nicht erreichbar')).toBeVisible();
  await page.getByLabel('Zeugnisnote mindestens').selectOption('5');
  await expect(page.getByText('Rundungsgrenze: Ab einem Schnitt von 4.75 wird auf 5 gerundet.')).toBeVisible();

  await page.goto('/noten/promotion');
  await expect(page.getByText('Doppelte Kompensation', { exact: true })).toBeVisible();
  await expect(page.getByRole('row', { name: /Physik/ })).toContainText('−1');
});

test('Prüfung mit Themen erzeugt einen Lernplan; Einheiten abhaken; .ics-Export', async ({ page }) => {
  await page.goto('/willkommen');
  await page.getByLabel('Wie heisst du?').fill('Test');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Französisch' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole('button', { name: 'Schnell erfassen' }).click();
  await page.getByRole('button', { name: /^Prüfung/ }).click();
  await page.getByLabel('Titel').fill('Unité 4');
  await page.getByLabel('Neues Thema').fill('Passé composé');
  await page.keyboard.press('Enter');
  await page.getByLabel('Neues Thema').fill('Vocabulaire');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Prüfung speichern' }).click();
  await expect(page.getByText(/Lernplan mit \d+ Einheiten/)).toBeVisible();

  await page.goto('/planer?tab=lernplan');
  const first = page.getByRole('checkbox', { name: /erledigt$/ }).first();
  await first.click();
  await expect(first).toHaveAttribute('aria-checked', 'true');

  await page.goto('/planer');
  await page.getByRole('link', { name: /Unité 4/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Unité 4');
  await expect(page.getByRole('img', { name: /Prozent gelernt/ })).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Kalender' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.ics$/);
});

test('Karteikarten: Startdeck, Umdrehen, Bewerten und Eintippen mit Akzent-Hinweis', async ({ page }) => {
  await page.goto('/willkommen');
  await page.getByLabel('Wie heisst du?').fill('Test');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Französisch' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('switch', { name: 'Startdeck Französisch «Montpellier»' }).click();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/karten');
  const deck = page.getByRole('article').filter({ hasText: 'Französisch – Montpellier' });
  await expect(deck).toContainText('120 Karten');
  await expect(deck).toContainText('20 neu');
  await deck.getByRole('link', { name: 'Lernen' }).click();

  await expect(page.getByText('Hallo, wie geht’s?').first()).toBeVisible();
  await page.getByRole('button', { name: 'Antwort zeigen' }).click();
  await expect(page.getByRole('group', { name: 'Wie gut wusstest du es?' })).toBeVisible();
  await page.keyboard.press('3');
  await expect(page.getByText('noch 20')).toBeVisible(); // Karte kommt nach 10 min wieder (Lernschritt) → hinten angehängt
  await page.getByRole('button', { name: 'Letzte Bewertung zurücknehmen' }).click();
  await expect(page.getByRole('button', { name: 'Letzte Bewertung zurücknehmen' })).toBeDisabled();
  await expect(page.getByText('noch 20')).toBeVisible();

  await page.goto('/karten');
  await page
    .getByRole('article')
    .filter({ hasText: 'Französisch – Montpellier' })
    .getByRole('link', { name: /Montpellier/ })
    .click();
  await page.getByRole('link', { name: 'Eintippen' }).click();
  await page.getByLabel('Deine Antwort').fill('salut, ca va');
  await page.getByRole('button', { name: 'Prüfen' }).click();
  await expect(page.getByText('Fast richtig')).toBeVisible();
  await expect(page.getByText('Achte auf die Akzente: «ça»')).toBeVisible();
});

async function quickOnboarding(page: import('@playwright/test').Page, subject: string, switches: string[] = []) {
  await page.goto('/willkommen');
  await page.getByLabel('Wie heisst du?').fill('Test');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: subject }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Weiter' }).click();
  for (const name of switches) await page.getByRole('switch', { name }).click();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await expect(page).toHaveURL(/\/$/);
}

test('Klavier: Vorschläge, Abschnitt mit Tempo, Lektionsnotiz, Übungszeit und Metronom', async ({ page }) => {
  await quickOnboarding(page, 'Musik', ['Klavierstücke fürs Repertoire']);

  // Widget auf «Heute» führt mit einem Tap zum Repertoire-Stück
  await page.goto('/klavier?tab=repertoire');
  await page.getByRole('link', { name: /Cordelia/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Cordelia' })).toBeVisible();
  await expect(page.getByText('Juan Arenosa')).toBeVisible();

  await page.getByRole('button', { name: 'Abschnitt', exact: true }).click();
  await page.getByLabel('Takte').fill('1–16');
  await page.getByLabel('Tempo jetzt').fill('60');
  await page.getByLabel('Ziel-Tempo').fill('80');
  await page.getByRole('button', { name: 'Hinzufügen' }).click();
  await expect(page.getByText('60 → 80 BPM')).toBeVisible();
  await expect(page.getByRole('img', { name: '75 Prozent des Ziel-Tempos' })).toBeVisible();

  await page.getByLabel('Neue Lektionsnotiz').fill('Linke Hand legato üben');
  await page.getByRole('button', { name: 'Notiz speichern' }).click();
  await expect(page.getByText('Linke Hand legato üben')).toBeVisible();

  // Übungszeit nachtragen → Streak und Wochenziel
  await page.goto('/klavier');
  await page.getByRole('button', { name: 'Nachtragen' }).click();
  await page.getByLabel('Stück').last().selectOption({ label: 'Cordelia' });
  await page.getByRole('button', { name: 'Eintragen' }).click();
  await expect(page.getByRole('status').filter({ hasText: '30 min eingetragen' })).toBeVisible();
  await expect(page.getByText('1 Tag in Folge')).toBeVisible();
  await expect(page.getByText('30 min von 2 h')).toBeVisible();

  // Metronom über den Link aus dem Abschnitt (Tempo wird übernommen)
  await page.goto('/klavier?tab=metronom&bpm=96');
  await expect(page.getByRole('slider', { name: 'Tempo in BPM' })).toHaveValue('96');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.locator('li[aria-current="step"]')).toHaveCount(1, { timeout: 5000 });
  await page.getByRole('button', { name: 'Stopp', exact: true }).click();
  await expect(page.locator('li[aria-current="step"]')).toHaveCount(0);

  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Klavier' })).toContainText('1 Tag in Folge');
});

test('Fokus-Timer: läuft nach dem Neuladen weiter und speichert die Fokuszeit', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-04T09:00:00') });
  await quickOnboarding(page, 'Englisch');

  await page.goto('/fokus');
  await page.getByLabel('Fach').selectOption({ label: 'Englisch' });
  await page.getByRole('button', { name: 'Fokus starten' }).click();
  await expect(page.getByRole('timer')).toContainText('läuft bis');
  await page.reload();
  await expect(page.getByRole('timer')).toContainText('läuft bis');

  // 25 Minuten später: Fokusrunde fertig, Pause läuft automatisch, Zeit ist gespeichert
  await page.clock.fastForward('25:05');
  await expect(page.getByRole('status').filter({ hasText: 'Fokusrunde geschafft' })).toBeVisible();
  await expect(page.getByRole('timer')).toContainText('Kurze Pause');
  await expect(page.getByRole('region', { name: 'Letzte Fokuszeiten' })).toContainText('25 min');
  await page.getByRole('button', { name: 'Stopp' }).click();
  await expect(page.getByRole('timer')).toContainText('bereit');

  // FCE-Vorlage mit den offiziellen Zeiten
  await page.getByRole('radio', { name: 'FCE-Simulation' }).click();
  await expect(page.getByRole('timer')).toContainText('Reading & Use of English');
  await expect(page.getByRole('timer')).toContainText('1:15:00');
  await expect(page.getByRole('link', { name: /Cambridge English/ })).toHaveAttribute('href', /cambridgeenglish\.org/);

  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Fokuszeit' })).toContainText('25 min');
});

test('Studienwahl-Kompass: Vorschläge, Bewerten, Ranking mit Analyse, Zeitstrahl und Option', async ({ page }) => {
  await quickOnboarding(page, 'Mathematik');
  await page.goto('/kompass');
  await page.getByRole('button', { name: 'Vorschläge übernehmen' }).click();
  await expect(page.getByRole('status').filter({ hasText: '6 Optionen, 10 Kriterien, 6 Termine übernommen' })).toBeVisible();

  const mavt = 'ETH Maschineningenieurwissenschaften (BSc) → MTEC (MSc)';
  await page.getByRole('radio', { name: 'Bewerten' }).click();
  await page.getByLabel(`«${mavt}» bei «Interesse am Stoff»`).selectOption('9');
  await page.getByLabel('«ETH Informatik» bei «Interesse am Stoff»').selectOption('7');

  await page.getByRole('radio', { name: 'Ranking' }).click();
  const ranking = page.getByRole('region', { name: 'Ranking' });
  await expect(ranking.getByRole('listitem').first()).toContainText(mavt);
  await expect(ranking.getByRole('listitem').first()).toContainText('9.0');
  const analysis = page.getByRole('region', { name: 'Was müsste sich ändern?' });
  await expect(analysis).toContainText('«ETH Informatik» liegt 2.0 Punkte hinter');
  await expect(analysis).toContainText('«Interesse am Stoff» von 7 auf 10');
  await expect(analysis).toContainText('Keine einzelne Gewichtung reicht');

  await page.getByRole('radio', { name: 'Zeitstrahl' }).click();
  const deadline = page.getByRole('listitem').filter({ hasText: 'ETH Zürich: Anmeldeschluss Bachelor' });
  await expect(deadline).toContainText(/30\. April/);
  await expect(deadline.getByRole('link', { name: 'Offizielle Seite' })).toHaveAttribute('href', /^https:\/\/ethz\.ch\//);
  await expect(page.getByRole('listitem').filter({ hasText: 'Stanford MS&E' })).toContainText('Datum noch offen');

  await page.goto('/kompass');
  await ranking.getByRole('link', { name: /ETH Informatik/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'ETH Informatik' })).toBeVisible();
  await page.getByLabel('Dafür spricht: neuer Punkt').fill('Sehr gefragt');
  await page.getByRole('button', { name: 'Dafür spricht: hinzufügen' }).click();
  await expect(page.getByText('Sehr gefragt')).toBeVisible();
  await page.getByLabel('Adresse des Links').fill('keine-adresse');
  await page.getByRole('button', { name: 'Link hinzufügen' }).click();
  await expect(page.getByText('Bitte eine vollständige Adresse mit https:// eingeben.')).toBeVisible();
  await page.getByLabel('Bezeichnung des Links').fill('Studiengang');
  await page.getByLabel('Adresse des Links').fill('https://example.org/informatik');
  await page.getByRole('button', { name: 'Link hinzufügen' }).click();
  await expect(page.getByRole('link', { name: 'Studiengang' })).toHaveAttribute('href', 'https://example.org/informatik');
});

test('Offline: nach dem ersten Besuch läuft die App ohne Netz', async ({ page, context }) => {
  await quickOnboarding(page, 'Deutsch');
  // Warten, bis der Service Worker alles vorab gespeichert hat und die Seite steuert
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Test');
  // Direkt aufgerufene Seite (Navigation) und nachgeladene Seite (Lazy-Chunk) ohne Netz
  await page.goto('/kompass');
  await expect(page.getByRole('heading', { level: 1, name: 'Studienwahl-Kompass' })).toBeVisible();
  await page.getByRole('link', { name: 'Noten' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Noten' })).toBeVisible();
  await page.goto('/klavier?tab=metronom');
  await expect(page.getByRole('slider', { name: 'Tempo in BPM' })).toBeVisible();
  await context.setOffline(false);
});
