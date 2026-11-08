import { effect } from '@preact/signals';
import { formatTime } from '../../shared/time';
import { channelsById, now } from '../store/data';
import { settings } from '../store/settings';
import { showToast } from '../store/ui';
import { markNotified, watchlist, type WatchItem } from '../store/watchlist';

/**
 * Lokale Erinnerungen – ehrlich umgesetzt:
 * Ohne eigenen Push-Server kann eine Web-App keine Benachrichtigung auslösen,
 * wenn sie komplett geschlossen ist (die "Notification Triggers"-API wurde nie
 * standardisiert). Deshalb:
 *  - solange Flimmer geöffnet ist oder im Hintergrund läuft: Systembenachrichtigung
 *  - zuverlässig auf allen Geräten: Kalender-Export (.ics) mit Alarm
 */
export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

async function notify(item: WatchItem): Promise<void> {
  const ch = channelsById.value.get(item.ch)?.name ?? '';
  const startsIn = Math.round((item.s * 1000 - Date.now()) / 60000);
  const when = startsIn > 0 ? `in ${startsIn} Min.` : 'jetzt';
  const body = `${formatTime(item.s * 1000, settings.value.h12)} · ${ch} – beginnt ${when}`;
  showToast(`⏰ ${item.t} – ${ch}, beginnt ${when}`, { duration: 10000 });
  if (notificationPermission() !== 'granted') return;
  const options: NotificationOptions = {
    body,
    tag: item.id,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    data: { url: `/#/merkliste?d=${encodeURIComponent(item.id)}` },
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(item.t, options);
    else new Notification(item.t, options);
  } catch {
    /* Toast wurde bereits angezeigt */
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;

function check(): void {
  const lead = settings.value.reminderLead * 60;
  const nowSec = Date.now() / 1000;
  let nextAt = Infinity;
  for (const item of watchlist.value) {
    if (!item.remind || item.notified) continue;
    const fireAt = item.s - lead;
    if (nowSec >= fireAt) {
      // Nur auslösen, wenn die Sendung nicht schon länger läuft.
      if (nowSec < item.s + 300) void notify(item);
      markNotified(item.id);
    } else {
      nextAt = Math.min(nextAt, fireAt);
    }
  }
  clearTimeout(timer);
  if (nextAt < Infinity) {
    const ms = Math.min(2 ** 31 - 1, (nextAt - nowSec) * 1000 + 500);
    timer = setTimeout(check, ms);
  }
}

export function startReminderScheduler(): void {
  effect(() => {
    void watchlist.value;
    void settings.value.reminderLead;
    void now.value;
    check();
  });
}
