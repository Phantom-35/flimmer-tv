import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { dayLabel, formatDuration, formatTime, tvDayOf } from '../../shared/time';
import type { Programme } from '../../shared/types';
import { exportIcs, shareProgramme, toggleReminder, toggleWatch } from '../lib/actions';
import { normalize } from '../lib/search';
import { closeDetail, openDetail, route } from '../router';
import { channelsById, dataVersion, findProgramme, findProgrammeSync, getDetails, loadDetails, loadedDays, now, today } from '../store/data';
import { settings } from '../store/settings';
import { watchlist } from '../store/watchlist';
import { ChannelBadge, Flags, GenreTag, ProgressBar, minutesLeft } from './bits';
import { Icon } from './Icon';
import { Toasts } from './Shell';
import { sheetOpen } from '../store/ui';

function fskLabel(fsk: number): string {
  return fsk === 0 ? 'FSK 0 / ohne Altersbeschränkung' : `ab ${fsk} Jahren`;
}

export function DetailSheet() {
  const id = route.value.query.get('d');
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const nowMs = now.value;
  void dataVersion.value;

  const p: Programme | undefined = id ? findProgrammeSync(id) : undefined;
  const chId = id?.replace(/-\d+$/, '') ?? '';
  const ch = channelsById.value.get(chId);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (id && !dlg.open) {
      dlg.classList.remove('closing');
      dlg.style.transform = '';
      dlg.showModal();
      sheetOpen.value = true;
      dlg.querySelector<HTMLElement>('.sheet-close')?.focus({ preventScroll: true });
      dlg.querySelector('.sheet-inner')?.scrollTo(0, 0);
    } else if (!id && dlg.open) {
      // Schließen animieren, dann wirklich schließen
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        dlg.close();
        sheetOpen.value = false;
        return;
      }
      dlg.classList.add('closing');
      const done = () => {
        dlg.classList.remove('closing');
        dlg.style.transform = '';
        if (!route.value.query.get('d')) {
          dlg.close();
          sheetOpen.value = false;
        }
      };
      setTimeout(done, 220);
    }
  }, [id]);

  // Nach unten wischen schließt die Detailansicht (wie ein iOS-Sheet).
  const drag = useRef<{ y: number; t: number; active: boolean; dy: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    const inner = ref.current?.querySelector('.sheet-inner');
    const t = e.touches[0];
    if (!t || !inner || inner.scrollTop > 0) return;
    drag.current = { y: t.clientY, t: performance.now(), active: false, dy: 0 };
  };
  const onTouchMove = (e: TouchEvent) => {
    const d = drag.current;
    const t = e.touches[0];
    const dlg = ref.current;
    if (!d || !t || !dlg) return;
    d.dy = t.clientY - d.y;
    if (!d.active) {
      if (d.dy < 6) {
        if (d.dy < -6) drag.current = null; // nach oben = scrollen
        return;
      }
      d.active = true;
    }
    e.preventDefault();
    dlg.style.transition = 'none';
    dlg.style.transform = `translateY(${Math.max(0, d.dy)}px)`;
  };
  const onTouchEnd = () => {
    const d = drag.current;
    const dlg = ref.current;
    drag.current = null;
    if (!d?.active || !dlg) return;
    const v = d.dy / Math.max(1, performance.now() - d.t);
    dlg.style.transition = '';
    if (d.dy > 120 || (d.dy > 40 && v > 0.6)) {
      dlg.style.transform = `translateY(${d.dy}px)`;
      closeDetail();
    } else {
      dlg.style.transform = '';
    }
  };

  useEffect(() => {
    if (!id) return;
    setState(findProgrammeSync(id) ? 'ready' : 'loading');
    void findProgramme(id).then((res) => {
      setState(res ? 'ready' : 'missing');
      if (res) void loadDetails(tvDayOf(res.programme.s * 1000));
    });
  }, [id]);

  // Weitere Termine derselben Sendung (in geladenen Tagen).
  const more = useMemo(() => {
    if (!p) return [];
    const key = normalize(p.t);
    const list: { p: Programme; ch: string }[] = [];
    for (const f of loadedDays()) {
      for (const [c, progs] of Object.entries(f.p)) {
        for (const x of progs) {
          if (x.i !== p.i && x.e * 1000 > Date.now() && normalize(x.t) === key && !list.some((l) => l.p.i === x.i)) list.push({ p: x, ch: c });
        }
      }
    }
    return list.sort((a, b) => a.p.s - b.p.s).slice(0, 8);
  }, [p?.i, dataVersion.value]);

  const details = p ? getDetails(p) : undefined;
  const w = p ? watchlist.value.find((x) => x.id === p.i) : undefined;
  const h12 = settings.value.h12;
  const running = p ? p.s * 1000 <= nowMs && p.e * 1000 > nowMs : false;
  const future = p ? p.s * 1000 > nowMs : false;

  return (
    <dialog
      ref={ref}
      class="sheet"
      aria-labelledby="sheet-title"
      onClose={() => (sheetOpen.value = false)}
      onCancel={(e) => {
        e.preventDefault();
        closeDetail();
      }}
      onClick={(e) => {
        if (e.target === ref.current) closeDetail();
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div class="sheet-inner">
        <div class="sheet-handle" aria-hidden="true" />
        <Toasts inDialog />
        <button type="button" class="icon-btn sheet-close" aria-label="Schließen" onClick={() => closeDetail()}>
          <Icon name="close" size={22} />
        </button>
        {!p ? (
          state === 'missing' ? (
            <div class="sheet-body">
              <h2 id="sheet-title">Sendung nicht gefunden</h2>
              <p class="muted">Diese Sendung ist nicht (mehr) im Programm. Möglicherweise liegt sie zu weit in der Vergangenheit.</p>
            </div>
          ) : (
            <div class="sheet-body" aria-busy="true">
              <h2 id="sheet-title" class="sr-only">Lädt</h2>
              <span class="sk sk-line" style={{ width: '70%', height: '1.6rem' }} />
              <span class="sk sk-line" style={{ width: '40%' }} />
              <span class="sk sk-block" style={{ width: '100%', height: '6rem' }} />
            </div>
          )
        ) : (
          <div class="sheet-body">
            <a class="sheet-channel" href={`#/sender/${chId}/${tvDayOf(p.s * 1000)}`} onClick={() => closeDetail()}>
              <ChannelBadge channel={ch} size="sm" />
              <span>{ch?.name}</span>
              <Icon name="chevronRight" size={16} />
            </a>
            <h2 id="sheet-title" class="sheet-title">
              {p.t}
            </h2>
            {p.st || p.ep ? <p class="sheet-sub">{[p.ep, p.st].filter(Boolean).join(' · ')}</p> : null}
            <p class="sheet-when">
              <strong>
                {dayLabel(tvDayOf(p.s * 1000), today.value, true)}, {formatTime(p.s * 1000, h12)}–{formatTime(p.e * 1000, h12)}
              </strong>
              <span> · {formatDuration((p.e - p.s) / 60)}</span>
            </p>
            {running ? (
              <div class="sheet-progress">
                <ProgressBar p={p} nowMs={nowMs} />
                <span>Läuft · {minutesLeft(p, nowMs)}</span>
              </div>
            ) : null}
            <p class="sheet-tags meta">
              <GenreTag g={p.g} raw={p.gr} />
              {p.gr && p.g !== 'sonstiges' ? <span>{p.gr}</span> : null}
              <Flags p={p} />
              {p.fsk !== undefined ? <span title={fskLabel(p.fsk)}>FSK {p.fsk}</span> : null}
              {p.ut ? <abbr title="Untertitel">UT</abbr> : null}
              {p.ad ? <abbr title="Audiodeskription">AD</abbr> : null}
              {p.dgs ? <abbr title="Gebärdensprache">DGS</abbr> : null}
            </p>
            {p.tip ? <p class="sheet-tip">Tipp: {p.tip}</p> : null}

            <div class="sheet-actions">
              <button type="button" class={`action${w ? ' on' : ''}`} aria-pressed={!!w} onClick={() => toggleWatch(p, chId)}>
                <Icon name={w ? 'bookmarkFilled' : 'bookmark'} />
                <span>{w ? 'Gemerkt' : 'Merken'}</span>
              </button>
              {future ? (
                <button type="button" class={`action${w?.remind ? ' on' : ''}`} aria-pressed={!!w?.remind} onClick={() => void toggleReminder(p, chId)}>
                  <Icon name={w?.remind ? 'bell' : 'bellOff'} />
                  <span>{w?.remind ? 'Erinnert' : 'Erinnern'}</span>
                </button>
              ) : null}
              {p.e * 1000 > nowMs ? (
                <button type="button" class="action" onClick={() => exportIcs(p, ch)}>
                  <Icon name="calendar" />
                  <span>Kalender</span>
                </button>
              ) : null}
              <button type="button" class="action" onClick={() => void shareProgramme(p, ch)}>
                <Icon name="share" />
                <span>Teilen</span>
              </button>
            </div>

            {details?.d ? (
              <div class="sheet-desc">
                {details.d.split('\n').filter(Boolean).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            ) : null}

            <dl class="facts">
              {p.y ? (
                <>
                  <dt>Jahr</dt>
                  <dd>{p.y}</dd>
                </>
              ) : null}
              {p.c ? (
                <>
                  <dt>Land</dt>
                  <dd>{p.c}</dd>
                </>
              ) : null}
              {p.imdb ? (
                <>
                  <dt>IMDb</dt>
                  <dd>{p.imdb.toFixed(1).replace('.', ',')} / 10</dd>
                </>
              ) : null}
              {p.fsk !== undefined ? (
                <>
                  <dt>Freigabe</dt>
                  <dd>{fskLabel(p.fsk)}</dd>
                </>
              ) : null}
              {p.r || p.n ? (
                <>
                  <dt>Wiederholung</dt>
                  <dd>{p.r ? 'Ja' : 'Nein, Erstausstrahlung'}</dd>
                </>
              ) : null}
              {details?.dir ? (
                <>
                  <dt>Regie</dt>
                  <dd>{details.dir}</dd>
                </>
              ) : null}
              {details?.cast?.length ? (
                <>
                  <dt>Mit</dt>
                  <dd>{details.cast.join(', ')}</dd>
                </>
              ) : null}
              {p.reg?.length ? (
                <>
                  <dt>Regional</dt>
                  <dd>Parallel in anderen Regionen: {p.reg.join(', ')}</dd>
                </>
              ) : null}
            </dl>

            {more.length ? (
              <section class="sheet-more" aria-labelledby="more-h">
                <h3 id="more-h">Weitere Termine</h3>
                <ul>
                  {more.map((m) => (
                    <li key={m.p.i}>
                      <button type="button" onClick={() => openDetail(m.p.i)}>
                        <span>
                          {dayLabel(tvDayOf(m.p.s * 1000), today.value)}, {formatTime(m.p.s * 1000, h12)}
                        </span>
                        <span class="muted">{channelsById.value.get(m.ch)?.name}</span>
                        {m.p.ep || m.p.st ? <span class="muted small">{[m.p.ep, m.p.st].filter(Boolean).join(' · ')}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </dialog>
  );
}
