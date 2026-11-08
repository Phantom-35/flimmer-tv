import { effect, signal } from '@preact/signals';
import { formatTime } from '../../shared/time';
import { channelsById } from '../store/data';
import { readJson, writeJson } from '../store/persist';
import { settings, updateSettings } from '../store/settings';
import { isIos, isStandalone } from '../store/ui';
import { watchlist } from '../store/watchlist';

/**
 * Echte Push-Benachrichtigungen über den eigenen Worker (worker/index.ts).
 * iOS/iPadOS: nur in der installierten App (Home-Bildschirm), ab iOS 16.4.
 */
export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

export const pushBusy = signal(false);

export function pushState(): PushState {
  if (typeof window === 'undefined') return 'unsupported';
  const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!hasApis) return isIos() && !isStandalone.value ? 'needs-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return settings.value.pushEnabled && Notification.permission === 'granted' ? 'on' : 'off';
}

function deviceId(): string {
  let id = readJson<string>('device', '');
  if (!id) {
    id = crypto.randomUUID();
    writeJson('device', id);
  }
  return id;
}

function urlBase64ToBytes(s: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getSubscription(create: boolean): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing || !create) return existing;
  const cfg = (await (await fetch('/api/push/config')).json()) as { publicKey: string };
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(cfg.publicKey) });
}

/** Erinnerungen der Merkliste in Server-Format bringen. */
function buildReminders() {
  const lead = settings.value.reminderLead;
  const h12 = settings.value.h12;
  const now = Date.now();
  return watchlist.value
    .filter((w) => w.remind && w.s * 1000 > now)
    .map((w) => {
      const ch = channelsById.value.get(w.ch)?.name ?? '';
      const at = Math.max(now + 5000, (w.s - lead * 60) * 1000);
      const when = lead ? `beginnt in ${lead} Min.` : 'beginnt jetzt';
      return {
        id: w.id,
        at,
        title: w.t,
        body: `${formatTime(w.s * 1000, h12)} · ${ch} – ${when}`,
        url: `/#/merkliste?d=${encodeURIComponent(w.id)}`,
      };
    });
}

let syncTimer: ReturnType<typeof setTimeout> | undefined;

export async function syncPushNow(): Promise<boolean> {
  const sub = await getSubscription(false);
  if (!sub) return false;
  const res = await fetch(`/api/push/device/${deviceId()}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON(), reminders: buildReminders() }),
  });
  return res.ok;
}

function scheduleSync(): void {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void syncPushNow().catch(() => undefined), 800);
}

/**
 * Push einschalten. Muss direkt aus einem Klick heraus aufgerufen werden
 * (iOS verlangt eine Nutzeraktion für die Erlaubnisabfrage).
 */
export async function enablePush(): Promise<PushState> {
  const state = pushState();
  if (state === 'unsupported' || state === 'needs-install' || state === 'denied') return state;
  pushBusy.value = true;
  try {
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (perm !== 'granted') {
      updateSettings({ pushEnabled: false });
      return perm === 'denied' ? 'denied' : 'off';
    }
    await getSubscription(true);
    updateSettings({ pushEnabled: true });
    await syncPushNow();
    return 'on';
  } finally {
    pushBusy.value = false;
  }
}

export async function disablePush(): Promise<void> {
  pushBusy.value = true;
  try {
    updateSettings({ pushEnabled: false });
    await fetch(`/api/push/device/${deviceId()}`, { method: 'DELETE' }).catch(() => undefined);
    const sub = await getSubscription(false).catch(() => null);
    await sub?.unsubscribe();
  } finally {
    pushBusy.value = false;
  }
}

export async function sendTestPush(): Promise<boolean> {
  await syncPushNow();
  const res = await fetch(`/api/push/device/${deviceId()}/test`, { method: 'POST' });
  return res.ok;
}

/** Merkliste und Vorlauf mit dem Server abgleichen, solange Push aktiv ist. */
export function startPushSync(): void {
  effect(() => {
    void watchlist.value;
    void settings.value.reminderLead;
    if (settings.value.pushEnabled && pushState() === 'on') scheduleSync();
  });
  // Beim Öffnen einmal abgleichen (Abo kann sich geändert haben)
  if (settings.value.pushEnabled) setTimeout(scheduleSync, 3000);
}
