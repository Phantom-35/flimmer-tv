import { PageHeader, Segmented } from '../components/bits';
import { Icon } from '../components/Icon';
import { downloadFile } from '../lib/ics';
import { notificationPermission, requestNotificationPermission } from '../lib/reminders';
import { channelPrefs, type ChannelPrefs } from '../store/channels';
import { clearAllLocalData } from '../store/persist';
import { DEFAULT_SETTINGS, settings, updateSettings, type Settings, type Theme } from '../store/settings';
import { onboardingOpen, showToast } from '../store/ui';
import { watchlist, type WatchItem } from '../store/watchlist';
import { useState } from 'preact/hooks';

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
    settings: { ...DEFAULT_SETTINGS, ...(typeof d.settings === 'object' ? d.settings : {}) },
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

export function SettingsView() {
  const s = settings.value;
  const [perm, setPerm] = useState(notificationPermission());
  return (
    <div class="view view-settings">
      <PageHeader title="Einstellungen" sub="Alles wird nur auf diesem Gerät gespeichert." />

      <section class="card" aria-labelledby="set-look">
        <h2 id="set-look" class="section-title">Darstellung</h2>
        <div class="setting">
          <span class="setting-label" id="lbl-theme">Farbschema</span>
          <Segmented<Theme>
            label="Farbschema"
            value={s.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Hell' },
              { value: 'dark', label: 'Dunkel' },
            ]}
          />
        </div>
        <div class="setting">
          <span class="setting-label">Schriftgröße</span>
          <Segmented<string>
            label="Schriftgröße"
            value={String(s.fontScale)}
            onChange={(v) => updateSettings({ fontScale: Number(v) })}
            options={[
              { value: '0.9', label: 'Klein' },
              { value: '1', label: 'Normal' },
              { value: '1.125', label: 'Groß' },
              { value: '1.25', label: 'Sehr groß' },
            ]}
          />
        </div>
        <div class="setting">
          <span class="setting-label">Zeitformat</span>
          <Segmented<string>
            label="Zeitformat"
            value={s.h12 ? '12' : '24'}
            onChange={(v) => updateSettings({ h12: v === '12' })}
            options={[
              { value: '24', label: '20:15' },
              { value: '12', label: '8:15 PM' },
            ]}
          />
        </div>
        <div class="setting">
          <span class="setting-label">Startansicht</span>
          <Segmented<string>
            label="Startansicht"
            value={s.startView}
            onChange={(v) => updateSettings({ startView: v as Settings['startView'] })}
            options={[
              { value: 'jetzt', label: 'Jetzt im TV' },
              { value: 'programm', label: 'Programmraster' },
            ]}
          />
        </div>
      </section>

      <section class="card" aria-labelledby="set-remind">
        <h2 id="set-remind" class="section-title">Erinnerungen</h2>
        <div class="setting">
          <span class="setting-label">Vorlauf</span>
          <Segmented<string>
            label="Erinnerungsvorlauf"
            value={String(s.reminderLead)}
            onChange={(v) => updateSettings({ reminderLead: Number(v) })}
            options={['0', '5', '10', '15', '30'].map((v) => ({ value: v, label: v === '0' ? 'Beginn' : `${v} Min.` }))}
          />
        </div>
        <div class="setting">
          <span class="setting-label">Benachrichtigungen</span>
          {perm === 'granted' ? (
            <span class="muted">Erlaubt</span>
          ) : perm === 'denied' ? (
            <span class="muted">Im Browser blockiert – in den Website-Einstellungen änderbar</span>
          ) : perm === 'unsupported' ? (
            <span class="muted">Von diesem Browser nicht unterstützt (iOS: erst nach „Zum Home-Bildschirm“)</span>
          ) : (
            <button type="button" class="btn btn-small" onClick={async () => setPerm(await requestNotificationPermission())}>
              Erlauben
            </button>
          )}
        </div>
        <p class="muted small">
          Ehrlicher Hinweis: Web-Apps können ohne eigenen Push-Server nicht benachrichtigen, wenn sie vollständig geschlossen sind. Für sichere
          Erinnerungen nutze „Kalender“ – der Termin enthält einen Alarm mit dem gewählten Vorlauf.
        </p>
      </section>

      <section class="card" aria-labelledby="set-data">
        <h2 id="set-data" class="section-title">Deine Daten</h2>
        <div class="button-list">
          <a class="btn" href="#/sender-verwalten">
            <Icon name="star" size={18} class="icon-outline" /> Sender verwalten
          </a>
          <button type="button" class="btn" onClick={exportData}>
            <Icon name="download" size={18} /> Einstellungen exportieren
          </button>
          <label class="btn">
            <Icon name="upload" size={18} /> Einstellungen importieren
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
          <button type="button" class="btn" onClick={() => (onboardingOpen.value = true)}>
            <Icon name="sparkle" size={18} /> Einführung erneut zeigen
          </button>
          <button
            type="button"
            class="btn"
            onClick={async () => {
              await clearCaches();
              showToast('Programm-Cache geleert – wird neu geladen');
              setTimeout(() => location.reload(), 800);
            }}
          >
            <Icon name="refresh" size={18} /> Programmdaten neu laden
          </button>
          <button
            type="button"
            class="btn btn-danger"
            onClick={async () => {
              if (!confirm('Wirklich alle Einstellungen, Sender und die Merkliste auf diesem Gerät löschen? Das kann nicht rückgängig gemacht werden.')) return;
              clearAllLocalData();
              await clearCaches();
              location.hash = '#/jetzt';
              location.reload();
            }}
          >
            <Icon name="trash" size={18} /> Alle Daten löschen
          </button>
        </div>
      </section>
    </div>
  );
}
