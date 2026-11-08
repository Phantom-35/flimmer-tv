import { signal } from '@preact/signals';

export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
  /** ms, 0 = bleibt stehen */
  duration: number;
}

export const toasts = signal<Toast[]>([]);
let nextId = 1;

export function showToast(text: string, opts: { action?: Toast['action']; duration?: number } = {}): number {
  const id = nextId++;
  const toast: Toast = { id, text, duration: opts.duration ?? 3200, ...(opts.action ? { action: opts.action } : {}) };
  toasts.value = [...toasts.value.filter((t) => t.text !== text), toast];
  if (toast.duration) setTimeout(() => dismissToast(id), toast.duration);
  return id;
}

export function dismissToast(id: number): void {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

export const online = signal(typeof navigator !== 'undefined' ? navigator.onLine : true);
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => (online.value = true));
  window.addEventListener('offline', () => (online.value = false));
}

/** Für Screenreader: höfliche Ansagen (z. B. "12 Treffer"). */
export const announcement = signal('');
export function announce(text: string): void {
  announcement.value = '';
  setTimeout(() => (announcement.value = text), 50);
}

export const shortcutsOpen = signal(false);
/** Detailansicht offen (Hinweise werden dann im Dialog angezeigt). */
export const sheetOpen = signal(false);
export const onboardingOpen = signal(false);

/** Gespeichertes beforeinstallprompt-Event (Chrome/Edge/Android). */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export const installPrompt = signal<InstallPromptEvent | null>(null);
export const isStandalone = signal(
  typeof window !== 'undefined' &&
    (matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true),
);
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt.value = e as InstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    installPrompt.value = null;
    isStandalone.value = true;
  });
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
