import { dayLabel, formatTime, tvDayOf } from '../../shared/time';
import { ChannelBadge, EmptyState, GenreTag, PageHeader } from '../components/bits';
import { Icon } from '../components/Icon';
import { exportWatchlistIcs } from '../lib/actions';
import { notificationPermission } from '../lib/reminders';
import { openDetail } from '../router';
import { channelsById, now, today } from '../store/data';
import { settings } from '../store/settings';
import { showToast } from '../store/ui';
import { addWatch, removeWatch, setRemind, watchlist, type WatchItem } from '../store/watchlist';

function Item({ w, nowMs }: { w: WatchItem; nowMs: number }) {
  const ch = channelsById.value.get(w.ch);
  const h12 = settings.value.h12;
  const running = w.s * 1000 <= nowMs && w.e * 1000 > nowMs;
  const past = w.e * 1000 <= nowMs;
  return (
    <li class={`watch${past ? ' line-past' : ''}${running ? ' line-running' : ''}`}>
      <button type="button" class="watch-main" onClick={() => openDetail(w.id)}>
        <ChannelBadge channel={ch} size="sm" />
        <span class="line-body">
          <span class="line-title">{w.t}</span>
          <span class="line-meta meta">
            <span>
              {dayLabel(tvDayOf(w.s * 1000), today.value)}, {formatTime(w.s * 1000, h12)}
            </span>
            <span>{ch?.name}</span>
            <GenreTag g={w.g} />
            {running ? <span class="flag flag-live">Läuft</span> : null}
          </span>
          {w.ep || w.st ? <span class="line-sub">{[w.ep, w.st].filter(Boolean).join(' · ')}</span> : null}
        </span>
      </button>
      {!past ? (
        <button
          type="button"
          class={`icon-btn${w.remind ? ' on' : ''}`}
          aria-pressed={w.remind}
          aria-label={w.remind ? `Erinnerung für ${w.t} entfernen` : `An ${w.t} erinnern`}
          onClick={() => setRemind(w.id, !w.remind)}
        >
          <Icon name={w.remind ? 'bell' : 'bellOff'} size={20} />
        </button>
      ) : null}
      <button
        type="button"
        class="icon-btn"
        aria-label={`${w.t} von der Merkliste entfernen`}
        onClick={() => {
          removeWatch(w.id);
          showToast('Entfernt', { action: { label: 'Rückgängig', run: () => addWatch(w) } });
        }}
      >
        <Icon name="trash" size={20} />
      </button>
    </li>
  );
}

export function WatchlistView() {
  const nowMs = now.value;
  const items = watchlist.value;
  const upcoming = items.filter((w) => w.e * 1000 > nowMs);
  const past = items.filter((w) => w.e * 1000 <= nowMs).reverse();
  const anyRemind = upcoming.some((w) => w.remind);
  const perm = notificationPermission();
  return (
    <div class="view view-watch">
      <PageHeader title="Merkliste" sub={upcoming.length ? `${upcoming.length} kommende Sendung${upcoming.length === 1 ? '' : 'en'}` : undefined}>
        {upcoming.length ? (
          <button type="button" class="btn btn-small" onClick={() => exportWatchlistIcs(items, (id) => channelsById.value.get(id)?.name ?? id)}>
            <Icon name="calendar" size={16} /> Alle in den Kalender
          </button>
        ) : null}
      </PageHeader>
      {!items.length ? (
        <EmptyState icon="bookmark" title="Noch nichts gemerkt" action={<a class="btn" href="#/jetzt">Zum Programm</a>}>
          Tippe bei einer Sendung auf das Lesezeichen. Gemerkte Sendungen bleiben auf diesem Gerät gespeichert – ohne Konto.
        </EmptyState>
      ) : (
        <>
          {anyRemind ? (
            <p class="note">
              <Icon name="info" size={18} />
              <span>
                Erinnerungen kommen {settings.value.reminderLead} Min. vor Beginn, solange Flimmer geöffnet ist oder im Hintergrund läuft
                {perm === 'denied' ? ' (Benachrichtigungen sind im Browser blockiert)' : ''}. Für zuverlässige Erinnerungen bei geschlossener App:
                „Alle in den Kalender“.
              </span>
            </p>
          ) : null}
          {upcoming.length ? (
            <ul class="lines">
              {upcoming.map((w) => (
                <Item key={w.id} w={w} nowMs={nowMs} />
              ))}
            </ul>
          ) : (
            <p class="muted pad">Keine kommenden Sendungen.</p>
          )}
          {past.length ? (
            <details class="past">
              <summary>Vorbei ({past.length})</summary>
              <ul class="lines">
                {past.map((w) => (
                  <Item key={w.id} w={w} nowMs={nowMs} />
                ))}
              </ul>
              <p class="muted small">Vergangene Einträge werden nach 7 Tagen automatisch entfernt.</p>
            </details>
          ) : null}
        </>
      )}
    </div>
  );
}
