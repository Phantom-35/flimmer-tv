import { computed } from '@preact/signals';
import type { GenreKey, Programme } from '../../shared/types';
import { persistedSignal } from './persist';

export interface WatchItem {
  /** Sendungs-ID. */
  id: string;
  ch: string;
  s: number;
  e: number;
  t: string;
  st?: string;
  ep?: string;
  g: GenreKey;
  remind: boolean;
  /** Erinnerung bereits ausgelöst. */
  notified?: boolean;
  addedAt: number;
}

export const watchlist = persistedSignal<WatchItem[]>('merkliste', []);

export const watchIds = computed(() => new Set(watchlist.value.map((w) => w.id)));

export function isWatched(id: string): boolean {
  return watchIds.value.has(id);
}

export function toWatchItem(p: Programme, channelId: string, remind = false): WatchItem {
  return {
    id: p.i,
    ch: channelId,
    s: p.s,
    e: p.e,
    t: p.t,
    ...(p.st ? { st: p.st } : {}),
    ...(p.ep ? { ep: p.ep } : {}),
    g: p.g,
    remind,
    addedAt: Date.now(),
  };
}

export function addWatch(item: WatchItem): void {
  if (isWatched(item.id)) return;
  watchlist.value = [...watchlist.value, item].sort((a, b) => a.s - b.s);
}

export function removeWatch(id: string): void {
  watchlist.value = watchlist.value.filter((w) => w.id !== id);
}

export function setRemind(id: string, remind: boolean): void {
  watchlist.value = watchlist.value.map((w) => (w.id === id ? { ...w, remind, notified: false } : w));
}

export function markNotified(id: string): void {
  watchlist.value = watchlist.value.map((w) => (w.id === id ? { ...w, notified: true } : w));
}

/** Entfernt Einträge, die länger als 7 Tage vorbei sind. */
export function pruneWatchlist(nowMs: number): void {
  const limit = nowMs / 1000 - 7 * 86400;
  const kept = watchlist.value.filter((w) => w.e > limit);
  if (kept.length !== watchlist.value.length) watchlist.value = kept;
}
