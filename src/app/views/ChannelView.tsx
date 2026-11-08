import { useEffect, useRef } from 'preact/hooks';
import { dayLabel, tvDayOf } from '../../shared/time';
import { ChannelBadge, EmptyState, PageHeader, Skeleton } from '../components/bits';
import { DayPicker } from '../components/Filters';
import { Icon } from '../components/Icon';
import { ProgrammeLine } from '../components/ProgrammeRow';
import { navigate, route } from '../router';
import { isFavorite, toggleFavorite } from '../store/channels';
import { channelsById, dataVersion, dayFailed, getDay, index, loadDay, now, today } from '../store/data';

export function ChannelView() {
  const r = route.value;
  const id = r.path[1] ?? '';
  const ch = channelsById.value.get(id);
  const days = index.value?.days ?? [];
  const t = today.value;
  const day = r.path[2] && days.includes(r.path[2]) ? r.path[2] : t;
  const nowMs = now.value;
  void dataVersion.value;
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    void loadDay(day);
  }, [day]);

  const file = getDay(day);
  // Nur Sendungen, die an diesem TV-Tag beginnen (plus die über 05:00 laufende).
  const progs = (file?.p[id] ?? []).filter((p, i) => tvDayOf(p.s * 1000) === day || i === 0);

  const scrolledFor = useRef('');
  useEffect(() => {
    if (!file || scrolledFor.current === day) return;
    scrolledFor.current = day;
    if (day !== tvDayOf(nowMs)) return;
    const el = listRef.current?.querySelector<HTMLElement>('.line-running');
    el?.scrollIntoView({ block: 'center' });
  });

  if (!ch) {
    return (
      <div class="view">
        <EmptyState title="Sender nicht gefunden" action={<a class="btn" href="#/jetzt">Zur Übersicht</a>} />
      </div>
    );
  }
  const fav = isFavorite(ch.id);
  return (
    <div class="view view-channel">
      <PageHeader title={ch.name} sub={dayLabel(day, t, true)}>
        <ChannelBadge channel={ch} size="lg" />
        <button
          type="button"
          class={`icon-btn${fav ? ' on' : ''}`}
          aria-pressed={fav}
          aria-label={fav ? `${ch.name} aus „Meine Sender“ entfernen` : `${ch.name} zu „Meine Sender“ hinzufügen`}
          onClick={() => toggleFavorite(ch.id)}
        >
          <Icon name="star" size={20} class={fav ? '' : 'icon-outline'} />
        </button>
      </PageHeader>
      <div class="toolbar toolbar-days">
        <DayPicker value={day} onChange={(d) => navigate(`/sender/${id}/${d}`, true)} />
      </div>
      {!file ? (
        dayFailed(day) ? (
          <EmptyState icon="offline" title="Nicht verfügbar" action={<button class="btn" onClick={() => loadDay(day)}>Erneut versuchen</button>} />
        ) : (
          <Skeleton rows={10} />
        )
      ) : !progs.length ? (
        <EmptyState title="Keine Programmdaten">Für diesen Sender liegen an diesem Tag keine Daten vor.</EmptyState>
      ) : (
        <ul class="lines" ref={listRef}>
          {progs.map((p) => (
            <ProgrammeLine key={p.i} p={p} channel={ch} nowMs={nowMs} />
          ))}
        </ul>
      )}
    </div>
  );
}
