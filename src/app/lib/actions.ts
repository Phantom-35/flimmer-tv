import { dayLabel, formatTime, tvDayOf } from '../../shared/time';
import type { Channel, Programme } from '../../shared/types';
import { getDetails, today } from '../store/data';
import { settings } from '../store/settings';
import { showToast } from '../store/ui';
import { addWatch, isWatched, removeWatch, setRemind, toWatchItem, watchlist, type WatchItem } from '../store/watchlist';
import { buildIcs, downloadFile, safeFilename, type IcsEvent } from './ics';
import { enablePush, pushState } from './push';

export function programmeUrl(id: string): string {
  return `${location.origin}/#/jetzt?d=${encodeURIComponent(id)}`;
}

export function whenText(p: { s: number; e: number }): string {
  const h12 = settings.value.h12;
  const day = dayLabel(tvDayOf(p.s * 1000), today.value);
  return `${day}, ${formatTime(p.s * 1000, h12)}–${formatTime(p.e * 1000, h12)}`;
}

export async function shareProgramme(p: Programme, channel: Channel | undefined): Promise<void> {
  const text = `${p.t}${p.st ? ` – ${p.st}` : ''}\n${whenText(p)} · ${channel?.name ?? ''}`;
  const url = programmeUrl(p.i);
  if (navigator.share) {
    try {
      await navigator.share({ title: p.t, text, url });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    showToast('Link in die Zwischenablage kopiert');
  } catch {
    showToast('Teilen wird von diesem Browser nicht unterstützt');
  }
}

function toEvent(item: { id: string; s: number; e: number; t: string; st?: string }, channelName: string, desc?: string): IcsEvent {
  const description = [item.st, desc, programmeUrl(item.id)].filter(Boolean).join('\n\n');
  return {
    uid: item.id,
    start: item.s,
    end: item.e,
    title: `${item.t} (${channelName})`,
    location: channelName,
    description,
    url: programmeUrl(item.id),
    alarmMinutes: settings.value.reminderLead,
  };
}

export function exportIcs(p: Programme, channel: Channel | undefined): void {
  const ics = buildIcs([toEvent({ ...p, id: p.i }, channel?.name ?? '', getDetails(p)?.d?.slice(0, 600))]);
  downloadFile(`${safeFilename(p.t)}.ics`, ics, 'text/calendar;charset=utf-8');
  showToast('Kalendereintrag erstellt');
}

export function exportWatchlistIcs(items: WatchItem[], channelName: (id: string) => string): void {
  const upcoming = items.filter((w) => w.e * 1000 > Date.now());
  if (!upcoming.length) {
    showToast('Keine kommenden Sendungen auf der Merkliste');
    return;
  }
  downloadFile('flimmer-merkliste.ics', buildIcs(upcoming.map((w) => toEvent(w, channelName(w.ch)))), 'text/calendar;charset=utf-8');
  showToast(`${upcoming.length} Termine exportiert`);
}

export function toggleWatch(p: Programme, channelId: string): void {
  if (isWatched(p.i)) {
    const item = watchlist.value.find((w) => w.id === p.i);
    removeWatch(p.i);
    showToast('Von der Merkliste entfernt', {
      action: item ? { label: 'Rückgängig', run: () => addWatch(item) } : undefined,
    });
  } else {
    addWatch(toWatchItem(p, channelId));
    showToast('Auf die Merkliste gesetzt');
  }
}

/** Erinnerung an/aus. Legt die Sendung bei Bedarf auf die Merkliste und schaltet Push ein. */
export async function toggleReminder(p: Programme, channelId: string): Promise<void> {
  const existing = watchlist.value.find((w) => w.id === p.i);
  if (existing?.remind) {
    setRemind(p.i, false);
    showToast('Erinnerung entfernt');
    return;
  }
  if (p.s * 1000 <= Date.now()) {
    showToast('Die Sendung läuft schon');
    return;
  }
  if (!existing) addWatch(toWatchItem(p, channelId, true));
  else setRemind(p.i, true);
  const lead = settings.value.reminderLead;
  const leadText = lead ? `${lead} Min. vorher` : 'zum Beginn';
  const state = pushState();
  if (state === 'on') {
    showToast(`Du wirst ${leadText} erinnert`);
    return;
  }
  if (state === 'off') {
    // Erlaubnis direkt aus dem Tippen heraus anfragen (iOS verlangt das)
    const result = await enablePush();
    if (result === 'on') showToast(`Du wirst ${leadText} erinnert`);
    else showToast('Ohne Erlaubnis für Mitteilungen kann Flimmer dich nicht erinnern. Tipp: Kalender', { duration: 6000 });
    return;
  }
  if (state === 'needs-install') {
    showToast('Für Erinnerungen Flimmer zum Home-Bildschirm hinzufügen (Teilen → Zum Home-Bildschirm)', { duration: 7000 });
    return;
  }
  if (state === 'denied') {
    showToast('Mitteilungen sind für Flimmer blockiert – in den Geräte-Einstellungen erlauben', { duration: 6000 });
    return;
  }
  showToast('Dieser Browser unterstützt keine Mitteilungen. Tipp: Kalender', { duration: 6000 });
}
