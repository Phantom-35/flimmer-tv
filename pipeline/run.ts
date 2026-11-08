/**
 * Daten-Job: holt das TV-Programm, normalisiert es und schreibt statische JSON-Dateien.
 *
 *   npm run data -- [--out public/data] [--previous <URL oder Ordner>] [--strict]
 *
 * --previous: letzter guter Stand (z. B. die Live-Seite). Fällt eine Quelle aus,
 *             werden die betroffenen Sender/Tage von dort übernommen.
 * --strict:   Exit-Code 2, wenn die Datenqualität unter den Schwellwerten liegt
 *             (für Monitoring/Benachrichtigung im GitHub-Actions-Job).
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { addDays, tvDayOf, tvDayRange } from '../src/shared/time.ts';
import { DATA_VERSION, type DataIndex, type DayFile, type DetailsFile, type Programme, type SourceStatus } from '../src/shared/types.ts';
import { fetchArd } from './ard.ts';
import { CHANNELS, toPublicChannel } from './channels.ts';
import { fetchWithRetry } from './http.ts';
import { enrich, finalizeChannel } from './normalize.ts';
import type { RawProgramme } from './raw.ts';
import { fetchXmltv } from './xmltv.ts';

export const XMLTV_URL = process.env.XMLTV_URL ?? 'https://epgshare01.online/epgshare01/epg_ripper_DE1.xml.gz';
const ARD_DAYS_AHEAD = 9;
const MAX_DAYS_AHEAD = 13;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function loadPrevious(location: string | undefined): Promise<{ index?: DataIndex; days: Map<string, DayFile> }> {
  const days = new Map<string, DayFile>();
  if (!location) return { days };
  const isUrl = /^https?:\/\//.test(location);
  const read = async (rel: string): Promise<unknown> => {
    if (isUrl) {
      const res = await fetchWithRetry(`${location.replace(/\/$/, '')}/${rel}`, { retries: 1 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }
    return JSON.parse(await readFile(path.join(location, rel), 'utf8'));
  };
  try {
    const index = (await read('index.json')) as DataIndex;
    if (index.v !== DATA_VERSION) return { days };
    for (const day of index.days) {
      try {
        const file = (await read(`days/${day}.json`)) as DayFile;
        try {
          const det = (await read(`details/${day}.json`)) as DetailsFile;
          for (const progs of Object.values(file.p)) for (const p of progs) Object.assign(p, det.x[p.i] ?? {});
        } catch {
          /* ohne Details weiter */
        }
        days.set(day, file);
      } catch {
        /* einzelner Tag fehlt – egal */
      }
    }
    return { index, days };
  } catch (err) {
    console.warn(`Kein vorheriger Stand unter ${location}: ${(err as Error).message}`);
    return { days };
  }
}

