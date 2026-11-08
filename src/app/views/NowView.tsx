import { useEffect, useMemo } from 'preact/hooks';
import { addDays, dayLabel, formatTime, tvDayOf, tvDayTime } from '../../shared/time';
import type { Channel, GenreKey, Programme } from '../../shared/types';
import { ChannelBadge, EmptyState, PageHeader, Segmented, Skeleton } from '../components/bits';
import { GenreChips, ScopeToggle } from '../components/Filters';
import { Icon } from '../components/Icon';
import { NowCard } from '../components/ProgrammeRow';
import { openDetail, route, setQuery } from '../router';
import { myChannels, visibleChannels } from '../store/channels';
import { airingAt, dataVersion, dayFailed, getDay, hasDay, loadDay, now, programmesFor, today } from '../store/data';
import { settings } from '../store/settings';

type Mode = 'jetzt' | '2015' | '2200' | 'nacht';
const MODES: { value: Mode; label: string }[] = [
  { value: 'jetzt', label: 'Jetzt' },
  { value: '2015', label: '20:15' },
  { value: '2200', label: '22:00' },
  { value: 'nacht', label: 'Nachts' },
];
const MODE_TIME: Record<Exclude<Mode, 'jetzt'>, [number, number]> = { '2015': [20, 15], '2200': [22, 0], nacht: [0, 0] };

/** Zeitpunkt für den Modus. Ist er heute schon >2 h vorbei, nimm den nächsten Tag. */
export function targetFor(mode: Mode, nowMs: number): { ts: number; day: string } {
  const day = tvDayOf(nowMs);
  if (mode === 'jetzt') return { ts: nowMs, day };
  const [h, m] = MODE_TIME[mode];
  const ts = tvDayTime(day, h, m);
  if (ts < nowMs - 2 * 3600_000) return { ts: tvDayTime(addDays(day, 1), h, m), day: addDays(day, 1) };
  return { ts, day };
}

/** Sendung "um 20:15": beginnt kurz vor/nach dem Zeitpunkt, sonst die laufende. */
export function pickAt(progs: Programme[], tsSec: number): { current?: Programme; next?: Programme } {
  const near = progs.find((p) => p.s >= tsSec - 10 * 60 && p.s <= tsSec + 20 * 60);
  if (near) return { current: near, next: progs[progs.indexOf(near) + 1] };
  return airingAt(progs, tsSec + 60);
}

