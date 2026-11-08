import { computed, signal } from '@preact/signals';

/**
 * Minimaler Hash-Router: funktioniert auf jedem statischen Hoster und offline,
 * ohne Server-Rewrites. Format: #/pfad/teil?param=wert
 *
 * Für ein natives Gefühl:
 * - erkennt Vor/Zurück (History-Index im history.state)
 * - merkt sich die Scroll-Position je Eintrag und stellt sie beim Zurück wieder her
 * - liefert die Richtung für Seitenübergänge (Schieben bzw. Überblenden, per CSS)
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
export const routeName = computed(() => route.value.path[0] ?? '');

/** Hauptbereiche (Tabs) – Wechsel dazwischen wird überblendet statt geschoben. */
export const TABS = ['jetzt', 'programm', 'suche', 'merkliste', 'mehr'];
const depthOf = (r: Route) => (TABS.includes(r.path[0] ?? 'jetzt') ? 0 : 1);
const pagePath = (r: Route) => r.path.join('/');

export type NavDirection = 'forward' | 'back' | 'tab' | 'none';
export const lastDirection = signal<NavDirection>('none');

const scrollPositions = new Map<number, number>();
let currentIndex = 0;

if (typeof window !== 'undefined') {
  history.scrollRestoration = 'manual';
  const st = history.state as { idx?: number } | null;
  if (typeof st?.idx === 'number') currentIndex = st.idx;
  else history.replaceState({ ...(st ?? {}), idx: 0 }, '');

  window.addEventListener('hashchange', () => {
    const prev = route.value;
    const next = parse(location.hash);
    const st = history.state as { idx?: number } | null;
    let isBack = false;
    if (typeof st?.idx === 'number') {
      isBack = st.idx < currentIndex;
      currentIndex = st.idx;
    } else {
      // Neuer Eintrag (Link geklickt): Index vergeben
      scrollPositions.set(currentIndex, window.scrollY);
      currentIndex += 1;
      history.replaceState({ ...(st ?? {}), idx: currentIndex }, '');
    }
    const samePage = pagePath(prev) === pagePath(next);
    const dir: NavDirection = samePage
      ? 'none'
      : depthOf(prev) === 0 && depthOf(next) === 0
        ? 'tab'
        : isBack || depthOf(next) < depthOf(prev)
          ? 'back'
          : 'forward';
    if (!samePage && !isBack) scrollPositions.set(currentIndex - 1, scrollPositions.get(currentIndex - 1) ?? window.scrollY);
    applyRoute(next, dir, isBack ? scrollPositions.get(currentIndex) ?? 0 : 0, samePage);
  });
}

const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

let skipTransition = false;
/** Nächsten Seitenwechsel ohne Animation (z. B. nach eigener Wisch-Animation). */
export function skipNextTransition(): void {
  skipTransition = true;
}

function applyRoute(next: Route, dir: NavDirection, scrollTo: number, samePage: boolean): void {
  // Die Seite selbst animiert sich beim Einhängen (CSS, siehe .page-forward usw.).
  // Bewusst ohne View-Transitions-API: deren Schiebe-Animation brachte WebKit im Test zum Absturz.
  const skip = skipTransition;
  skipTransition = false;
  lastDirection.value = skip || reduceMotion() ? 'none' : dir;
  route.value = next;
  if (!samePage) window.scrollTo(0, scrollTo);
}

export function href(path: string, params?: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== '') q.set(k, v);
  const qs = q.toString();
  return `#${path}${qs ? `?${qs}` : ''}`;
}

export function navigate(to: string, replace = false): void {
  const target = to.startsWith('#') ? to : `#${to}`;
  if (replace) {
    history.replaceState({ ...(history.state ?? {}), idx: currentIndex }, '', target);
    const next = parse(target);
    const samePage = pagePath(route.value) === pagePath(next);
    applyRoute(next, samePage ? 'none' : 'tab', 0, samePage);
  } else {
    location.hash = target;
  }
}

/** Zurück – innerhalb der App, sonst zur übergeordneten Seite. */
export function goBack(fallback: string): void {
  if (currentIndex > 0) history.back();
  else navigate(fallback, true);
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
