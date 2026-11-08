import { expect, test, type Page } from '@playwright/test';

/** Onboarding überspringen, damit die eigentliche Ansicht bedienbar ist. */
async function skipOnboarding(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('flimmer:settings')) {
      localStorage.setItem('flimmer:settings', JSON.stringify({ onboarded: true }));
    }
  });
}

test.describe('Kernflüsse', () => {
  test('Onboarding mit Senderauswahl', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: 'Willkommen bei Flimmer' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await expect(page.getByRole('heading', { name: 'Welche Sender schaust du?' })).toBeVisible();
    // Hinter dem Dialog darf die Seite nicht mitscrollen.
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
    await page.getByRole('button', { name: 'Keine' }).click();
    // Die Checkboxen sind visuell versteckt; Nutzer klicken die ganze Karte (Label).
    const card = (name: string) => page.locator('label.ob-ch').filter({ has: page.getByText(name, { exact: true }) });
    await card('ZDF').click();
    await card('RTL').click();
    await expect(page.getByRole('checkbox', { name: 'ZDF', exact: true })).toBeChecked();
    await page.getByRole('button', { name: 'Weiter' }).click();
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Jetzt im TV' })).toBeVisible();
    await expect(page.locator('.nowcard')).toHaveCount(2);
  });

  test('Jetzt im TV zeigt laufende Sendungen mit Fortschritt', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/#/jetzt');
    await expect(page.getByRole('heading', { level: 1, name: 'Jetzt im TV' })).toBeVisible();
    await expect(page.locator('.nowcard').first()).toBeVisible();
    await expect(page.getByRole('progressbar').first()).toBeVisible();
    await page.getByRole('radio', { name: '20:15' }).click();
    await expect(page).toHaveURL(/zeit=2015/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('20:15');
  });

  test('Details öffnen, merken und in der Merkliste wiederfinden', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/#/jetzt');
    await page.locator('.nowcard-main').first().click();
    const sheet = page.locator('dialog.sheet');
    await expect(sheet).toBeVisible();
    const title = (await sheet.locator('#sheet-title').textContent())!.trim();
    await sheet.getByRole('button', { name: 'Merken' }).click();
    await expect(sheet.getByRole('button', { name: 'Gemerkt' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await page.goto('/#/merkliste');
    await expect(page.getByRole('button', { name: new RegExp(title.slice(0, 12)) }).first()).toBeVisible();
    await page.reload();
    await expect(page.locator('.watch').first()).toBeVisible();
  });

  test('Programmraster mit Tageswechsel und Tastatursteuerung', async ({ page, isMobile }) => {
    await skipOnboarding(page);
    await page.goto('/#/programm');
    const grid = page.getByRole('grid');
    await expect(grid).toBeVisible();
    await expect(grid.locator('.cell').first()).toBeAttached();
    await page.getByRole('button', { name: /^Morgen/ }).click();
    await expect(page).toHaveURL(/#\/programm\/\d{4}-\d{2}-\d{2}/);
    if (!isMobile) {
      const first = grid.locator('.cell[tabindex="0"]');
      await first.focus();
      const before = await first.getAttribute('data-s');
      await page.keyboard.press('ArrowRight');
      const focused = page.locator('.cell:focus');
      expect(Number(await focused.getAttribute('data-s'))).toBeGreaterThan(Number(before));
      await page.keyboard.press('Enter');
      await expect(page.locator('dialog.sheet')).toBeVisible();
    }
  });

  test('Fehlertolerante Suche', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/#/suche');
    await page.getByRole('searchbox', { name: 'Sendung suchen' }).fill('tatrot');
    await expect(page.locator('.line-title', { hasText: 'Tatort' }).first()).toBeVisible();
    await page.getByRole('searchbox', { name: 'Sendung suchen' }).fill('grossstadtrevier');
    await expect(page.locator('.line-title', { hasText: 'Großstadtrevier' }).first()).toBeVisible();
  });

  test('Einstellungen: Theme und Schriftgröße', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/#/einstellungen');
    await page.getByRole('radio', { name: 'Dunkel' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('radio', { name: 'Groß', exact: true }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--font-scale').trim())).toBe('1.125');
  });

  test('Alle Info-Seiten sind erreichbar und ohne tote Links', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/#/mehr');
    const hrefs = await page.locator('main a[href^="#/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    expect(hrefs.length).toBeGreaterThanOrEqual(8);
    for (const href of hrefs) {
      await page.goto(`/${href}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText('nicht gefunden')).toHaveCount(0);
    }
    await page.goto('/#/seite/impressum');
    await expect(page.getByText('Angaben gemäß § 5 DDG')).toBeVisible();
    await page.goto('/#/seite/datenschutz');
    await expect(page.getByText(/keine Cookies/)).toBeVisible();
  });
});

test.describe('PWA', () => {
  test('Manifest und Service Worker', async ({ page, request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.ok()).toBe(true);
    const manifest = await res.json();
    expect(manifest.lang).toBe('de');
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
    expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(2);
    await skipOnboarding(page);
    await page.goto('/');
    await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.active, null, { timeout: 15000 });
  });

  test('funktioniert offline mit zuletzt geladenen Daten', async ({ page, context }) => {
    await skipOnboarding(page);
    await page.goto('/#/jetzt');
    await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.active, null, { timeout: 15000 });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    // Daten liegen im Cache, sobald der Service Worker sie einmal ausgeliefert hat.
    await page.waitForFunction(
      async () => !!(await caches.match('/data/index.json', { ignoreVary: true })) && (await caches.keys()).includes('flimmer-days'),
      null,
      { timeout: 15000 },
    );
    await page.reload();
    await expect(page.locator('.nowcard').first()).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText(/Offline/).first()).toBeVisible();
    await expect(page.locator('.nowcard').first()).toBeVisible();
    await context.setOffline(false);
  });
});
