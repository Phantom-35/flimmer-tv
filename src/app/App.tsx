import { useEffect, useRef } from 'preact/hooks';
import { useRegisterSW } from 'virtual:pwa-register/preact';
import { DetailSheet } from './components/DetailSheet';
import { Onboarding } from './components/Onboarding';
import { FatalError, LiveRegion, Nav, ShortcutsDialog, StatusBanner, Toasts } from './components/Shell';
import { Skeleton } from './components/bits';
import { navigate, route, routeName } from './router';
import { addDays, tvDayOf } from '../shared/time';
import { index, indexState, loadIndex } from './store/data';
import { settings } from './store/settings';
import { onboardingOpen, shortcutsOpen, showToast } from './store/ui';
import { ChannelsManageView } from './views/ChannelsManageView';
import { ChannelView } from './views/ChannelView';
import { GridView } from './views/GridView';
import { MoreView } from './views/MoreView';
import { NowView } from './views/NowView';
import { PageView } from './views/PageView';
import { SearchView } from './views/SearchView';
import { SettingsView } from './views/SettingsView';
import { WatchlistView } from './views/WatchlistView';

const VIEWS: Record<string, () => preact.JSX.Element> = {
  jetzt: NowView,
  programm: GridView,
  sender: ChannelView,
  suche: SearchView,
  merkliste: WatchlistView,
  mehr: MoreView,
  einstellungen: SettingsView,
  'sender-verwalten': ChannelsManageView,
  seite: PageView,
};

const TITLES: Record<string, string> = {
  jetzt: 'Jetzt im TV',
  programm: 'Programm',
  sender: 'Sender',
  suche: 'Suche',
  merkliste: 'Merkliste',
  mehr: 'Mehr',
  einstellungen: 'Einstellungen',
  'sender-verwalten': 'Sender verwalten',
  seite: 'Info',
};

function useUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Stündlich und beim Zurückkehren nach Updates schauen.
      if (!reg) return;
      setInterval(() => void reg.update(), 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update();
      });
    },
  });
  useEffect(() => {
    if (needRefresh) {
      showToast('Neue Version verfügbar.', {
        duration: 0,
        action: { label: 'Aktualisieren', run: () => void updateServiceWorker(true) },
      });
    }
  }, [needRefresh]);
  useEffect(() => {
    if (offlineReady) {
      showToast('Flimmer funktioniert jetzt auch offline.');
      setOfflineReady(false);
    }
  }, [offlineReady]);
}

function useGlobalShortcuts() {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (document.querySelector('dialog[open]') && e.key !== 'Escape') return;
      const map: Record<string, string> = { j: '/jetzt', p: '/programm', m: '/merkliste', e: '/einstellungen' };
      if (e.key === '/') {
        e.preventDefault();
        navigate('/suche');
      } else if (e.key === '?') {
        shortcutsOpen.value = true;
      } else if (map[e.key.toLowerCase()] && !e.shiftKey) {
        navigate(map[e.key.toLowerCase()]!);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);
}

export function App() {
  useUpdatePrompt();
  useGlobalShortcuts();
  const mainRef = useRef<HTMLElement>(null);
  const name = routeName.value;

  // Startansicht
  useEffect(() => {
    if (!name) navigate(settings.value.startView === 'programm' ? '/programm' : '/jetzt', true);
  }, [name]);

  // Onboarding beim ersten Start
  useEffect(() => {
    if (!settings.value.onboarded && indexState.value === 'ready' && !route.value.query.has('d')) onboardingOpen.value = true;
  }, [indexState.value]);

  // Seitenwechsel: Titel setzen, nach oben scrollen, Fokus auf Überschrift (Screenreader).
  const path = route.value.path.join('/');
  const first = useRef(true);
  useEffect(() => {
    document.title = `${TITLES[name] ?? 'Flimmer'} · Flimmer`;
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    requestAnimationFrame(() => mainRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true }));
  }, [path]);

  const View = VIEWS[name] ?? NowView;
  const ready = indexState.value === 'ready' && index.value;

  return (
    <div class="app">
      <a class="skip" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>
        Zum Inhalt springen
      </a>
      <Nav />
      <main id="main" ref={mainRef} tabIndex={-1}>
        <StatusBanner />
        {ready ? <View /> : indexState.value === 'error' ? <FatalError /> : <div class="view"><div class="page-header"><span class="sk sk-line" style={{ width: '40%', height: '2rem' }} /></div><Skeleton rows={9} variant="card" /></div>}
      </main>
      {ready ? <DetailSheet /> : null}
      {ready ? <Onboarding /> : null}
      <ShortcutsDialog />
      <Toasts />
      <LiveRegion />
    </div>
  );
}

export function boot(): void {
  void loadIndex();
  // Neue Daten beim Zurückkehren in die App (alle 6 h aktualisiert)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !index.value) return;
    const age = Date.now() - Date.parse(index.value.generatedAt);
    if (age > 3 * 3600 * 1000) void loadIndex(true);
  });
  window.addEventListener('online', () => void loadIndex(true));
  // Sobald der Service Worker die Seite übernimmt: aktuelle Daten einmal über ihn
  // abrufen, damit sie im Offline-Cache liegen (erster Besuch).
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    const idx = index.value;
    const urls = ['/data/index.json'];
    if (idx) {
      const t = tvDayOf(Date.now());
      for (const d of [addDays(t, -1), t, addDays(t, 1)]) if (idx.days.includes(d)) urls.push(`/data/days/${d}.json`, `/data/details/${d}.json`);
    }
    for (const u of urls) void fetch(u).catch(() => undefined);
  });
}
