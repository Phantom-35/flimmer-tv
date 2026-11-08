/**
 * Erzeugt alle PNG-Icons aus SVG-Vorlagen (Playwright/Chromium, keine Bildbibliothek nötig).
 *   npm run icons
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const ORANGE = '#e25a1c';
const DARK = '#15130f';

/** Logo-Marke: Bildschirm mit drei Programmzeilen und "Live"-Punkt. scale = Anteil der Kantenlänge. */
function mark(scale: number, bg: string | null, radius = 0): string {
  const s = 512;
  const w = s * scale;
  const h = w * (32 / 42);
  const x = (s - w) / 2;
  const y = (s - h) / 2;
  const u = w / 42; // Einheit im 48er-Raster
  const line = (yy: number, len: number) =>
    `<path d="M${x + 10.5 * u} ${y + yy * u}h${len * u}" stroke="#fff" stroke-width="${3.6 * u}" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    ${bg ? `<rect width="${s}" height="${s}" rx="${radius}" fill="${bg}"/>` : ''}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${10 * u}" fill="${ORANGE}"/>
    ${line(11.5, 21)}${line(18, 14.5)}${line(24.5, 8)}
    <circle cx="${x + 31.5 * u}" cy="${y + 23.5 * u}" r="${3.4 * u}" fill="#fff"/>
  </svg>`;
}

function glyph(kind: 'now' | 'prime' | 'search'): string {
  const content = {
    now: `<rect x="22" y="30" width="52" height="38" rx="8" fill="none" stroke="#fff" stroke-width="7"/><path d="M38 20l10 10 10-10" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
    prime: `<text x="48" y="60" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="800" font-size="27" fill="#fff">20:15</text>`,
    search: `<circle cx="43" cy="43" r="17" fill="none" stroke="#fff" stroke-width="7"/><path d="M56 56l14 14" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`,
  }[kind];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="${ORANGE}"/>${content}</svg>`;
}

const TARGETS: { file: string; svg: string; size: number }[] = [
  { file: 'icon-192.png', svg: mark(0.84, null), size: 192 },
  { file: 'icon-512.png', svg: mark(0.84, null), size: 512 },
  // maskable: Motiv innerhalb der sicheren Zone (80 %), vollflächiger Hintergrund
  { file: 'maskable-512.png', svg: mark(0.58, DARK), size: 512 },
  { file: 'apple-touch-icon.png', svg: mark(0.68, DARK), size: 180 },
  { file: 'badge-96.png', svg: mark(0.9, null), size: 96 },
  { file: 'shortcut-now.png', svg: glyph('now'), size: 96 },
  { file: 'shortcut-prime.png', svg: glyph('prime'), size: 96 },
  { file: 'shortcut-search.png', svg: glyph('search'), size: 96 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
await mkdir('public/icons', { recursive: true });
for (const t of TARGETS) {
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${Buffer.from(t.svg).toString('base64')}" width="${t.size}" height="${t.size}"></body></html>`,
  );
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: t.size, height: t.size } });
  await writeFile(`public/icons/${t.file}`, png);
  console.log('✔', t.file);
}
await writeFile('public/icons/logo.svg', mark(0.84, null));
await browser.close();
