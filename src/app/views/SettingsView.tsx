import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { PageHeader, Segmented } from '../components/bits';
import { Icon, type IconName } from '../components/Icon';
import { downloadFile } from '../lib/ics';
import { disablePush, enablePush, pushBusy, pushState, sendTestPush } from '../lib/push';
import { channelPrefs, type ChannelPrefs } from '../store/channels';
import { clearAllLocalData } from '../store/persist';
import { DEFAULT_SETTINGS, settings, updateSettings, type Settings, type Theme } from '../store/settings';
import { onboardingOpen, showToast } from '../store/ui';
import { watchlist, type WatchItem } from '../store/watchlist';

interface ExportFile {
  app: 'flimmer';
  v: 1;
  exportedAt: string;
  settings: Settings;
  channels: ChannelPrefs;
  merkliste: WatchItem[];
}

function exportData(): void {
  const data: ExportFile = {
    app: 'flimmer',
    v: 1,
    exportedAt: new Date().toISOString(),
    settings: settings.value,
    channels: channelPrefs.value,
    merkliste: watchlist.value,
  };
  downloadFile(`flimmer-einstellungen-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
  showToast('Einstellungen exportiert');
}

export function validateImport(raw: unknown): ExportFile {
  const d = raw as Partial<ExportFile>;
  if (!d || d.app !== 'flimmer' || d.v !== 1) throw new Error('Keine Flimmer-Exportdatei');
  const isStrArr = (a: unknown) => Array.isArray(a) && a.every((x) => typeof x === 'string');
  const ch = d.channels as ChannelPrefs | undefined;
  if (!ch || !isStrArr(ch.order) || !isStrArr(ch.favorites) || !isStrArr(ch.hidden)) throw new Error('Senderliste ungültig');
  if (!Array.isArray(d.merkliste) || !d.merkliste.every((w) => typeof w?.id === 'string' && typeof w?.s === 'number' && typeof w?.t === 'string')) {
    throw new Error('Merkliste ungültig');
  }
  return {
    app: 'flimmer',
    v: 1,
    exportedAt: String(d.exportedAt ?? ''),
    // Push-Status gehört zum Gerät, nicht zur Exportdatei
    settings: { ...DEFAULT_SETTINGS, ...(typeof d.settings === 'object' ? d.settings : {}), pushEnabled: settings.value.pushEnabled },
    channels: { order: ch.order, favorites: ch.favorites, hidden: ch.hidden },
    merkliste: d.merkliste,
  };
}

async function importData(file: File): Promise<void> {
  try {
    const parsed = validateImport(JSON.parse(await file.text()));
    settings.value = { ...parsed.settings, onboarded: true };
    channelPrefs.value = parsed.channels;
    watchlist.value = parsed.merkliste;
    showToast('Einstellungen importiert');
  } catch (err) {
    showToast(`Import fehlgeschlagen: ${(err as Error).message}`, { duration: 6000 });
  }
}

async function clearCaches(): Promise<void> {
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('flimmer-')).map((k) => caches.delete(k)));
  }
}

/** Zeile einer gruppierten Liste mit nativem Auswahlfeld (wie in den iOS-Einstellungen). */
function SelectRow<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = `set-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return (
    <div class="row">
      <label class="row-label" for={id}>
        {label}
      </label>
      <span class="row-select">
        <select
          id={id}
          value={String(value)}
          onChange={(e) => {
            const raw = (e.target as HTMLSelectElement).value;
            const opt = options.find((o) => String(o.value) === raw);
            if (opt) onChange(opt.value);
          }}
        >
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={16} />
      </span>
    </div>
  );
}

function ToggleRow({
  label,
  sub,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  sub?: ComponentChildren;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label class={`row row-toggle${disabled ? ' row-disabled' : ''}`}>
      <span class="row-text">
        <span class="row-label">{label}</span>
        {sub ? <span class="row-sub">{sub}</span> : null}
      </span>
      <span class="switch">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
        />
      </span>
    </label>
  );
}

function ActionRow({
  icon,
  label,
  danger,
  onClick,
  href,
}: {
  icon: IconName;
  label: string;
  danger?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <>
      <Icon name={icon} size={20} class={icon === 'star' ? 'icon-outline' : ''} />
      <span class="row-label">{label}</span>
      <Icon name="chevronRight" size={16} class="row-chevron" />
    </>
  );
  const cls = `row row-action${danger ? ' row-danger' : ''}`;
  return href ? (
    <a class={cls} href={href}>
      {inner}
    </a>
  ) : (
    <button type="button" class={cls} onClick={onClick}>
      {inner}
    </button>
  );
}

function PushSection() {
  const [, force] = useState(0);
  const state = pushState();
  const busy = pushBusy.value;
  const sub =
    state === 'on'
      ? 'Auch wenn Flimmer geschlossen ist – für Sendungen mit Glocke auf der Merkliste.'
      : state === 'needs-install'
        ? 'Auf dem iPhone nur in der installierten App: In Safari Teilen → „Zum Home-Bildschirm“, dann Flimmer von dort öffnen.'
        : state === 'denied'
          ? 'Mitteilungen sind blockiert. Erlaube sie in den Einstellungen deines Geräts bzw. Browsers.'
          : state === 'unsupported'
            ? 'Dieser Browser unterstützt keine Mitteilungen. Nutze den Kalender-Export.'
            : 'Erinnert dich vor Sendungen, auch wenn Flimmer geschlossen ist.';
  return (
    <>
      <ToggleRow
        label="Mitteilungen"
        sub={sub}
        checked={state === 'on'}
        disabled={busy || state === 'unsupported' || state === 'needs-install' || state === 'denied'}
        onChange={async (on) => {
          if (on) {
            const r = await enablePush().catch(() => 'off' as const);
            if (r === 'on') showToast('Mitteilungen sind aktiv');
            else if (r === 'denied') showToast('Mitteilungen wurden nicht erlaubt');
            else showToast('Mitteilungen konnten nicht aktiviert werden');
          } else {
            await disablePush();
            showToast('Mitteilungen ausgeschaltet');
          }
          force((n) => n + 1);
        }}
      />
      {state === 'on' ? (
        <ActionRow
          icon="bell"
          label="Test-Mitteilung senden"
          onClick={async () => {
            const ok = await sendTestPush().catch(() => false);
            showToast(ok ? 'Test-Mitteilung ist unterwegs' : 'Test fehlgeschlagen – bitte später erneut versuchen');
          }}
        />
      ) : null}
    </>
  );
}

export function SettingsView() {
  const s = settings.value;
  return (
    <div class="view view-settings">
      <PageHeader title="Einstellungen" />

      <h2 class="group-title">Darstellung</h2>
      <div class="group">
        <div class="row row-block">
          <span class="row-label">Erscheinungsbild</span>
          <Segmented<Theme>
            label="Erscheinungsbild"
            value={s.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={[
              { value: 'system', label: 'Automatisch' },
              { value: 'light', label: 'Hell' },
              { value: 'dark', label: 'Dunkel' },
            ]}
          />
        </div>
        <SelectRow
          label="Schriftgröße"
          value={s.fontScale}
          onChange={(fontScale) => updateSettings({ fontScale })}
          options={[
            { value: 0.9, label: 'Klein' },
            { value: 1, label: 'Normal' },
            { value: 1.125, label: 'Groß' },
            { value: 1.25, label: 'Sehr groß' },
          ]}
        />
        <SelectRow
          label="Uhrzeit"
          value={s.h12 ? '12' : '24'}
          onChange={(v) => updateSettings({ h12: v === '12' })}
          options={[
            { value: '24', label: '20:15' },
            { value: '12', label: '8:15 PM' },
          ]}
        />
        <SelectRow
          label="Startansicht"
          value={s.startView}
          onChange={(startView) => updateSettings({ startView })}
          options={[
            { value: 'jetzt', label: 'Jetzt im TV' },
            { value: 'programm', label: 'Programm' },
          ]}
        />
        <ToggleRow
          label="Senderlogos"
          sub="Lädt die Logos von Wikimedia Commons – nur für dich, siehe Datenschutz."
          checked={s.logos}
          onChange={(logos) => updateSettings({ logos })}
        />
      </div>

      <h2 class="group-title">Erinnerungen</h2>
      <div class="group">
        <PushSection />
        <SelectRow
          label="Vorlauf"
          value={s.reminderLead}
          onChange={(reminderLead) => updateSettings({ reminderLead })}
          options={[0, 5, 10, 15, 30].map((v) => ({ value: v, label: v === 0 ? 'Zum Beginn' : `${v} Min. vorher` }))}
        />
      </div>
      <p class="group-note">Zusätzlich kannst du jede Sendung über „Kalender“ mit Alarm in deinen Kalender übernehmen.</p>

      <h2 class="group-title">Sender und Daten</h2>
      <div class="group">
        <ActionRow icon="star" label="Sender verwalten" href="#/sender-verwalten" />
        <ActionRow icon="download" label="Einstellungen exportieren" onClick={exportData} />
        <label class="row row-action">
          <Icon name="upload" size={20} />
          <span class="row-label">Einstellungen importieren</span>
          <Icon name="chevronRight" size={16} class="row-chevron" />
          <input
            type="file"
            accept="application/json,.json"
            class="sr-only"
            onChange={(e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) void importData(f);
              (e.target as HTMLInputElement).value = '';
            }}
          />
        </label>
        <ActionRow icon="help" label="Einführung erneut zeigen" onClick={() => (onboardingOpen.value = true)} />
        <ActionRow
          icon="refresh"
          label="Programmdaten neu laden"
          onClick={async () => {
            await clearCaches();
            showToast('Programmdaten werden neu geladen');
            setTimeout(() => location.reload(), 600);
          }}
        />
      </div>

      <div class="group">
        <ActionRow
          icon="trash"
          label="Alle Daten löschen"
          danger
          onClick={async () => {
            if (!confirm('Wirklich alle Einstellungen, Sender und die Merkliste auf diesem Gerät löschen? Das kann nicht rückgängig gemacht werden.')) return;
            if (settings.value.pushEnabled) await disablePush().catch(() => undefined);
            clearAllLocalData();
            await clearCaches();
            location.hash = '#/jetzt';
            location.reload();
          }}
        />
      </div>
      <p class="group-note">
        Einstellungen und Merkliste liegen nur auf diesem Gerät. Bei aktiven Mitteilungen speichert der Server zusätzlich die Erinnerungszeiten.
      </p>
    </div>
  );
}
