/**
 * Zeitlogik. Alles Fachliche passiert in deutscher Zeit (Europe/Berlin),
 * unabhängig von der Zeitzone des Geräts. Sommer-/Winterzeit wird über Intl
 * aufgelöst, nicht über feste Offsets.
 */
export const TZ = 'Europe/Berlin';
/** Ein TV-Tag beginnt – wie in Programmzeitschriften – um 05:00 Uhr. */
export const TV_DAY_START_HOUR = 5;

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export interface BerlinParts {
  y: number;
  m: number;
  d: number;
  h: number;
  mi: number;
  s: number;
}

export function berlinParts(ms: number): BerlinParts {
  const out: Record<string, number> = {};
  for (const p of partsFmt.formatToParts(new Date(ms))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return {
    y: out.year ?? 1970,
    m: out.month ?? 1,
    d: out.day ?? 1,
    h: (out.hour ?? 0) % 24,
    mi: out.minute ?? 0,
    s: out.second ?? 0,
  };
}

/** Offset Berlin gegenüber UTC in Minuten (60 im Winter, 120 im Sommer). */
export function berlinOffsetMinutes(ms: number): number {
  const p = berlinParts(ms);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/**
 * Wandelt eine Berliner Wanduhrzeit in einen UTC-Zeitstempel (ms).
 * Nicht existierende Zeiten (Umstellung im März) werden nach vorne verschoben,
 * doppelte Zeiten (Oktober) liefern die erste (Sommerzeit-)Variante.
 */
export function berlinToUtc(y: number, m: number, d: number, h = 0, mi = 0): number {
  const naive = Date.UTC(y, m - 1, d, h, mi);
  // Zwei Kandidaten prüfen, damit beide Seiten einer Umstellung abgedeckt sind.
  const offA = berlinOffsetMinutes(naive - 120 * 60000);
  const offB = berlinOffsetMinutes(naive);
  const candA = naive - offA * 60000;
  const candB = naive - offB * 60000;
  const match = (c: number) => {
    const p = berlinParts(c);
    return p.y === y && p.m === m && p.d === d && p.h === h && p.mi === mi;
  };
  if (match(candA) && match(candB)) return Math.min(candA, candB);
  if (match(candA)) return candA;
  if (match(candB)) return candB;
  // Lücke bei der Umstellung auf Sommerzeit: die Uhrzeit existiert nicht.
  return Math.max(candA, candB);
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function isoDate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function parseIsoDate(day: string): { y: number; m: number; d: number } {
  const [y, m, d] = day.split('-').map(Number);
  return { y: y ?? 1970, m: m ?? 1, d: d ?? 1 };
}

/** Reine Kalenderarithmetik auf YYYY-MM-DD (zeitzonenfrei). */
export function addDays(day: string, n: number): string {
  const { y, m, d } = parseIsoDate(day);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return isoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Differenz in Tagen (b - a). */
export function diffDays(a: string, b: string): number {
  const pa = parseIsoDate(a);
  const pb = parseIsoDate(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000);
}

/** Kalendertag in Berlin. */
export function berlinDate(ms: number): string {
  const p = berlinParts(ms);
  return isoDate(p.y, p.m, p.d);
}

/** TV-Tag (05:00–05:00 Berliner Zeit), zu dem ein Zeitpunkt gehört. */
export function tvDayOf(ms: number): string {
  const p = berlinParts(ms);
  const day = isoDate(p.y, p.m, p.d);
  return p.h < TV_DAY_START_HOUR ? addDays(day, -1) : day;
}

/** Start/Ende eines TV-Tages in ms. Berücksichtigt 23- und 25-Stunden-Tage. */
export function tvDayRange(day: string): [number, number] {
  const { y, m, d } = parseIsoDate(day);
  const next = parseIsoDate(addDays(day, 1));
  return [
    berlinToUtc(y, m, d, TV_DAY_START_HOUR, 0),
    berlinToUtc(next.y, next.m, next.d, TV_DAY_START_HOUR, 0),
  ];
}

/**
 * Zeitpunkt einer Berliner Uhrzeit innerhalb eines TV-Tages.
 * 20:15 liegt am selben Kalendertag, 01:00 bereits am Folgetag.
 */
export function tvDayTime(day: string, h: number, mi = 0): number {
  const target = h < TV_DAY_START_HOUR ? addDays(day, 1) : day;
  const { y, m, d } = parseIsoDate(target);
  return berlinToUtc(y, m, d, h, mi);
}

const timeFmt24 = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const timeFmt12 = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });

export function formatTime(ms: number, h12 = false): string {
  return (h12 ? timeFmt12 : timeFmt24).format(new Date(ms));
}

const WEEKDAYS_SHORT = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
const WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export function weekdayOf(day: string): number {
  const { y, m, d } = parseIsoDate(day);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "Heute", "Morgen", "Gestern" oder "Mo., 10.11." */
export function dayLabel(day: string, today: string, long = false): string {
  const diff = diffDays(today, day);
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Morgen';
  if (diff === -1) return 'Gestern';
  const { m, d } = parseIsoDate(day);
  const wd = weekdayOf(day);
  return long ? `${WEEKDAYS_LONG[wd]}, ${d}.${m}.` : `${WEEKDAYS_SHORT[wd]} ${pad2(d)}.${pad2(m)}.`;
}

export function shortWeekday(day: string): string {
  return WEEKDAYS_SHORT[weekdayOf(day)] ?? '';
}

/** Dauer in Minuten, lesbar: "45 Min.", "1 Std. 30 Min." */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} Min.`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} Std. ${r} Min.` : `${h} Std.`;
}

/** Fortschritt 0..1 einer laufenden Sendung. */
export function progress(startMs: number, endMs: number, nowMs: number): number {
  if (endMs <= startMs) return 0;
  return Math.min(1, Math.max(0, (nowMs - startMs) / (endMs - startMs)));
}
