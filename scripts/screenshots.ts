/**
 * Erzeugt README- und Manifest-Screenshots gegen den laufenden Preview-Server.
 *   npm run build && npm run preview   (in einem zweiten Terminal)
 *   npm run screenshots
 */
import { chromium, type Browser } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';

async function shoot(
  browser: Browser,
  opts: { path: string; url: string; width: number; height: number; dark?: boolean; mobile?: boolean; before?: string },
) {
  const ctx = await browser.newContext({
    viewport: { width: opts.width, height: opts.height },
    deviceScaleFactor: 2,
    isMobile: !!opts.mobile,
    hasTouch: !!opts.mobile,
    colorScheme: opts.dark ? 'dark' : 'light',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('flimmer:settings', JSON.stringify({ onboarded: true }));
  });
  await page.goto(`${BASE}/${opts.url}`);
  await page.waitForLoadState('networkidle');
  if (opts.before) await page.click(opts.before);
  await page.waitForTimeout(700);
  await page.screenshot({ path: opts.path });
  await ctx.close();
  console.log('✔', opts.path);
}

const browser = await chromium.launch();
await mkdir('docs/screenshots', { recursive: true });
await mkdir('public/screens', { recursive: true });
const M = { width: 390, height: 844, mobile: true };
const D = { width: 1440, height: 900 };
await shoot(browser, { ...M, path: 'docs/screenshots/mobile-now-light.png', url: '#/jetzt' });
await shoot(browser, { ...M, path: 'docs/screenshots/mobile-now-dark.png', url: '#/jetzt', dark: true });
await shoot(browser, { ...M, path: 'docs/screenshots/mobile-grid-dark.png', url: '#/programm', dark: true });
await shoot(browser, { ...M, path: 'docs/screenshots/mobile-detail-light.png', url: '#/jetzt?zeit=2015', before: '.nowcard-main' });
await shoot(browser, { ...M, path: 'docs/screenshots/mobile-search-light.png', url: '#/suche?q=tatort' });
await shoot(browser, { ...D, path: 'docs/screenshots/desktop-grid-light.png', url: '#/programm' });
await shoot(browser, { ...D, path: 'docs/screenshots/desktop-now-dark.png', url: '#/jetzt', dark: true });
// Manifest-Screenshots (Install-Dialog)
await shoot(browser, { ...M, path: 'public/screens/mobile-now.png', url: '#/jetzt', dark: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', serviceWorkers: 'block', timezoneId: 'Europe/Berlin' });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('flimmer:settings', JSON.stringify({ onboarded: true })));
await page.goto(`${BASE}/#/programm`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(700);
await page.screenshot({ path: 'public/screens/desktop-grid.png' });
console.log('✔ public/screens/desktop-grid.png');
await browser.close();
