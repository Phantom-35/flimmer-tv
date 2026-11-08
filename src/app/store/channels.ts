import { computed } from '@preact/signals';
import type { Channel } from '../../shared/types';
import { index } from './data';
import { persistedSignal } from './persist';

export interface ChannelPrefs {
  /** Vom Nutzer festgelegte Reihenfolge (IDs). Neue Sender werden hinten angehängt. */
  order: string[];
  /** "Meine Sender". Leer = alle sichtbaren Sender. */
  favorites: string[];
  /** Ausgeblendete Sender. */
  hidden: string[];
}

export const DEFAULT_FAVORITES = [
  'daserste', 'zdf', 'rtl', 'sat1', 'prosieben', 'vox', 'kabeleins', 'rtlzwei',
  '3sat', 'arte', 'zdfneo', 'one', 'wdr', 'ndr', 'br', 'phoenix', 'ntv', 'tele5',
];

/** Neue Nutzer starten mit einer sinnvollen Auswahl (im Onboarding änderbar). */
export const channelPrefs = persistedSignal<ChannelPrefs>('channels', { order: [], favorites: DEFAULT_FAVORITES, hidden: [] });

/** Alle Sender in Nutzer-Reihenfolge. */
export const orderedChannels = computed<Channel[]>(() => {
  const all = index.value?.channels ?? [];
  const pos = new Map(channelPrefs.value.order.map((id, i) => [id, i]));
  const defaultPos = new Map(all.map((c, i) => [c.id, i]));
  return [...all].sort((a, b) => {
    const pa = pos.get(a.id);
    const pb = pos.get(b.id);
    if (pa !== undefined && pb !== undefined) return pa - pb;
    if (pa !== undefined) return -1;
    if (pb !== undefined) return 1;
    return (defaultPos.get(a.id) ?? 0) - (defaultPos.get(b.id) ?? 0);
  });
});

export const visibleChannels = computed(() => {
  const hidden = new Set(channelPrefs.value.hidden);
  return orderedChannels.value.filter((c) => !hidden.has(c.id));
});

export const myChannels = computed(() => {
  const fav = new Set(channelPrefs.value.favorites);
  if (!fav.size) return visibleChannels.value;
  return visibleChannels.value.filter((c) => fav.has(c.id));
});

export const hasFavorites = computed(() => channelPrefs.value.favorites.length > 0);

export function isFavorite(id: string): boolean {
  return channelPrefs.value.favorites.includes(id);
}

export function toggleFavorite(id: string): void {
  const p = channelPrefs.value;
  const favorites = p.favorites.includes(id) ? p.favorites.filter((x) => x !== id) : [...p.favorites, id];
  const hidden = p.hidden.filter((x) => x !== id);
  channelPrefs.value = { ...p, favorites, hidden };
}

export function toggleHidden(id: string): void {
  const p = channelPrefs.value;
  const hidden = p.hidden.includes(id) ? p.hidden.filter((x) => x !== id) : [...p.hidden, id];
  const favorites = p.favorites.filter((x) => x !== id);
  channelPrefs.value = { ...p, hidden, favorites };
}

export function setFavorites(ids: string[]): void {
  channelPrefs.value = { ...channelPrefs.value, favorites: ids };
}

/** Verschiebt einen Sender in der Gesamtreihenfolge. */
export function moveChannel(id: string, toIndex: number): void {
  const order = orderedChannels.value.map((c) => c.id);
  const from = order.indexOf(id);
  if (from < 0) return;
  order.splice(from, 1);
  order.splice(Math.max(0, Math.min(order.length, toIndex)), 0, id);
  channelPrefs.value = { ...channelPrefs.value, order };
}

/** Neue Reihenfolge der Lieblingssender; sie stehen danach vor allen anderen. */
export function setFavoriteOrder(ids: string[]): void {
  const rest = orderedChannels.value.map((c) => c.id).filter((id) => !ids.includes(id));
  channelPrefs.value = { ...channelPrefs.value, order: [...ids, ...rest] };
}

/** Verschiebt innerhalb der Liste "Meine Sender" um delta Positionen. */
export function moveWithin(list: string[], id: string, delta: number): void {
  const i = list.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return;
  const next = [...list];
  next.splice(i, 1);
  next.splice(j, 0, id);
  setFavoriteOrder(next);
}

export function resetChannelPrefs(): void {
  channelPrefs.value = { order: [], favorites: [], hidden: [] };
}
