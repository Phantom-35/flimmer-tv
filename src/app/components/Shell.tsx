import { useEffect, useRef } from 'preact/hooks';
import { berlinDate, formatTime } from '../../shared/time';
import { routeName } from '../router';
import { index, indexState, loadIndex, now } from '../store/data';
import { settings } from '../store/settings';
import { announcement, dismissToast, online, shortcutsOpen, toasts } from '../store/ui';
import { watchlist } from '../store/watchlist';
import { Icon, type IconName } from './Icon';

const NAV: { name: string; href: string; icon: IconName; label: string; key: string }[] = [
  { name: 'jetzt', href: '#/jetzt', icon: 'now', label: 'Jetzt', key: 'J' },
  { name: 'programm', href: '#/programm', icon: 'grid', label: 'Programm', key: 'P' },
  { name: 'suche', href: '#/suche', icon: 'search', label: 'Suche', key: '/' },
  { name: 'merkliste', href: '#/merkliste', icon: 'bookmark', label: 'Merkliste', key: 'M' },
  { name: 'mehr', href: '#/mehr', icon: 'more', label: 'Mehr', key: '' },
];

const SECTION_OF: Record<string, string> = {
  sender: 'programm',
  einstellungen: 'mehr',
  'sender-verwalten': 'mehr',
  seite: 'mehr',
};

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" class="logo-mark">
      <rect x="4" y="9" width="40" height="30" rx="9" fill="var(--accent)" />
      <path d="M14 20h20M14 26h14M14 32h8" stroke="var(--on-accent)" stroke-width="3.4" stroke-linecap="round" />
      <circle cx="34" cy="31" r="3.2" fill="var(--on-accent)" />
    </svg>
  );
}

/** "Stand: heute 12:56" bzw. lange Variante. */
export function DataStamp({ long = false }: { long?: boolean }) {
  const idx = index.value;
  if (!idx) return <span>Programmdaten werden geladen …</span>;
  const ms = Date.parse(idx.generatedAt);
  const sameDay = berlinDate(ms) === berlinDate(now.value);
  const hours = Math.round((now.value - ms) / 3600000);
  const when = sameDay
    ? `heute ${formatTime(ms, settings.value.h12)}`
    : new Date(ms).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
  const old = hours >= 24;
  return (
    <span class={old ? 'stamp-old' : ''}>
      Stand: {when}
      {long ? ` · ${idx.days.length} Tage · ${idx.channels.length} Sender` : ''}
      {old ? ' – Daten sind älter als einen Tag' : ''}
    </span>
  );
}

export function Nav() {
  const current = SECTION_OF[routeName.value] ?? (routeName.value || 'jetzt');
  const upcoming = watchlist.value.filter((w) => w.e * 1000 > now.value).length;
  return (
    <nav class="nav" aria-label="Hauptnavigation">
      <a class="nav-brand" href="#/jetzt" aria-label="Flimmer – zur Startseite">
        <Logo />
        <span class="nav-brand-name">Flimmer</span>
      </a>
      <ul>
        {NAV.map((n) => (
          <li key={n.name}>
            <a href={n.href} aria-current={current === n.name ? 'page' : undefined} aria-keyshortcuts={n.key ? n.key.toLowerCase() : undefined}>
              <span class="nav-icon">
                <Icon name={n.icon} size={24} />
                {n.name === 'merkliste' && upcoming ? (
                  <span class="nav-dot">
                    <span aria-hidden="true">{upcoming > 9 ? '9+' : upcoming}</span>
                    <span class="sr-only">, {upcoming} kommende</span>
                  </span>
                ) : null}
              </span>
              <span class="nav-label">{n.label}</span>
              {n.key ? <kbd class="nav-key" aria-hidden="true">{n.key}</kbd> : null}
            </a>
          </li>
        ))}
      </ul>
      <div class="nav-foot">
        <DataStamp />
      </div>
    </nav>
  );
}

export function StatusBanner() {
  if (!online.value) {
    return (
      <div class="banner banner-offline" role="status">
        <Icon name="offline" size={18} /> Offline – du siehst den zuletzt geladenen Stand.
      </div>
    );
  }
  if (indexState.value === 'ready' && index.value?.stale.length) {
    return (
      <div class="banner" role="status">
        <Icon name="info" size={18} /> Für {index.value.stale.length} Sender wird vorübergehend der letzte gute Stand angezeigt.
      </div>
    );
  }
  return null;
}

export function Toasts() {
  return (
    <div class="toasts" role="status" aria-live="polite">
      {toasts.value.map((t) => (
        <div class="toast" key={t.id}>
          <span>{t.text}</span>
          {t.action ? (
            <button
              type="button"
              class="toast-action"
              onClick={() => {
                t.action!.run();
                dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          ) : null}
          <button type="button" class="icon-btn toast-close" aria-label="Hinweis schließen" onClick={() => dismissToast(t.id)}>
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function LiveRegion() {
  return (
    <div class="sr-only" aria-live="polite" aria-atomic="true">
      {announcement.value}
    </div>
  );
}

const SHORTCUTS: [string, string][] = [
  ['J', 'Jetzt im TV'],
  ['P', 'Programmraster'],
  ['/', 'Suche'],
  ['M', 'Merkliste'],
  ['E', 'Einstellungen'],
  ['N', 'Im Raster: zu „jetzt“ springen'],
  ['Alt + ← / →', 'Im Raster: Tag zurück / vor'],
  ['Pfeiltasten', 'Im Raster: zwischen Sendungen bewegen'],
  ['Enter', 'Sendung öffnen'],
  ['Esc', 'Dialog schließen'],
  ['?', 'Diese Übersicht'],
];

export function ShortcutsDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (shortcutsOpen.value && !d.open) d.showModal();
    if (!shortcutsOpen.value && d.open) d.close();
  }, [shortcutsOpen.value]);
  return (
    <dialog
      ref={ref}
      class="modal"
      aria-labelledby="sc-title"
      onClose={() => (shortcutsOpen.value = false)}
      onClick={(e) => e.target === ref.current && (shortcutsOpen.value = false)}
    >
      <div class="modal-inner">
        <h2 id="sc-title">Tastaturkürzel</h2>
        <dl class="shortcuts">
          {SHORTCUTS.map(([k, v]) => (
            <div key={k}>
              <dt>
                <kbd>{k}</kbd>
              </dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <button type="button" class="btn" onClick={() => (shortcutsOpen.value = false)}>
          Schließen
        </button>
      </div>
    </dialog>
  );
}

export function FatalError() {
  return (
    <div class="fatal" role="alert">
      <Logo size={48} />
      <h1>Programm nicht verfügbar</h1>
      <p class="muted">Die Programmdaten konnten nicht geladen werden. Bitte prüfe deine Internetverbindung.</p>
      <button type="button" class="btn btn-accent" onClick={() => void loadIndex(true)}>
        <Icon name="refresh" size={18} /> Erneut versuchen
      </button>
    </div>
  );
}
