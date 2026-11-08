import { gunzipSync } from 'node:zlib';
import { XMLParser } from 'fast-xml-parser';
import { fetchWithRetry } from './http.ts';
import { cleanText, type RawProgramme } from './raw.ts';

/** XMLTV-Zeitformat "20261108013800 +0000" -> Unix-Sekunden. */
export function parseXmltvTime(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4})?/.exec(v.trim());
  if (!m) return undefined;
  const [, y, mo, d, h, mi, s = '00', tz = '+0000'] = m;
  const utc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  const sign = tz.startsWith('-') ? -1 : 1;
  const off = sign * (Number(tz.slice(1, 3)) * 60 + Number(tz.slice(3, 5)));
  return Math.floor((utc - off * 60000) / 1000);
}

/** "S1 E3/30" -> "Staffel 1, Folge 3/30"; "E2" -> "Folge 2". */
export function formatOnscreenEpisode(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const m = /^\s*(?:S(\d+))?\s*(?:E(\d+)(?:\/(\d+))?)?\s*$/i.exec(v);
  if (!m || (!m[1] && !m[2])) return cleanText(v);
  const parts: string[] = [];
  if (m[1]) parts.push(`Staffel ${Number(m[1])}`);
  if (m[2]) parts.push(`Folge ${Number(m[2])}${m[3] ? `/${Number(m[3])}` : ''}`);
  return parts.join(', ');
}

/**
 * Beschreibungen aus der XMLTV-Sammlung enthalten oft redaktionelle Kritiken.
 * Um nur den inhaltlichen Kern zu übernehmen (Urheberrecht, siehe docs/DATA_SOURCES.md),
 * wird auf den ersten Absatz und max. ~500 Zeichen an einer Satzgrenze gekürzt.
 */
export function shortenDescription(d: string | undefined, max = 500): string | undefined {
  if (!d) return undefined;
  const first = d.split(/\n+/)[0]!.trim();
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return lastStop > max * 0.5 ? cut.slice(0, lastStop + 1) : `${cut.replace(/\s+\S*$/, '')} …`;
}

type Node = Record<string, unknown>;

function text(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    // bevorzugt deutsche Variante
    const de = v.find((x) => (x as Node)?.['@_lang'] === 'de');
    return text(de ?? v[0]);
  }
  if (typeof v === 'object') return text((v as Node)['#text']);
  return undefined;
}

function arr(v: unknown): unknown[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

const AGE_SYSTEMS = /^(FSK|Freiwillige Selbstkontrolle)/i;

export function mapXmltvProgramme(p: Node): { channel: string; prog: RawProgramme } | undefined {
  const channel = p['@_channel'];
  const s = parseXmltvTime(p['@_start'] as string | undefined);
  const title = cleanText(text(p.title));
  if (typeof channel !== 'string' || s === undefined || !title) return undefined;
  const prog: RawProgramme = { s, t: title };
  const e = parseXmltvTime(p['@_stop'] as string | undefined);
  if (e !== undefined) prog.e = e;
  const st = cleanText(text(p['sub-title']));
  if (st && st !== title) prog.st = st;
  const d = shortenDescription(cleanText(text(p.desc)));
  if (d) prog.d = d;
  const cats = arr(p.category).map((c) => text(c)).filter((c): c is string => !!c);
  if (cats.length) prog.cats = cats;

  for (const en of arr(p['episode-num'])) {
    const node = en as Node;
    if (node?.['@_system'] === 'onscreen' || typeof en === 'string') {
      const ep = formatOnscreenEpisode(text(en));
      if (ep) prog.ep = ep;
    }
  }
  const year = Number(String(text(p.date) ?? '').slice(0, 4));
  if (year > 1890 && year < 2100) prog.y = year;
  const country = cleanText(text(p.country));
  if (country) prog.c = country;

  for (const r of arr(p.rating)) {
    const node = r as Node;
    const system = String(node?.['@_system'] ?? '');
    const value = text(node?.value);
    if (!value) continue;
    if (system === 'IMDB') {
      const v = Number(value.replace(',', '.'));
      if (v > 0 && v <= 10) prog.imdb = v;
    } else if (AGE_SYSTEMS.test(system) && prog.fsk === undefined) {
      const m = /(\d{1,2})/.exec(value);
      if (m?.[1]) prog.fsk = Number(m[1]);
    }
  }
  for (const r of arr(p['star-rating'])) {
    const node = r as Node;
    if (node?.['@_system'] === 'Tipp' && /^1\//.test(text(node.value) ?? '')) prog.tipFlag = 1;
  }
  if ('previously-shown' in p) prog.r = 1;
  if ('new' in p || 'premiere' in p) prog.n = 1;
  if ('live' in p) prog.l = 1;
  if (p.subtitles !== undefined) prog.ut = 1;

  const credits = p.credits as Node | undefined;
  if (credits) {
    const dir = arr(credits.director).map(text).filter(Boolean).slice(0, 2).join(', ');
    if (dir) prog.dir = dir;
    const cast = arr(credits.actor).map(text).filter((x): x is string => !!x).slice(0, 6);
    if (cast.length) prog.cast = cast;
  }
  return { channel, prog };
}

export function parseXmltv(xml: string, wanted?: Set<string>): Map<string, RawProgramme[]> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    processEntities: true,
    isArray: (name) => name === 'programme' || name === 'channel',
  });
  const doc = parser.parse(xml) as { tv?: { programme?: Node[] } };
  const out = new Map<string, RawProgramme[]>();
  for (const p of doc.tv?.programme ?? []) {
    const ch = p['@_channel'];
    if (wanted && (typeof ch !== 'string' || !wanted.has(ch))) continue;
    const mapped = mapXmltvProgramme(p);
    if (!mapped) continue;
    if (!out.has(mapped.channel)) out.set(mapped.channel, []);
    out.get(mapped.channel)!.push(mapped.prog);
  }
  return out;
}

export async function fetchXmltv(url: string, wanted?: Set<string>): Promise<Map<string, RawProgramme[]>> {
  const res = await fetchWithRetry(url, { timeoutMs: 120000, retries: 3 });
  if (!res.ok) throw new Error(`HTTP ${res.status} für ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const isGzip = buf[0] === 0x1f && buf[1] === 0x8b;
  const xml = (isGzip ? gunzipSync(buf) : buf).toString('utf8');
  if (!xml.includes('<tv')) throw new Error('Antwort ist kein XMLTV-Dokument');
  return parseXmltv(xml, wanted);
}
