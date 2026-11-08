import { effect, signal, type Signal } from '@preact/signals';

/** Alle lokal gespeicherten Daten der App tragen dieses Präfix. */
export const STORAGE_PREFIX = 'flimmer:';

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* Speicher voll oder privat – App funktioniert trotzdem weiter */
  }
}

/** Signal, das automatisch in localStorage gespiegelt wird. */
export function persistedSignal<T>(key: string, fallback: T, migrate?: (v: T) => T): Signal<T> {
  const initial = readJson<T>(key, fallback);
  const s = signal<T>(migrate ? migrate(initial) : initial);
  let first = true;
  effect(() => {
    const v = s.value;
    if (first) {
      first = false;
      return;
    }
    writeJson(key, v);
  });
  // Änderungen aus anderen Tabs übernehmen.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_PREFIX + key && e.newValue) {
        try {
          s.value = JSON.parse(e.newValue) as T;
        } catch {
          /* ignorieren */
        }
      }
    });
  }
  return s;
}

export function clearAllLocalData(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(STORAGE_PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}
