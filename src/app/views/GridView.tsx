import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { dayLabel, formatTime, tvDayOf, tvDayRange, tvDayTime } from '../../shared/time';
import type { Channel, GenreKey, Programme } from '../../shared/types';
import { ChannelBadge, EmptyState, PageHeader } from '../components/bits';
import { DayPicker, GenreChips, ScopeToggle } from '../components/Filters';
import { Icon } from '../components/Icon';
import { navigate, openDetail, route, setQuery } from '../router';
import { myChannels, visibleChannels } from '../store/channels';
import { dataVersion, dayFailed, getDay, hasDay, index, loadDay, now, today } from '../store/data';
import { settings, updateSettings } from '../store/settings';
import { watchIds } from '../store/watchlist';

const JUMPS: { label: string; h: number; m: number }[] = [
  { label: 'Früh', h: 6, m: 0 },
  { label: 'Mittag', h: 12, m: 0 },
  { label: 'Vorabend', h: 17, m: 30 },
  { label: '20:15', h: 20, m: 15 },
  { label: 'Nacht', h: 23, m: 0 },
];

function useWide(): boolean {
  const [wide, setWide] = useState(() => matchMedia('(min-width: 900px)').matches);
  useEffect(() => {
    const mq = matchMedia('(min-width: 900px)');
    const fn = () => setWide(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return wide;
}

function Row({
  ch,
  progs,
  start,
  end,
  ppm,
  genre,
  rowIndex,
  nowSec,
  win,
}: {
  win: [number, number];
  ch: Channel;
  progs: Programme[];
  start: number;
  end: number;
  ppm: number;
  genre: GenreKey | '';
  rowIndex: number;
  nowSec: number;
}) {
  const h12 = settings.value.h12;
  const watched = watchIds.value;
  return (
    <div class="grid-row" role="row" aria-label={ch.name}>
      <div class="grid-ch" role="rowheader">
        <a class="grid-ch-link" href={`#/sender/${ch.id}`} title={`Tagesprogramm ${ch.name}`} aria-label={`${ch.name}, Tagesprogramm`}>
          <ChannelBadge channel={ch} size="sm" />
          <span class="grid-chname">{ch.name}</span>
        </a>
      </div>
      <div class="grid-track" role="presentation">
        {progs.map((p) => {
          if (p.e <= win[0] || p.s >= win[1]) return null; // nur sichtbarer Zeitbereich (+ Puffer)
          const s = Math.max(p.s, start);
          const e = Math.min(p.e, end);
          if (e <= s) return null;
          const left = ((s - start) / 60) * ppm;
          const width = ((e - s) / 60) * ppm;
          const running = p.s <= nowSec && p.e > nowSec;
          const past = p.e <= nowSec;
          const dim = genre && p.g !== genre;
          const narrow = width < 46;
          return (
            <button
              type="button"
              key={p.i}
              role="gridcell"
              class={`cell g-${p.g}${running ? ' running' : ''}${past ? ' past' : ''}${dim ? ' dim' : ''}${narrow ? ' narrow' : ''}${p.tip ? ' tip' : ''}`}
              style={{ left: `${left}px`, width: `${Math.max(2, width - 2)}px` }}
              data-row={rowIndex}
              data-s={p.s}
              data-e={p.e}
              tabIndex={-1}
              aria-label={`${formatTime(p.s * 1000, h12)} bis ${formatTime(p.e * 1000, h12)}, ${ch.name}: ${p.t}${running ? ', läuft gerade' : ''}${watched.has(p.i) ? ', gemerkt' : ''}`}
              onClick={() => openDetail(p.i)}
            >
              {narrow ? null : (
                <span class="cell-inner">
                  <span class="cell-title">
                    {watched.has(p.i) ? <Icon name="bookmarkFilled" size={12} /> : null}
                    {p.t}
                  </span>
                  <span class="cell-time">
                    {formatTime(p.s * 1000, h12)}
                    {p.st && width > 140 ? ` · ${p.st}` : ''}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GridView() {
  const r = route.value;
  const t = today.value;
  const requested = r.path[1];
  const days = index.value?.days ?? [];
  const day = requested && days.includes(requested) ? requested : t;
  const genre = (r.query.get('genre') ?? '') as GenreKey | '';
  const scope = r.query.get('sender') === 'alle' ? 'alle' : 'meine';
  const channels = scope === 'alle' ? visibleChannels.value : myChannels.value;
  const wide = useWide();
  const ppm = (wide ? 4.4 : 3.6) * settings.value.gridZoom;
  const chW = wide ? 168 : 64;
  const [startMs, endMs] = tvDayRange(day);
  const start = startMs / 1000;
  const end = endMs / 1000;
  const totalW = ((end - start) / 60) * ppm;
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowMs = now.value;
  // Horizontales Fenstern: Nur Sendungen im sichtbaren Bereich ± 2 h rendern (schnell auch bei 50+ Sendern).
  const [win, setWin] = useState<[number, number]>([start, end]);
  const updateWindow = () => {
    const el = scrollRef.current;
    if (!el) return;
    const visFrom = start + ((el.scrollLeft) / ppm) * 60;
    const visTo = start + ((el.scrollLeft + el.clientWidth) / ppm) * 60;
    const from = Math.floor((visFrom - 7200 - start) / 3600) * 3600 + start;
    const to = Math.ceil((visTo + 7200 - start) / 3600) * 3600 + start;
    setWin((w) => (w[0] === from && w[1] === to ? w : [from, to]));
  };
  useEffect(updateWindow, [ppm, day]);
  const rafRef = useRef(0);
  const onScroll = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateWindow);
  };
  const nowSec = Math.floor(nowMs / 1000);
  void dataVersion.value;

  useEffect(() => {
    void loadDay(day);
  }, [day]);
  const file = getDay(day);
  const loaded = !!file || !hasDay(day);

  const scrollToTime = (ms: number, smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    // Etwas Vorlauf links, damit laufende Sendungen mit Anfang sichtbar sind.
    const lead = Math.min((el.clientWidth - chW) * 0.3, 40 * ppm);
    const x = ((ms / 1000 - start) / 60) * ppm - lead;
    el.scrollTo({ left: Math.max(0, x), behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
  };

  // Beim Öffnen: heute -> jetzt, sonst 20:15 bzw. ?zeit=
  const jumpKey = `${day}|${loaded}|${r.query.get('zeit') ?? ''}`;
  const lastJump = useRef('');
  useLayoutEffect(() => {
    if (!loaded || lastJump.current === jumpKey) return;
    lastJump.current = jumpKey;
    const z = r.query.get('zeit');
    if (z && /^\d{4}$/.test(z)) scrollToTime(tvDayTime(day, Number(z.slice(0, 2)), Number(z.slice(2))), false);
    else if (day === tvDayOf(nowMs)) scrollToTime(nowMs, false);
    else scrollToTime(tvDayTime(day, 20, 15), false);
    updateWindow();
  }, [jumpKey]);

  // Tastatursteuerung im Raster (Pfeiltasten, Pos1/Ende, Enter).
  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('cell')) return;
    const row = Number(target.dataset.row);
    const s = Number(target.dataset.s);
    const e2 = Number(target.dataset.e);
    const container = scrollRef.current!;
    const cellsOf = (ri: number) => Array.from(container.querySelectorAll<HTMLElement>(`.cell[data-row="${ri}"]`));
    let next: HTMLElement | undefined;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const cells = cellsOf(row);
      const i = cells.indexOf(target);
      next = cells[i + (e.key === 'ArrowRight' ? 1 : -1)];
      if (!next && ((e.key === 'ArrowRight' && e2 < end) || (e.key === 'ArrowLeft' && s > start))) {
        // Nachbar liegt außerhalb des gerenderten Fensters: Fenster verschieben, dann fokussieren.
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const edge = dir > 0 ? e2 : s;
        setWin([Math.max(start, edge - 4 * 3600), Math.min(end, edge + 4 * 3600)]);
        requestAnimationFrame(() => {
          const again = cellsOf(row);
          const n = dir > 0 ? again.find((c) => Number(c.dataset.s) >= e2) : [...again].reverse().find((c) => Number(c.dataset.e) <= s);
          if (n) {
            target.tabIndex = -1;
            n.tabIndex = 0;
            n.focus();
            n.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }
        });
        return;
      }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const mid = (s + e2) / 2;
      const cells = cellsOf(row + (e.key === 'ArrowDown' ? 1 : -1));
      next = cells.find((c) => Number(c.dataset.s) <= mid && Number(c.dataset.e) > mid) ?? cells.find((c) => Number(c.dataset.s) >= s) ?? cells[cells.length - 1];
    } else if (e.key === 'Home' || e.key === 'End') {
      const cells = cellsOf(row);
      next = e.key === 'Home' ? cells[0] : cells[cells.length - 1];
    }
    if (next) {
      e.preventDefault();
      target.tabIndex = -1;
      next.tabIndex = 0;
      next.focus({ preventScroll: false });
      next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  // Genau eine Zelle ist per Tab erreichbar (roving tabindex): die laufende bzw. erste.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.querySelector('.cell[tabindex="0"]')) return;
    const first = el.querySelector<HTMLElement>('.cell.running') ?? el.querySelector<HTMLElement>('.cell');
    if (first) first.tabIndex = 0;
  });

  // Tastenkürzel N = jetzt, ←/→ mit Alt = Tag wechseln
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select,[role="dialog"]')) return;
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (day !== t) navigate(`/programm/${t}`);
        else scrollToTime(Date.now());
      }
      if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const i = days.indexOf(day) + (e.key === 'ArrowRight' ? 1 : -1);
        if (days[i]) navigate(`/programm/${days[i]}`);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  });

  const hours: number[] = [];
  for (let ts = start; ts < end; ts += 1800) hours.push(ts);
  const showNow = nowSec >= start && nowSec < end;

  return (
    <div class="view view-grid">
      <PageHeader title="Programm" sub={dayLabel(day, t, true)}>
        <ScopeToggle value={scope} onChange={(v) => setQuery({ sender: v === 'alle' ? 'alle' : undefined })} />
      </PageHeader>
      <div class="toolbar toolbar-days">
        <DayPicker value={day} onChange={(d) => navigate(`/programm/${d}${r.query.toString() ? `?${r.query}` : ''}`, true)} />
      </div>
      <div class="toolbar toolbar-jumps">
        <button
          type="button"
          class="btn btn-accent btn-small"
          onClick={() => (day === t ? scrollToTime(Date.now()) : navigate(`/programm/${t}`))}
          aria-keyshortcuts="n"
        >
          <Icon name="clock" size={16} /> Jetzt
        </button>
        {JUMPS.map((j) => (
          <button type="button" key={j.label} class="btn btn-ghost btn-small" onClick={() => scrollToTime(tvDayTime(day, j.h, j.m))}>
            {j.label}
          </button>
        ))}
        <span class="toolbar-spacer" />
        <button
          type="button"
          class="icon-btn"
          aria-label="Verkleinern"
          disabled={settings.value.gridZoom <= 0.6}
          onClick={() => updateSettings({ gridZoom: Math.max(0.6, +(settings.value.gridZoom - 0.2).toFixed(1)) })}
        >
          <Icon name="zoomOut" size={20} />
        </button>
        <button
          type="button"
          class="icon-btn"
          aria-label="Vergrößern"
          disabled={settings.value.gridZoom >= 2}
          onClick={() => updateSettings({ gridZoom: Math.min(2, +(settings.value.gridZoom + 0.2).toFixed(1)) })}
        >
          <Icon name="zoomIn" size={20} />
        </button>
      </div>
      <div class="toolbar toolbar-chips">
        <GenreChips value={genre} onChange={(g) => setQuery({ genre: g || undefined })} />
      </div>
      {!loaded ? (
        dayFailed(day) ? (
          <EmptyState icon="offline" title="Programm nicht verfügbar" action={<button class="btn" onClick={() => loadDay(day)}>Erneut versuchen</button>}>
            Die Daten für {dayLabel(day, t)} konnten nicht geladen werden.
          </EmptyState>
        ) : (
          <div class="grid-skeleton" role="status" aria-busy="true" aria-label="Programm lädt">
            {Array.from({ length: 8 }, (_, i) => (
              <div class="sk-gridrow" key={i}>
                <span class="sk sk-badge" />
                <span class="sk sk-block" style={{ width: `${30 + ((i * 13) % 30)}%` }} />
                <span class="sk sk-block" style={{ width: `${20 + ((i * 7) % 25)}%` }} />
              </div>
            ))}
          </div>
        )
      ) : !channels.length ? (
        <EmptyState title="Keine Sender ausgewählt" action={<a class="btn" href="#/sender-verwalten">Sender auswählen</a>} />
      ) : (
        <div
          class="grid-scroll"
          ref={scrollRef}
          role="grid"
          aria-label={`Programmraster ${dayLabel(day, t, true)}. Mit Pfeiltasten navigieren.`}
          aria-rowcount={channels.length}
          style={{ '--ch-w': `${chW}px`, '--track-w': `${totalW}px` }}
          onKeyDown={onKeyDown}
          onScroll={onScroll}
        >
          <div class="grid-inner">
            <div class="grid-ruler" aria-hidden="true">
              <span class="grid-corner">{dayLabel(day, t)}</span>
              <div class="grid-ruler-track">
                {hours.map((ts) => (
                  <span key={ts} class={`tick${(ts - start) % 3600 === 0 ? ' tick-hour' : ''}`} style={{ left: `${((ts - start) / 60) * ppm}px` }}>
                    {formatTime(ts * 1000, settings.value.h12)}
                  </span>
                ))}
                {showNow ? <span class="now-pin" style={{ left: `${((nowSec - start) / 60) * ppm}px` }} /> : null}
              </div>
            </div>
            <div class="grid-body">
              {showNow ? <span class="now-line" aria-hidden="true" style={{ left: `calc(var(--ch-w) + ${((nowSec - start) / 60) * ppm}px)` }} /> : null}
              {channels.map((ch, i) => (
                <Row
                  key={ch.id}
                  ch={ch}
                  progs={file?.p[ch.id] ?? []}
                  start={start}
                  end={end}
                  ppm={ppm}
                  genre={genre}
                  rowIndex={i}
                  nowSec={nowSec}
                  win={win}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
