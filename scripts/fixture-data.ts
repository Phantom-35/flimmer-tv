/**
 * Erzeugt deterministische Testdaten (gestern bis +3 Tage) für E2E-Tests und CI,
 * damit Tests nicht von externen Quellen abhängen.
 *   npx tsx scripts/fixture-data.ts [--out public/data]
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CHANNELS, toPublicChannel } from '../pipeline/channels.ts';
import { finalizeChannel } from '../pipeline/normalize.ts';
import type { RawProgramme } from '../pipeline/raw.ts';
import { addDays, tvDayOf, tvDayRange } from '../src/shared/time.ts';
import { DATA_VERSION, type DataIndex, type DayFile, type DetailsFile } from '../src/shared/types.ts';

const outIdx = process.argv.indexOf('--out');
const outDir = outIdx >= 0 ? process.argv[outIdx + 1]! : 'public/data';

const SHOWS: { t: string; cats: string[]; min: number; st?: string; imdb?: number; d: string }[] = [
  { t: 'Tagesschau', cats: ['Nachrichten'], min: 15, d: 'Die wichtigsten Nachrichten des Tages.' },
  { t: 'Tatort', cats: ['Krimi'], min: 90, st: 'Testfall', d: 'Kommissarin Test ermittelt in einem kniffligen Fall.' },
  { t: 'Die große Testshow', cats: ['Show'], min: 120, d: 'Unterhaltung für die ganze Familie.' },
  { t: 'Naturwunder Europas', cats: ['Dokumentation'], min: 45, d: 'Eine Reise durch die Wildnis.' },
  { t: 'Großstadtrevier', cats: ['Krimiserie'], min: 50, st: 'Folge mit Umlaut', d: 'Die Polizei im Einsatz.' },
  { t: 'Der Testfilm', cats: ['Thriller'], min: 105, imdb: 7.9, d: 'Ein spannender Spielfilm über Software-Tests.' },
  { t: 'Fußball live', cats: ['Fußball'], min: 110, d: 'Live-Übertragung.' },
  { t: 'Die Sendung mit der Maus', cats: ['Kindersendung'], min: 30, d: 'Lach- und Sachgeschichten.' },
];

const now = Date.now();
const today = tvDayOf(now);
const days = [-1, 0, 1, 2, 3].map((n) => addDays(today, n));
const files = new Map<string, DayFile>(days.map((d) => [d, { v: DATA_VERSION, day: d, generatedAt: new Date(now).toISOString(), p: {} }]));

CHANNELS.forEach((ch, ci) => {
  const raws: RawProgramme[] = [];
  const [start] = tvDayRange(days[0]!);
  const [, end] = tvDayRange(days[days.length - 1]!);
  let t = start / 1000;
  let k = ci;
  while (t < end / 1000) {
    const show = SHOWS[k % SHOWS.length]!;
    raws.push({ s: t, e: t + show.min * 60, t: show.t, cats: show.cats, d: show.d, ...(show.st ? { st: show.st } : {}), ...(show.imdb ? { imdb: show.imdb } : {}) });
    t += show.min * 60;
    k++;
  }
  for (const p of finalizeChannel(ch.id, raws, ch.defaultGenre)) {
    const f = files.get(tvDayOf(p.s * 1000));
    if (f) (f.p[ch.id] ??= []).push(p);
  }
});

await rm(outDir, { recursive: true, force: true });
await mkdir(path.join(outDir, 'days'), { recursive: true });
await mkdir(path.join(outDir, 'details'), { recursive: true });
for (const [day, file] of files) {
  const details: DetailsFile = { v: DATA_VERSION, day, x: {} };
  for (const progs of Object.values(file.p)) {
    for (const p of progs) {
      if (p.d) details.x[p.i] = { d: p.d };
      delete p.d;
    }
  }
  await writeFile(path.join(outDir, 'days', `${day}.json`), JSON.stringify(file));
  await writeFile(path.join(outDir, 'details', `${day}.json`), JSON.stringify(details));
}
const index: DataIndex = {
  v: DATA_VERSION,
  generatedAt: new Date(now).toISOString(),
  days,
  channels: CHANNELS.map(toPublicChannel),
  sources: [{ id: 'fixture', name: 'Testdaten', ok: true, count: 0 }],
  stale: [],
};
await writeFile(path.join(outDir, 'index.json'), JSON.stringify(index));
console.log(`Testdaten für ${days.join(', ')} nach ${outDir} geschrieben.`);
