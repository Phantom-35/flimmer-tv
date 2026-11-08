import type { Channel, Programme } from '../../shared/types';
import { toggleWatch } from '../lib/actions';
import { openDetail } from '../router';
import { watchIds } from '../store/watchlist';
import { ChannelBadge, Flags, GenreTag, ProgressBar, Time, TimeRange, minutesLeft } from './bits';
import { Icon } from './Icon';

/** Karte "Sender: läuft gerade / als Nächstes" (Jetzt- und 20:15-Ansicht). */
export function NowCard({
  channel,
  current,
  next,
  nowMs,
  mode,
}: {
  channel: Channel;
  current?: Programme | undefined;
  next?: Programme | undefined;
  nowMs: number;
  mode: 'now' | 'at';
}) {
  const main = current ?? next;
  const watched = main ? watchIds.value.has(main.i) : false;
  return (
    <article class={`nowcard${current ? '' : ' nowcard-off'}`} aria-label={channel.name}>
      <a class="nowcard-channel" href={`#/sender/${channel.id}`} aria-label={`Tagesprogramm ${channel.name}`}>
        <ChannelBadge channel={channel} />
      </a>
      {main ? (
        <>
          <button type="button" class="nowcard-main" onClick={() => openDetail(main.i)}>
            <span class="nowcard-meta meta">
              <span class="nowcard-chname">{channel.name}</span>
              {current ? <TimeRange p={current} /> : <span>ab <Time ms={main.s * 1000} /></span>}
              <GenreTag g={main.g} raw={main.gr} />
              <Flags p={main} />
            </span>
            <span class="nowcard-title">{main.t}</span>
            {main.st || main.ep ? <span class="nowcard-sub">{[main.ep, main.st].filter(Boolean).join(' · ')}</span> : null}
            {current && mode === 'now' ? (
              <span class="nowcard-progress">
                <ProgressBar p={current} nowMs={nowMs} label={`${main.t}: ${minutesLeft(current, nowMs)}`} />
                <span class="nowcard-left">{minutesLeft(current, nowMs)}</span>
              </span>
            ) : null}
          </button>
          <button
            type="button"
            class={`icon-btn nowcard-save${watched ? ' on' : ''}`}
            aria-pressed={watched}
            aria-label={watched ? `${main.t} von der Merkliste entfernen` : `${main.t} merken`}
            onClick={() => toggleWatch(main, channel.id)}
          >
            <Icon name={watched ? 'bookmarkFilled' : 'bookmark'} size={20} />
          </button>
          {current && next ? (
            <button type="button" class="nowcard-next" onClick={() => openDetail(next.i)}>
              <span class="nowcard-next-label">Danach</span>
              <Time ms={next.s * 1000} />
              <span class="nowcard-next-title">{next.t}</span>
            </button>
          ) : null}
        </>
      ) : (
        <p class="nowcard-empty">Keine Programmdaten</p>
      )}
    </article>
  );
}

/** Kompakte Listenzeile (Sendertag, Suche, Merkliste). */
export function ProgrammeLine({
  p,
  channel,
  nowMs,
  showChannel = false,
  showDay,
}: {
  p: Programme;
  channel?: Channel | undefined;
  nowMs: number;
  showChannel?: boolean;
  showDay?: string | undefined;
}) {
  const running = p.s * 1000 <= nowMs && p.e * 1000 > nowMs;
  const past = p.e * 1000 <= nowMs;
  const watched = watchIds.value.has(p.i);
  return (
    <li class={`line${running ? ' line-running' : ''}${past ? ' line-past' : ''}${p.tip ? ' line-tip' : ''}`} data-id={p.i}>
      <button type="button" class="line-main" onClick={() => openDetail(p.i)}>
        <span class="line-time">
          {showDay ? <span class="line-day">{showDay}</span> : null}
          <Time ms={p.s * 1000} />
        </span>
        {showChannel ? <ChannelBadge channel={channel} size="sm" /> : null}
        <span class="line-body">
          <span class="line-title">
            {p.t}
            {running ? <span class="sr-only"> (läuft gerade)</span> : null}
          </span>
          {p.ep || p.st ? <span class="line-sub">{[p.ep, p.st].filter(Boolean).join(' · ')}</span> : null}
          <span class="line-meta meta">
            {showChannel && channel ? <span class="line-ch">{channel.name}</span> : null}
            <GenreTag g={p.g} raw={p.gr} />
            <Flags p={p} />
          </span>
          {p.tip ? <span class="line-tipreason">Tipp: {p.tip}</span> : null}
          {running ? <ProgressBar p={p} nowMs={nowMs} /> : null}
        </span>
      </button>
      <button
        type="button"
        class={`icon-btn line-save${watched ? ' on' : ''}`}
        aria-pressed={watched}
        aria-label={watched ? `${p.t} von der Merkliste entfernen` : `${p.t} merken`}
        onClick={() => toggleWatch(p, channel?.id ?? p.i.replace(/-\d+$/, ''))}
      >
        <Icon name={watched ? 'bookmarkFilled' : 'bookmark'} size={20} />
      </button>
    </li>
  );
}
