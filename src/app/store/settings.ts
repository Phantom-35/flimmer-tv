import { computed, effect } from '@preact/signals';
import { persistedSignal } from './persist';

export type Theme = 'system' | 'light' | 'dark';
export type StartView = 'jetzt' | 'programm';

export interface Settings {
  theme: Theme;
  /** 0.9 | 1 | 1.125 | 1.25 */
  fontScale: number;
  h12: boolean;
  /** Erinnerung x Minuten vor Beginn. */
  reminderLead: number;
  startView: StartView;
  /** Onboarding abgeschlossen. */
  onboarded: boolean;
  /** Raster: Pixel pro Minute (Zoom). */
  gridZoom: number;
  /** Bei der Suche auch Beschreibungen durchsuchen. */
  searchDescriptions: boolean;
  /** Install-Hinweis ausgeblendet. */
  installDismissed: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  fontScale: 1,
  h12: false,
  reminderLead: 5,
  startView: 'jetzt',
  onboarded: false,
  gridZoom: 1,
  searchDescriptions: false,
  installDismissed: false,
};

export const settings = persistedSignal<Settings>('settings', DEFAULT_SETTINGS, (v) => ({ ...DEFAULT_SETTINGS, ...v }));

export function updateSettings(patch: Partial<Settings>): void {
  settings.value = { ...settings.value, ...patch };
}

const media = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : undefined;

export const effectiveTheme = computed<'light' | 'dark'>(() => {
  const t = settings.value.theme;
  if (t !== 'system') return t;
  return media?.matches ? 'dark' : 'light';
});

/** Theme, Schriftgröße und theme-color im Dokument anwenden. */
export function applyDocumentSettings(): void {
  effect(() => {
    const s = settings.value;
    const root = document.documentElement;
    if (s.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = s.theme;
    root.style.setProperty('--font-scale', String(s.fontScale));
    const color = effectiveTheme.value === 'dark' ? '#15130f' : '#f7f4ee';
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      if (s.theme === 'system') {
        m.setAttribute('content', m.getAttribute('media')?.includes('dark') ? '#15130f' : '#f7f4ee');
      } else m.setAttribute('content', color);
    });
  });
  media?.addEventListener('change', () => {
    // Signal neu auslösen, damit computed neu rechnet.
    settings.value = { ...settings.value };
  });
}
