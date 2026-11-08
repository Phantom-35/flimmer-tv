import { fetchWithRetry, mapLimit } from './http.ts';
import { cleanText, splitEpisodeFromTitle, type RawProgramme } from './raw.ts';

/**
 * ARD-Programm-API (dieselbe Schnittstelle, die programm.ard.de nutzt).
 * Liefert Das Erste, Dritte, ONE, alpha, tagesschau24, 3sat, arte, KiKA, phoenix
 * für ca. 8 Tage. Ein Request je Sender und Tag.
 */
const BASE = 'https://programm-api.ard.de/program/api/program';

interface ArdSlot {
  title?: string;
  coreTitle?: string;
  subline?: string;
  synopsis?: string;
  broadcastedOn?: string;
  broadcastEnd?: string;
  maturityContentRating?: string;
  binaryFeatures?: string[];
  isLocal?: boolean;
  type?: string;
}

interface ArdResponse {
  channels?: { id: string; timeSlots?: ArdSlot[][] }[];
}

export function mapArdSlot(slot: ArdSlot): RawProgramme | undefined {
  if (!slot.broadcastedOn || !slot.title) return undefined;
  const s = Math.floor(Date.parse(slot.broadcastedOn) / 1000);
  if (!Number.isFinite(s)) return undefined;
  const eRaw = slot.broadcastEnd ? Math.floor(Date.parse(slot.broadcastEnd) / 1000) : NaN;
  const { title, ep } = splitEpisodeFromTitle(cleanText(slot.title) ?? slot.title);
  const out: RawProgramme = { s, t: title };
  if (Number.isFinite(eRaw)) out.e = eRaw;
  if (ep) out.ep = ep;
  const st = cleanText(slot.subline);
  if (st && st !== title) out.st = st;
  let d = cleanText(slot.synopsis);
  // Die ARD-Beschreibung beginnt oft mit dem Untertitel als eigener Zeile -> nicht doppeln.
  if (d && st && d.startsWith(st)) d = d.slice(st.length).replace(/^\s+/, '') || undefined;
  if (d) out.d = d;
  const fsk = /FSK(\d+)/.exec(slot.maturityContentRating ?? '');
  if (fsk?.[1]) out.fsk = Number(fsk[1]);
  const f = slot.binaryFeatures ?? [];
  if (f.includes('UT')) out.ut = 1;
  if (f.includes('AD')) out.ad = 1;
  if (f.includes('DGS')) out.dgs = 1;
  if (/\b(Wdh\.?|Wiederholung)\b/i.test(slot.subline ?? '')) out.r = 1;
  if (/\blive\b/i.test(slot.title) || /^live/i.test(slot.subline ?? '')) out.l = 1;
  if (slot.isLocal) out.local = true;
  return out;
}

export interface ArdResult {
  /** channelId (ARD) -> day -> Sendungen. Fehlende Tage = Fehler/keine Daten. */
  data: Map<string, Map<string, RawProgramme[]>>;
  requests: number;
  failures: string[];
}

export async function fetchArd(ardIds: string[], days: string[]): Promise<ArdResult> {
  const jobs = ardIds.flatMap((id) => days.map((day) => ({ id, day })));
  const data = new Map<string, Map<string, RawProgramme[]>>();
  const failures: string[] = [];
  await mapLimit(jobs, 4, async ({ id, day }) => {
    const url = `${BASE}?day=${day}&channelIds=${encodeURIComponent(id)}`;
    try {
      const res = await fetchWithRetry(url, { retries: 2 });
      if (res.status === 404) return; // Tag noch nicht veröffentlicht
      const json = (await res.json()) as ArdResponse;
      const ch = json.channels?.find((c) => c.id === id);
      const slots = ch?.timeSlots?.flat() ?? [];
      const progs = slots.map(mapArdSlot).filter((p): p is RawProgramme => !!p);
      if (!progs.length) return;
      if (!data.has(id)) data.set(id, new Map());
      data.get(id)!.set(day, progs);
    } catch (err) {
      failures.push(`${id}/${day}: ${(err as Error).message}`);
    }
  });
  return { data, requests: jobs.length, failures };
}
