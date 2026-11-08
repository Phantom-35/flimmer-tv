import { computed, signal } from '@preact/signals';

/**
 * Minimaler Hash-Router: funktioniert auf jedem statischen Hoster und offline,
 * ohne Server-Rewrites. Format: #/pfad/teil?param=wert
 */
export interface Route {
  path: string[];
  query: URLSearchParams;
  raw: string;
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [p = '/', q = ''] = raw.split('?');
  return {
    path: p.split('/').filter(Boolean).map(decodeURIComponent),
    query: new URLSearchParams(q),
    raw,
  };
}

export const route = signal<Route>(parse(typeof location !== 'undefined' ? location.hash : ''));

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    route.value = parse(location.hash);
  });
}

export const routeName = computed(() => route.value.path[0] ?? '');

export function href(path: string, params?: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== '') q.set(k, v);
  const qs = q.toString();
  return `#${path}${qs ? `?${qs}` : ''}`;
}

export function navigate(to: string, replace = false): void {
  const target = to.startsWith('#') ? to : `#${to}`;
  if (replace) {
    history.replaceState(history.state, '', target);
    route.value = parse(target);
  } else {
    location.hash = target;
  }
}

/** Setzt/entfernt Query-Parameter der aktuellen Route. */
export function setQuery(params: Record<string, string | undefined>, replace = true): void {
  const r = route.value;
  const q = new URLSearchParams(r.query);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') q.delete(k);
    else q.set(k, v);
  }
  const qs = q.toString();
  navigate(`/${r.path.map(encodeURIComponent).join('/')}${qs ? `?${qs}` : ''}`, replace);
}

let detailPushed = false;
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    if (!route.value.query.has('d')) detailPushed = false;
  });
}

/** Öffnet die Detailansicht einer Sendung über der aktuellen Ansicht. */
export function openDetail(id: string): void {
  const wasOpen = route.value.query.has('d');
  setQuery({ d: id }, wasOpen);
  if (!wasOpen) detailPushed = true;
}

/** Schließt die Detailansicht. Per Link geöffnet -> ersetzen statt zurück (App nicht verlassen). */
export function closeDetail(): void {
  if (detailPushed) {
    detailPushed = false;
    history.back();
  } else {
    setQuery({ d: undefined });
  }
}