function TipsStrip({ channels, day, nowMs }: { channels: Channel[]; day: string; nowMs: number }) {
  const tips = useMemo(() => {
    const out: { p: Programme; ch: Channel }[] = [];
    for (const ch of channels) {
      for (const p of getDay(day)?.p[ch.id] ?? []) {
        if (p.tip && p.e * 1000 > nowMs && tvDayOf(p.s * 1000) === day) out.push({ p, ch });
      }
    }
    // Gleiche Sendung auf mehreren Sendern (z. B. Tatort in ARD und ORF) nur einmal zeigen.
    const seen = new Set<string>();
    return out
      .sort((a, b) => (b.p.ts ?? 0) - (a.p.ts ?? 0)) // stabil: bei Gleichstand gewinnt die Senderreihenfolge
      .filter(({ p }) => {
        const key = p.t.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 10)
      .sort((a, b) => a.p.s - b.p.s);
  }, [channels, day, dataVersion.value, Math.floor(nowMs / 300000)]);
  if (!tips.length) return null;
  const h12 = settings.value.h12;
  return (
    <section class="tips" aria-labelledby="tips-h">
      <h2 id="tips-h" class="section-title">
        <Icon name="sparkle" size={18} /> Tipps {dayLabel(day, today.value) === 'Heute' ? 'für heute' : `für ${dayLabel(day, today.value)}`}
        <span class="section-hint">nach nachvollziehbaren Kriterien, nicht gekauft</span>
      </h2>
      <ul class="tips-list">
        {tips.map(({ p, ch }) => (
          <li key={p.i}>
            <button type="button" class="tipcard" onClick={() => openDetail(p.i)}>
              <span class="tipcard-top">
                <ChannelBadge channel={ch} size="sm" />
                <span class="tipcard-time">{formatTime(p.s * 1000, h12)}</span>
                <span class="tipcard-ch">{ch.name}</span>
              </span>
              <span class="tipcard-title">{p.t}</span>
              <span class="tipcard-reason">{p.tip}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function NowView() {
  const q = route.value.query;
  const mode = (MODES.some((m) => m.value === q.get('zeit')) ? q.get('zeit') : 'jetzt') as Mode;
  const genre = (q.get('genre') ?? '') as GenreKey | '';
  const scope = q.get('sender') === 'alle' ? 'alle' : 'meine';
  const nowMs = now.value;
  const { ts, day } = targetFor(mode, nowMs);
  const prevDay = tvDayOf(ts - 6 * 3600_000);
  const needed = [...new Set([prevDay, day])];
  const channels = scope === 'alle' ? visibleChannels.value : myChannels.value;
  void dataVersion.value;

  useEffect(() => {
    void Promise.all(needed.map(loadDay));
    // Morgen im Hintergrund vorladen (Offline, schneller Tageswechsel)
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500));
    idle(() => void loadDay(addDays(today.value, 1)));
  }, [needed.join()]);

  const loaded = needed.every((d) => !hasDay(d) || getDay(d));
  const failed = needed.some((d) => dayFailed(d));
  const tsSec = Math.floor(ts / 1000);

  const rows = channels.map((ch) => {
    const progs = programmesFor(ch.id, needed);
    const r = mode === 'jetzt' ? airingAt(progs, tsSec) : pickAt(progs, tsSec);
    return { ch, ...r };
  });
  const counts: Partial<Record<GenreKey, number>> = {};
  for (const r of rows) {
    const p = r.current ?? r.next;
    if (p) counts[p.g] = (counts[p.g] ?? 0) + 1;
  }
  const filtered = genre ? rows.filter((r) => (r.current ?? r.next)?.g === genre) : rows;
  const label = mode === 'jetzt' ? 'Jetzt im TV' : `${dayLabel(day, today.value)} ${formatTime(ts, settings.value.h12)}`;

  return (
    <div class="view view-now">
      <PageHeader title={label} sub={mode === 'jetzt' ? `${formatTime(nowMs, settings.value.h12)} Uhr · ${channels.length} Sender` : `Was um ${formatTime(ts, settings.value.h12)} läuft`}>
        <ScopeToggle value={scope} onChange={(v) => setQuery({ sender: v === 'alle' ? 'alle' : undefined })} />
      </PageHeader>
      <div class="toolbar">
        <Segmented label="Zeitpunkt" options={MODES} value={mode} onChange={(v) => setQuery({ zeit: v === 'jetzt' ? undefined : v })} />
      </div>
      {(mode === 'jetzt' || mode === '2015') && loaded ? <TipsStrip channels={channels} day={day} nowMs={nowMs} /> : null}
      <div class="toolbar toolbar-chips">
        <GenreChips value={genre} counts={loaded ? counts : undefined} onChange={(g) => setQuery({ genre: g || undefined })} />
      </div>
      {!loaded && !failed ? (
        <Skeleton rows={8} variant="card" />
      ) : failed && !loaded ? (
        <EmptyState icon="offline" title="Programm nicht verfügbar" action={<button class="btn" onClick={() => needed.forEach(loadDay)}>Erneut versuchen</button>}>
          Die Daten für diesen Tag konnten nicht geladen werden. Prüfe deine Verbindung.
        </EmptyState>
      ) : !channels.length ? (
        <EmptyState title="Keine Sender ausgewählt" action={<a class="btn" href="#/sender-verwalten">Sender auswählen</a>} />
      ) : !filtered.length ? (
        <EmptyState icon="filter" title="Nichts gefunden" action={<button class="btn" onClick={() => setQuery({ genre: undefined })}>Filter zurücksetzen</button>}>
          Zu diesem Zeitpunkt läuft in diesem Genre nichts auf deinen Sendern.
        </EmptyState>
      ) : (
        <div class="nowgrid">
          {filtered.map((r) => (
            <NowCard key={r.ch.id} channel={r.ch} current={r.current} next={r.next} nowMs={nowMs} mode={mode === 'jetzt' ? 'now' : 'at'} />
          ))}
        </div>
      )}
    </div>
  );
}