async function main() {
  const outDir = arg('--out') ?? 'public/data';
  const previousLoc = arg('--previous') ?? process.env.PREVIOUS_DATA_URL;
  const strict = process.argv.includes('--strict');
  const now = Date.now();
  const today = tvDayOf(now);
  const firstDay = addDays(today, -1);
  const lastDay = addDays(today, MAX_DAYS_AHEAD);
  const ardDays = Array.from({ length: ARD_DAYS_AHEAD + 2 }, (_, i) => addDays(firstDay, i));
  const sources: SourceStatus[] = [];
  const warnings: string[] = [];

  // Vorherigen Stand parallel laden (lokal vor dem Überschreiben!).
  const previousPromise = loadPrevious(previousLoc ?? (existsSync(path.join(outDir, 'index.json')) ? outDir : undefined));

  console.log(`TV-Tag heute: ${today}. Lade ARD-Programm-API (${ardDays.length} Tage) und XMLTV …`);
  const ardIds = CHANNELS.flatMap((c) => (c.ard ? [c.ard] : []));
  const wantedXmltv = new Set(CHANNELS.flatMap((c) => (c.xmltv ? [c.xmltv] : [])));

  const [ard, xmltv] = await Promise.all([
    fetchArd(ardIds, ardDays),
    fetchXmltv(XMLTV_URL, wantedXmltv).then(
      (data) => ({ data, error: undefined as string | undefined }),
      (err: Error) => ({ data: new Map<string, RawProgramme[]>(), error: err.message }),
    ),
  ]);

  const ardCount = [...ard.data.values()].reduce((n, m) => n + [...m.values()].reduce((k, a) => k + a.length, 0), 0);
  sources.push({
    id: 'ard',
    name: 'ARD-Programm-API',
    ok: ardCount > 0 && ard.failures.length < ard.requests * 0.25,
    count: ardCount,
    ...(ard.failures.length ? { message: `${ard.failures.length} von ${ard.requests} Abrufen fehlgeschlagen` } : {}),
  });
  if (ard.failures.length) warnings.push(...ard.failures.slice(0, 10));
  const xmltvCount = [...xmltv.data.values()].reduce((n, a) => n + a.length, 0);
  sources.push({
    id: 'xmltv',
    name: 'XMLTV (epgshare01)',
    ok: !xmltv.error && xmltvCount > 0,
    count: xmltvCount,
    ...(xmltv.error ? { message: xmltv.error } : {}),
  });
  for (const id of wantedXmltv) if (!xmltv.error && !xmltv.data.has(id)) warnings.push(`XMLTV: keine Daten für ${id}`);

  // Je Sender zusammenführen.
  const perChannel = new Map<string, Programme[]>();
  for (const ch of CHANNELS) {
    const xml = ch.xmltv ? xmltv.data.get(ch.xmltv) ?? [] : [];
    let raws: RawProgramme[] = [];
    if (ch.ard && ard.data.has(ch.ard)) {
      const byDay = ard.data.get(ch.ard)!;
      for (const day of ardDays) {
        const [from, to] = tvDayRange(day);
        const xmlDay = xml.filter((p) => p.s * 1000 >= from && p.s * 1000 < to);
        const ardDay = byDay.get(day);
        if (ardDay?.length) raws.push(...enrich(ardDay, xml));
        else raws.push(...xmlDay); // ARD-Tag fehlt -> XMLTV als Ersatz
      }
      // XMLTV über den ARD-Zeitraum hinaus (selten) anhängen
      const ardEnd = tvDayRange(ardDays[ardDays.length - 1]!)[1];
      raws.push(...xml.filter((p) => p.s * 1000 >= ardEnd));
      // Doppelte durch Tagesgrenzen der ARD-API entfernen
      const seen = new Set<string>();
      raws = raws.filter((p) => {
        const k = `${p.s}|${p.t}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    } else {
      raws = xml;
    }
    perChannel.set(ch.id, finalizeChannel(ch.id, raws, ch.defaultGenre));
  }

  // In TV-Tage aufteilen. Sendungen, die über den Tagesbeginn (05:00) laufen,
  // stehen zusätzlich am Anfang des Folgetags, damit jede Tagesdatei vollständig ist.
  const dayFiles = new Map<string, DayFile>();
  const generatedAt = new Date(now).toISOString();
  for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) {
    dayFiles.set(day, { v: DATA_VERSION, day, generatedAt, p: {} });
  }
  for (const [chId, progs] of perChannel) {
    for (const p of progs) {
      const day = tvDayOf(p.s * 1000);
      const file = dayFiles.get(day);
      if (file) (file.p[chId] ??= []).push(p);
      const nextDay = addDays(day, 1);
      const [nextStart] = tvDayRange(nextDay);
      if (p.e * 1000 > nextStart) {
        const nf = dayFiles.get(nextDay);
        if (nf) (nf.p[chId] ??= []).push(p);
      }
    }
  }

  // Fallback auf den letzten guten Stand für Sender/Tage ohne neue Daten.
  const previous = await previousPromise;
  const stale = new Set<string>();
  for (const [day, file] of dayFiles) {
    const old = previous.days.get(day);
    if (!old) continue;
    for (const ch of CHANNELS) {
      const fresh = file.p[ch.id];
      const before = old.p[ch.id];
      if ((!fresh || fresh.length === 0) && before?.length) {
        file.p[ch.id] = before;
        stale.add(ch.id);
      }
    }
  }
  if (stale.size) warnings.push(`Aus letztem Stand übernommen: ${[...stale].join(', ')}`);

  // Leere Randtage weglassen.
  const days = [...dayFiles.keys()].filter((d) => Object.values(dayFiles.get(d)!.p).some((a) => a.length > 0));

  for (const dir of ['days', 'details']) {
    await rm(path.join(outDir, dir), { recursive: true, force: true });
    await mkdir(path.join(outDir, dir), { recursive: true });
  }
  let totalBytes = 0;
  for (const day of days) {
    // Schlanke Tagesdatei (Raster, Jetzt, Suche) + Details (Beschreibung, Besetzung) getrennt.
    const file = dayFiles.get(day)!;
    const lean: DayFile = { ...file, p: {} };
    const details: DetailsFile = { v: DATA_VERSION, day, x: {} };
    for (const [chId, progs] of Object.entries(file.p)) {
      lean.p[chId] = progs.map((p) => {
        const { d, dir, cast, ...rest } = p;
        if (d || dir || cast) details.x[p.i] = { ...(d ? { d } : {}), ...(dir ? { dir } : {}), ...(cast ? { cast } : {}) };
        return rest;
      });
    }
    const leanJson = JSON.stringify(lean);
    const detailsJson = JSON.stringify(details);
    totalBytes += leanJson.length + detailsJson.length;
    await writeFile(path.join(outDir, 'days', `${day}.json`), leanJson);
    await writeFile(path.join(outDir, 'details', `${day}.json`), detailsJson);
  }
  const index: DataIndex = {
    v: DATA_VERSION,
    generatedAt,
    days,
    channels: CHANNELS.map(toPublicChannel),
    sources,
    stale: [...stale],
  };
  await writeFile(path.join(outDir, 'index.json'), JSON.stringify(index));

  // Gesundheitscheck
  const todayFile = dayFiles.get(today);
  const withToday = CHANNELS.filter((c) => (todayFile?.p[c.id]?.length ?? 0) > 3);
  const missingToday = CHANNELS.filter((c) => !withToday.includes(c)).map((c) => c.id);
  const tomorrowFile = dayFiles.get(addDays(today, 1));
  const withTomorrow = CHANNELS.filter((c) => (tomorrowFile?.p[c.id]?.length ?? 0) > 3).length;
  const problems: string[] = [];
  if (sources.some((s) => !s.ok)) problems.push(`Quelle gestört: ${sources.filter((s) => !s.ok).map((s) => s.name).join(', ')}`);
  if (withToday.length < CHANNELS.length * 0.85) problems.push(`Nur ${withToday.length}/${CHANNELS.length} Sender haben Daten für heute`);
  if (withTomorrow < CHANNELS.length * 0.8) problems.push(`Nur ${withTomorrow}/${CHANNELS.length} Sender haben Daten für morgen`);
  const status = {
    generatedAt,
    today,
    days,
    sources,
    channelsWithToday: withToday.length,
    channelsTotal: CHANNELS.length,
    missingToday,
    stale: [...stale],
    warnings,
    problems,
    bytes: totalBytes,
  };
  await writeFile(path.join(outDir, 'status.json'), JSON.stringify(status, null, 2));

  console.log(`Fertig: ${days.length} Tage (${days[0]} – ${days[days.length - 1]}), ${(totalBytes / 1024).toFixed(0)} KiB unkomprimiert.`);
  for (const s of sources) console.log(`  ${s.ok ? '✔' : '✘'} ${s.name}: ${s.count} Sendungen${s.message ? ` (${s.message})` : ''}`);
  console.log(`  Sender mit Daten für heute: ${withToday.length}/${CHANNELS.length}${missingToday.length ? ` – fehlt: ${missingToday.join(', ')}` : ''}`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  if (problems.length) {
    console.error(`PROBLEME:\n  - ${problems.join('\n  - ')}`);
    if (strict) process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
