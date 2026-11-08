import { PageHeader } from '../components/bits';
import { Icon, type IconName } from '../components/Icon';
import { installPrompt, isIos, isStandalone, shortcutsOpen } from '../store/ui';
import { DataStamp } from '../components/Shell';

const LINKS: { href: string; icon: IconName; label: string; sub?: string }[] = [
  { href: '#/einstellungen', icon: 'settings', label: 'Einstellungen', sub: 'Design, Schrift, Zeitformat, Daten' },
  { href: '#/sender-verwalten', icon: 'star', label: 'Sender verwalten', sub: 'Meine Sender, Reihenfolge, ausblenden' },
  { href: '#/seite/hilfe', icon: 'help', label: 'Hilfe & FAQ' },
  { href: '#/seite/ueber', icon: 'info', label: 'Über Flimmer', sub: 'Version und Änderungen' },
  { href: '#/seite/quellen', icon: 'doc', label: 'Datenquellen & Lizenzen' },
  { href: '#/seite/feedback', icon: 'mail', label: 'Feedback & Kontakt' },
  { href: '#/seite/datenschutz', icon: 'shield', label: 'Datenschutz' },
  { href: '#/seite/impressum', icon: 'doc', label: 'Impressum' },
];

export function InstallCard() {
  if (isStandalone.value) return null;
  const prompt = installPrompt.value;
  if (prompt) {
    return (
      <div class="card install-card">
        <Icon name="install" size={24} />
        <div>
          <strong>Flimmer installieren</strong>
          <p class="muted small">Startet wie eine App, funktioniert offline, kein App-Store nötig.</p>
        </div>
        <button
          type="button"
          class="btn btn-accent"
          onClick={async () => {
            await prompt.prompt();
            installPrompt.value = null;
          }}
        >
          Installieren
        </button>
      </div>
    );
  }
  if (isIos()) {
    return (
      <div class="card install-card">
        <Icon name="install" size={24} />
        <div>
          <strong>Auf den Home-Bildschirm</strong>
          <p class="muted small">
            In Safari unten auf Teilen tippen, dann „Zum Home-Bildschirm“. Danach startet Flimmer wie eine App – mit Mitteilungen.
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export function MoreView() {
  return (
    <div class="view view-more">
      <PageHeader title="Mehr" sub={<DataStamp long />} />
      <InstallCard />
      <nav aria-label="Weitere Seiten">
        <ul class="menu">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href}>
                <Icon name={l.icon} size={22} class={l.icon === 'star' ? 'icon-outline' : ''} />
                <span class="menu-text">
                  <span>{l.label}</span>
                  {l.sub ? <span class="muted small">{l.sub}</span> : null}
                </span>
                <Icon name="chevronRight" size={18} />
              </a>
            </li>
          ))}
          <li class="only-desktop">
            <button type="button" onClick={() => (shortcutsOpen.value = true)}>
              <Icon name="keyboard" size={22} />
              <span class="menu-text">
                <span>Tastaturkürzel</span>
                <span class="muted small">Taste ? drücken</span>
              </span>
              <Icon name="chevronRight" size={18} />
            </button>
          </li>
        </ul>
      </nav>
      <p class="muted small center">Flimmer {__APP_VERSION__}</p>
    </div>
  );
}
