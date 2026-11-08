import { computed, signal } from '@preact/signals';
import { tvDayOf } from '../../shared/time';
import { DATA_VERSION, type Channel, type DataIndex, type DayFile, type DetailsFile, type Programme, type ProgrammeDetails } from '../../shared/types';

export type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export const index = signal<DataIndex | null>(null);
export const indexState = signal<LoadState>('idle');
export const indexError = signal<string>('');

/** Wird bei jeder geladenen Tagesdatei hochgezählt (Reaktivität für den Cache). */
export const dataVersion = signal(0);
const dayCache = new Map<string, DayFile>();
const dayPromises = new Map<string, Promise<DayFile | null>>();
const dayErrors = new Set<string>();
const detailsCache = new Map<string, DetailsFile>();
const detailsPromises = new Map<string, Promise<DetailsFile | null>>();

/** Aktuelle Uhrzeit, alle 20 s aktualisiert. */
export const now = signal(Date.now());
if (typeof window !== 'undefined') {
  setInterval(() => (now.value = Date.now()), 20000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') now.value = Date.now();
  });
}
export const today = computed(() => tvDayOf(now.value));

export const channelsById = computed(() => {
  const map = new Map<string, Channel>();
  for (const c of index.value?.channels ?? []) map.set(c.id, c);
  return map;
});

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function loadIndex(force = false): Promise<void> {
  if (indexState.value === 'loading' && !force) return;
  indexState.value = 'loading';
  try {
    const data = await getJson<DataIndex>(`/data/index.json${force ? `?t=${Date.now()}` : ''}`);
    if (data.v !== DATA_VERSION) throw new Error('Datenformat passt nicht zur App-Version. Bitte App aktualisieren.');
    const changed = index.value?.generatedAt !== data.generatedAt;
    index.value = data;
    indexState.value = 'ready';
    if (changed && force) {
      dayCache.clear();
      dayPromises.clear();
      detailsCache.clear();
      detailsPromises.clear();
      dataVersion.value++;
    }
  } catch (err) {
    indexError.value = navigator.onLine
      ? `Das Programm konnte nicht geladen werden (${(err as Error).message}).`
      : 'Du bist offline und es sind noch keine Programmdaten gespeichert.';
    indexState.value = index.value ? 'ready' : 'error';
  }
}

export function hasDay(day: string): boolean {
  return !!index.value?.days.includes(day);
}

export function getDay(day: string): DayFile | undefined {
  return dayCache.get(day);
}

export function dayFailed(day: string): boolean {
  return dayErrors.has(day);
}

export function loadDay(day: string): Promise<DayFile | null> {
  if (dayCache.has(day)) return Promise.resolve(dayCache.get(day)!);
  if (!hasDay(day)) return Promise.resolve(null);
  let p = dayPromises.get(day);
  if (!p) {
    p = getJson<DayFile>(`/data/days/${day}.json`)
      .then((file) => {
        dayCache.set(day, file);
        dayErrors.delete(day);
        dataVersion.value++;
        return file;
      })
      .catch(() => {
        dayErrors.add(day);
        dayPromises.delete(day);
        dataVersion.value++;
        return null;
      });
    dayPromises.set(day, p);
  }
  return p;
}

export function loadDays(days: string[]): Promise<(DayFile | null)[]> {
  return Promise.all(days.map(loadDay));
}

export function loadDetails(day: string): Promise<DetailsFile | null> {
  if (detailsCache.has(day)) return Promise.resolve(detailsCache.get(day)!);
  if (!hasDay(day)) return Promise.resolve(null);
  let p = detailsPromises.get(day);
  if (!p) {
    p = getJson<DetailsFile>(`/data/details/${day}.json`)
      .then((file) => {
        detailsCache.set(day, file);
        dataVersion.value++;
        return file;
      })
      .catch(() => {
        detailsPromises.delete(day);
        return null;
      });
    detailsPromises.set(day, p);
  }
  return p;
}

export function getDetails(p: Programme): ProgrammeDetails | undefined {
  return detailsCache.get(tvDayOf(p.s * 1000))?.x[p.i];
}

export function getDetailsLoaded(day: string): DetailsFile | undefined {
  return detailsCache.get(day);
}

/** Sendungen eines Senders über mehrere Tagesdateien, ohne Dubletten. */
export function programmesFor(channelId: string, days: string[]): Programme[] {
  const seen = new Set<string>();
  const out: Programme[] = [];
  for (const d of days) {
    for (const p of dayCache.get(d)?.p[channelId] ?? []) {
      if (seen.has(p.i)) continue;
      seen.add(p.i);
      out.push(p);
    }
  }
  return out.sort((a, b) => a.s - b.s);
}

/** Sucht eine Sendung anhand ihrer ID ("<sender>-<start>"). */
export async function findProgramme(id: string): Promise<{ programme: Programme; channelId: string } | null> {
  const m = /^(.+)-(\d+)$/.exec(id);
  if (!m) return null;
  const channelId = m[1]!;
  const start = Number(m[2]);
  const day = tvDayOf(start * 1000);
  const file = await loadDay(day);
  const p = file?.p[channelId]?.find((x) => x.i === id);
  return p ? { programme: p, channelId } : null;
}

export function findProgrammeSync(id: string): Programme | undefined {
  const m = /^(.+)-(\d+)$/.exec(id);
  if (!m) return undefined;
  const day = tvDayOf(Number(m[2]) * 1000);
  return dayCache.get(day)?.p[m[1]!]?.find((x) => x.i === id);
}

/** Alle geladenen Tage (für Suche, "Weitere Termine"). */
export function loadedDays(): DayFile[] {
  return [...dayCache.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
}

/** Laufende und nächste Sendung zu einem Zeitpunkt. */
export function airingAt(progs: Programme[], tsSec: number): { current?: Programme; next?: Programme } {
  let lo = 0;
  let hi = progs.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (progs[mid]!.s <= tsSec) {
      idx = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  const cand = idx >= 0 ? progs[idx] : undefined;
  if (cand && cand.e > tsSec) return { current: cand, next: progs[idx + 1] };
  return { next: progs[idx + 1] };
}
